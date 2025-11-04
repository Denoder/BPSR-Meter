import cap from "cap";
import { Readable } from "stream";
import findDefaultNetworkDevice from "../../algo/netInterfaceUtil";
import WindivertAdapter from "./windivert-adapter";
import { Lock } from "./dataManager";
import type { UserDataManager } from "./dataManager";
import type { Logger } from "winston";
import type { GlobalSettings } from "../types";
import type PacketProcessor from "../../algo/packet";

const decoders = cap.decoders;
const PROTOCOL = decoders.PROTOCOL;
const Cap = cap.Cap;

async function checkNpcap(logger: Logger) {
    try {
        const devices = Cap.deviceList();
        if ( !devices || devices.length === 0 || devices.every((d) => d.name.includes("Loopback")) ) {
            throw new Error("Npcap not detected or not functional.");
        }
        logger.info("Npcap detected and functional.");
        return true;
    } catch (e: Error | any) {
        logger.warn("Npcap check failed: " + (e?.message || e));
    }
}

class Sniffer {
    #data: Buffer;
    public logger: Logger;
    public userDataManager: UserDataManager;
    public globalSettings: GlobalSettings;
    public current_server: string;
    public tcp_next_seq: number;
    public tcp_cache: Map<number, Buffer>;
    public tcp_last_time: number;
    public lastUnexpectedSeqLogAt: number;
    public unexpectedSeqCount: number;
    public tcp_lock: Lock;
    public fragmentIpCache: Map<string, any>;
    public FRAGMENT_TIMEOUT: number;
    public eth_queue: Buffer[];
    public capInstance: cap.Cap | WindivertAdapter | null;
    public PacketProcessor: PacketProcessor | null;
    public isPaused: boolean;
    #PacketProcessorInstance?: typeof PacketProcessor;

    public running: boolean;
    #fragmentCleanerInterval: NodeJS.Timeout | null;

    constructor(logger: Logger, userDataManager: UserDataManager, globalSettings: GlobalSettings) {
        this.logger = logger;
        this.userDataManager = userDataManager;
        this.globalSettings = globalSettings;
        this.current_server = "";
        this.#data = Buffer.alloc(0);
        this.tcp_next_seq = -1;
        this.tcp_cache = new Map();
        this.tcp_last_time = 0;
        this.lastUnexpectedSeqLogAt = 0;
        this.unexpectedSeqCount = 0;
        this.tcp_lock = new Lock();
        this.fragmentIpCache = new Map();
        this.FRAGMENT_TIMEOUT = 30000;
        this.eth_queue = [];
        this.capInstance = null;
        this.PacketProcessor = null;
        this.isPaused = false;
        this.running = false;
        this.#fragmentCleanerInterval = null;
    }

    setPacketProcessor(instance: typeof PacketProcessor) {
        this.#PacketProcessorInstance = instance;
    }

    getPacketProcessor() {
        return this.#PacketProcessorInstance;
    }

    setPaused(paused: boolean) {
        // Toggle paused state. When resuming, reset detection buffers and state so
        // server detection can happen immediately instead of waiting several seconds.
        const wasPaused = this.isPaused;
        this.isPaused = !!paused;
        if (wasPaused && !this.isPaused) {
            // clear TCP assembly state and fragment caches to force fresh detection
            try {
                this.clearTcpCache();
                this.fragmentIpCache.clear();
                this.current_server = "";
                this.tcp_cache.clear && this.tcp_cache.clear();
                this.tcp_next_seq = -1;
                this.tcp_last_time = 0;
                // Refresh enemy cache to ensure state is consistent
                try {
                    this.userDataManager &&
                        this.userDataManager.refreshEnemyCache &&
                        this.userDataManager.refreshEnemyCache();
                } catch (e) { }
                this.logger.info(
                    "Sniffer resumed: detection state reset for faster server detection",
                );
            } catch (e) {
                this.logger.warn(
                    "Error while resetting sniffer state on resume:",
                    e,
                );
            }
        }
    }

    getPaused() {
        return this.isPaused;
    }

    clearTcpCache() {
        this.#data = Buffer.alloc(0);
        this.tcp_next_seq = -1;
        this.tcp_last_time = 0;
        this.tcp_cache.clear();
    }

    getTCPPacket(frameBuffer: Buffer, ethOffset: number): Buffer | null {
        const ipPacket = decoders.IPV4(frameBuffer, ethOffset);
        const ipId = ipPacket.info.id;
        const isFragment = (ipPacket.info.flags & 0x1) !== 0;
        const key = `${ipId}-${ipPacket.info.srcaddr}-${ipPacket.info.dstaddr}-${ipPacket.info.protocol}`;
        const now = Date.now();

        if (isFragment || ipPacket.info.fragoffset > 0) {
            if (!this.fragmentIpCache.has(key)) {
                this.fragmentIpCache.set(key, {
                    fragments: [],
                    timestamp: now,
                });
            }

            const cacheEntry = this.fragmentIpCache.get(key);
            const ipBuffer = Buffer.from(frameBuffer.subarray(ethOffset));
            cacheEntry.fragments.push(ipBuffer);
            cacheEntry.timestamp = now;

            if (isFragment) {
                return null;
            }

            const fragments = cacheEntry.fragments;
            if (!fragments) {
                this.logger.error(`Can't find fragments for ${key}`);
                return null;
            }

            let totalLength = 0;
            const fragmentData = [];

            for (const buffer of fragments) {
                const ip = decoders.IPV4(buffer);
                const fragmentOffset = ip.info.fragoffset * 8;
                const payloadLength = ip.info.totallen - ip.hdrlen;
                const payload = Buffer.from(
                    buffer.subarray(ip.offset, ip.offset + payloadLength),
                );

                fragmentData.push({
                    offset: fragmentOffset,
                    payload: payload,
                });

                const endOffset = fragmentOffset + payloadLength;
                if (endOffset > totalLength) {
                    totalLength = endOffset;
                }
            }

            const fullPayload = Buffer.alloc(totalLength);
            for (const fragment of fragmentData) {
                fragment.payload.copy(fullPayload, fragment.offset);
            }

            this.fragmentIpCache.delete(key);
            return fullPayload;
        }

        return Buffer.from(
            frameBuffer.subarray(
                ipPacket.offset,
                ipPacket.offset + (ipPacket.info.totallen - ipPacket.hdrlen),
            ),
        );
    }

    async processEthPacket(frameBuffer: Buffer) {
        if (this.isPaused) return;

        var ethPacket = decoders.Ethernet(frameBuffer);

        if (ethPacket.info.type !== PROTOCOL.ETHERNET.IPV4) return;

        const ipPacket = decoders.IPV4(frameBuffer, ethPacket.offset);
        const srcaddr = ipPacket.info.srcaddr;
        const dstaddr = ipPacket.info.dstaddr;

        const tcpBuffer = this.getTCPPacket(frameBuffer, ethPacket.offset);
        if (tcpBuffer === null) return;
        const tcpPacket = decoders.TCP(tcpBuffer);

        const buf = Buffer.from(tcpBuffer.subarray(tcpPacket.hdrlen));

        const srcport = tcpPacket.info.srcport;
        const dstport = tcpPacket.info.dstport;
        const src_server =
            srcaddr + ":" + srcport + " -> " + dstaddr + ":" + dstport;

        await this.tcp_lock.acquire();
        try {
            if (this.current_server !== src_server) {
                try {
                    if (buf[4] == 0) {
                        const data = buf.subarray(10);
                        if (data.length) {
                            const stream = Readable.from(data, {
                                objectMode: false,
                            });
                            let data1;
                            do {
                                const len_buf = stream.read(4);
                                if (!len_buf) break;
                                data1 = stream.read(len_buf.readUInt32BE() - 4);
                                const signature = Buffer.from([
                                    0x00, 0x63, 0x33, 0x53, 0x42, 0x00,
                                ]);
                                if (
                                    Buffer.compare(
                                        data1.subarray(5, 5 + signature.length),
                                        signature,
                                    )
                                )
                                    break;
                                try {
                                    if (this.current_server !== src_server) {
                                        this.current_server = src_server;
                                        this.clearTcpCache();
                                        this.tcp_next_seq =
                                            tcpPacket.info.seqno + buf.length;
                                        this.userDataManager.refreshEnemyCache();
                                        if (
                                            this.globalSettings
                                                .autoClearOnServerChange &&
                                            this.userDataManager.lastLogTime !==
                                            0 &&
                                            this.userDataManager.users.size !==
                                            0
                                        ) {
                                        const lp = this.globalSettings.lastPausedAt || 0;
                                        const lr = this.globalSettings.lastResumedAt || 0;
                                        const wasPausedThenResumed = lp > 0 && lr > lp;
                                        if (!wasPausedThenResumed) {
                                            this.userDataManager.clearAll(true);
                                            console.log(
                                                "Server changed, statistics cleared!",
                                            );
                                        } else {
                                            console.log(
                                                "Server changed detected but skip clear because pause->resume was observed.",
                                            );
                                        }                                            try {
                                                this.globalSettings.lastPausedAt = null;
                                                this.globalSettings.lastResumedAt = null;
                                            } catch (e) { }
                                        }
                                        console.log(
                                            "Game server detected. Measuring DPS...",
                                        );
                                    }
                                } catch (e) { }
                            } while (data1 && data1.length);
                        }
                    }
                    if (buf.length === 0x62) {
                        const signature = Buffer.from([
                            0x00, 0x00, 0x00, 0x62, 0x00, 0x03, 0x00, 0x00,
                            0x00, 0x01, 0x00, 0x11, 0x45, 0x14, 0x00, 0x00,
                            0x00, 0x00, 0x0a, 0x4e, 0x08, 0x01, 0x22, 0x24,
                        ]);
                        if (
                            Buffer.compare(
                                buf.subarray(0, 10),
                                signature.subarray(0, 10),
                            ) === 0 &&
                            Buffer.compare(
                                buf.subarray(14, 14 + 6),
                                signature.subarray(14, 14 + 6),
                            ) === 0
                        ) {
                            if (this.current_server !== src_server) {
                                this.current_server = src_server;
                                this.clearTcpCache();
                                this.tcp_next_seq =
                                    tcpPacket.info.seqno + buf.length;
                                this.userDataManager.refreshEnemyCache();
                                if (
                                    this.globalSettings
                                        .autoClearOnServerChange &&
                                    this.userDataManager.lastLogTime !== 0 &&
                                    this.userDataManager.users.size !== 0
                                ) {
                                    const lp = this.globalSettings.lastPausedAt || 0;
                                    const lr = this.globalSettings.lastResumedAt || 0;
                                    const wasPausedThenResumed = lp > 0 && lr > lp;
                                    if (!wasPausedThenResumed) {
                                        this.userDataManager.clearAll(true);
                                        console.log(
                                            "Server changed, statistics cleared!",
                                        );
                                    } else {
                                        console.log(
                                            "Server changed detected but skip clear because pause->resume was observed.",
                                        );
                                    }
                                    try {
                                        this.globalSettings.lastPausedAt = null;
                                        this.globalSettings.lastResumedAt = null;
                                    } catch (e) { }
                                }
                                console.log(
                                    "Game server detected by login packet. Measuring DPS...",
                                );
                            }
                        }
                    }
                } catch (e) { }
                return;
            }

            if (this.tcp_next_seq === -1) {
                // Rate-limit this noisy error to once every 5 seconds
                const now = Date.now();
                if (now - this.lastUnexpectedSeqLogAt > 5000) {
                    this.logger.error(
                        "Unexpected TCP capture error! tcp_next_seq is -1",
                    );
                    this.lastUnexpectedSeqLogAt = now;
                    this.unexpectedSeqCount = 0;
                } else {
                    this.unexpectedSeqCount++;
                    if (this.unexpectedSeqCount % 50 === 0) {
                        this.logger.warn(
                            `Repeated tcp_next_seq -1 occurrences: ${this.unexpectedSeqCount}`,
                        );
                    }
                }

                // Try a safe resync strategy:
                // If we have a buffer that looks like a valid framed packet, use the current TCP seqno
                // Otherwise, attempt to set tcp_next_seq to seqno + buf.length as a heuristic.
                try {
                    if (buf.length > 4) {
                        const possibleLen = buf.readUInt32BE();
                        if (possibleLen > 0 && possibleLen < 0x0fffff && buf.length >= possibleLen) {
                            // buffer looks like a full framed packet; assume this sequence is current
                            this.tcp_next_seq = tcpPacket.info.seqno;
                            this.logger.debug(
                                `Resyncing tcp_next_seq -> ${this.tcp_next_seq} (full packet detected, len=${possibleLen})`,
                            );
                        } else {
                            // fallback heuristic: assume next seq is seqno + buffer length
                            this.tcp_next_seq = (tcpPacket.info.seqno + buf.length) >>> 0;
                            this.logger.debug(
                                `Heuristic resync tcp_next_seq -> ${this.tcp_next_seq} (seqno=${tcpPacket.info.seqno}, bufLen=${buf.length})`,
                            );
                        }
                    } else {
                        // not enough data to make a decision; set to seqno
                        this.tcp_next_seq = tcpPacket.info.seqno;
                        this.logger.debug(
                            `Minimal resync tcp_next_seq -> ${this.tcp_next_seq} (low buffer length=${buf.length})`,
                        );
                    }
                } catch (e) {
                    this.logger.warn("Failed to resync tcp_next_seq automatically:", e);
                    // leave tcp_next_seq as -1 if resync failed
                }
            }

            if (
                (this.tcp_next_seq - tcpPacket.info.seqno) << 0 <= 0 ||
                this.tcp_next_seq === -1
            ) {
                this.tcp_cache.set(tcpPacket.info.seqno, buf);
            }
            while (this.tcp_cache.has(this.tcp_next_seq)) {
                const seq = this.tcp_next_seq;
                const cachedTcpData = this.tcp_cache.get(seq);
                this.#data =
                    this.#data.length === 0
                        ? cachedTcpData
                        : Buffer.concat([this.#data, cachedTcpData]);
                this.tcp_next_seq = (seq + cachedTcpData.length) >>> 0;
                this.tcp_cache.delete(seq);
                this.tcp_last_time = Date.now();
            }

            while (this.#data.length > 4) {
                let packetSize = this.#data.readUInt32BE();

                if (this.#data.length < packetSize) break;

                if (this.#data.length >= packetSize) {
                    const packet = this.#data.subarray(0, packetSize);
                    this.#data = this.#data.subarray(packetSize);
                    if (this.PacketProcessor) {
                        this.PacketProcessor.processPacket(packet);
                    }
                } else if (packetSize > 0x0fffff) {
                    this.logger.error(
                        `Invalid Length!! ${this.#data.length},${packetSize},${this.#data.toString("hex")},${this.tcp_next_seq}`,
                    );
                    process.exit(1);
                }
            }
        } finally {
            this.tcp_lock.release();
        }
    }

    async start(deviceNum: number | string, PacketProcessorClass: typeof PacketProcessor) {
        const selectedBackend = (() => {
            if (process.platform !== "win32") return "npcap";
            const cfg = this.globalSettings?.captureBackend || null;
            if (cfg === "npcap" || cfg === "windivert") return cfg;
            return "npcap";
        })();

        // Only explicit choices supported: npcap or windivert. No automatic fallback.
        if (selectedBackend === "npcap") {
            const npcapReady = await checkNpcap(this.logger);
            if (!npcapReady) {
                throw new Error("Npcap not ready; configured to use npcap.");
            }
        }

        // If we should use WinDivert (explicitly), start WinDivert
        const shouldUseWindivert = selectedBackend === "windivert";
        if (shouldUseWindivert) {
            this.logger.info("Using WinDivert backend.");

            this.PacketProcessor = new PacketProcessorClass({
                logger: this.logger,
                userDataManager: this.userDataManager,
            });

            const filter = "ip and tcp";
            const adapter = new WindivertAdapter(filter, (frame: Buffer) => {
                this.eth_queue.push(frame);
            });

            try {
                await adapter.open();
                this.capInstance = adapter;
            } catch (e: any) {
                this.logger.error("Failed to open WinDivert: " + (e?.message || e));
                throw new Error("Failed to start sniffer (WinDivert error)");
            }

            // start the same processing loop as the Cap backend
            this.running = true;
            (async () => {
                while (this.running) {
                    if (this.eth_queue.length) {
                        const pkt = this.eth_queue.shift();
                        this.processEthPacket(pkt);
                    } else {
                        await new Promise((r) => setTimeout(r, 1));
                    }
                }
            })();

            this.#fragmentCleanerInterval = setInterval(async () => {
                const now = Date.now();
                let clearedFragments = 0;
                for (const [key, cacheEntry] of this.fragmentIpCache) {
                    if (now - cacheEntry.timestamp > this.FRAGMENT_TIMEOUT) {
                        this.fragmentIpCache.delete(key);
                        clearedFragments++;
                    }
                }

                if (clearedFragments > 0) {
                    this.logger.debug(
                        `Cleared ${clearedFragments} expired IP fragment caches`,
                    );
                }

                if (
                    this.tcp_last_time &&
                    Date.now() - this.tcp_last_time > this.FRAGMENT_TIMEOUT
                ) {
                    this.logger.warn(
                        "Cannot capture the next packet! Is the game closed or disconnected? seq: " +
                        this.tcp_next_seq,
                    );
                    this.current_server = "";
                    this.clearTcpCache();
                }
            }, 1000);

            return;
        }

        const devices = Cap.deviceList();

        let num = deviceNum;
        if (num === undefined || num === "auto") {
            let deviceFound = false;
            while (!deviceFound) {
                const device_num = await findDefaultNetworkDevice(devices);
                if (device_num !== undefined) {
                    num = device_num;
                    deviceFound = true;
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
        }

        if (num === undefined || !devices[num as number]) {
            this.logger.error(
                "Could not automatically detect a valid network interface.",
            );
            this.logger.error("Make sure the game is running and try again.");
            throw new Error("No valid network interface detected.");
        }

        this.PacketProcessor = new PacketProcessorClass({
            logger: this.logger,
            userDataManager: this.userDataManager,
        });

        const device = devices[num as number].name;
        const filter = "ip and tcp";
        const bufSize = 10 * 1024 * 1024;
        const buffer = Buffer.alloc(65535);
        this.capInstance = new Cap();
        const linkType = this.capInstance.open(device, filter, bufSize, buffer);
        if (linkType !== "ETHERNET") {
            this.logger.error(
                "The device seems to be WRONG! Please check the device! Device type: " +
                linkType,
            );
        }

        this.capInstance.setMinBytes(0);
        this.capInstance.on("packet", async (nbytes, trunc) => {
            this.eth_queue.push(Buffer.from(buffer.subarray(0, nbytes)));
        });

        this.running = true;

        (async () => {
            while (this.running) {
                if (this.eth_queue.length) {
                    const pkt = this.eth_queue.shift();
                    this.processEthPacket(pkt);
                } else {
                    await new Promise((r) => setTimeout(r, 1));
                }
            }
        })();

        this.#fragmentCleanerInterval = setInterval(async () => {
            const now = Date.now();
            let clearedFragments = 0;
            for (const [key, cacheEntry] of this.fragmentIpCache) {
                if (now - cacheEntry.timestamp > this.FRAGMENT_TIMEOUT) {
                    this.fragmentIpCache.delete(key);
                    clearedFragments++;
                }
            }

            if (clearedFragments > 0) {
                this.logger.debug(
                    `Cleared ${clearedFragments} expired IP fragment caches`,
                );
            }

            if (
                this.tcp_last_time &&
                Date.now() - this.tcp_last_time > this.FRAGMENT_TIMEOUT
            ) {
                this.logger.warn(
                    "Cannot capture the next packet! Is the game closed or disconnected? seq: " +
                    this.tcp_next_seq,
                );
                this.current_server = "";
                this.clearTcpCache();
            }
        }, 1000);
    }

    async stop(): Promise<void> {
        try {
            this.running = false;

            // Close cap instance if open
            if (this.capInstance) {
                try {
                    this.capInstance.close();
                } catch (e) {
                    this.logger.warn("Error while closing cap instance:", e);
                }
                this.capInstance = null;
            }

            // Clear the processing queue and packet processor
            try {
                this.eth_queue = [];
                this.fragmentIpCache.clear();
                this.clearTcpCache();
                this.PacketProcessor = null;
            } catch (e) {
                this.logger.warn("Error while clearing sniffer internal state:", e);
            }

            if (this.#fragmentCleanerInterval) {
                clearInterval(this.#fragmentCleanerInterval);
                this.#fragmentCleanerInterval = null;
            }

            this.logger.info("Sniffer stopped successfully.");
        } catch (err) {
            this.logger.error("Error stopping sniffer:", err as any);
            throw err;
        }
    }
}

export default Sniffer;
