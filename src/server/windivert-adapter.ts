import { type WinDivertHandle, createWindivert, addReceiveListener, LAYERS, FLAGS } from './windivert';

export default class WindivertAdapter {
    handle: WinDivertHandle | null;
    filter: string;
    queuePusher: (buf: Buffer) => void;
    running: boolean;

    constructor(filter: string, queuePusher: (buf: Buffer) => void) {
        this.handle = null;
        this.filter = filter || "ip and tcp";
        this.queuePusher = queuePusher;
        this.running = false;
    }

    async open() {
        this.handle = await createWindivert(
            this.filter,
            LAYERS.NETWORK,
            FLAGS.DEFAULT
        );

        this.handle.open();
        this.running = true;

        addReceiveListener(this.handle, (packet: Buffer, addr: Buffer) => {
            try {
                // packet is raw IP (IPv4) buffer. Prepend synthetic Ethernet header:
                const ethHdr = Buffer.alloc(14);
                // EtherType = 0x0800 (IPv4)
                ethHdr.writeUInt16BE(0x0800, 12);
                const frame = Buffer.concat([ethHdr, packet]);
                this.queuePusher(frame);
            } catch (err) {
                // swallow packet errors to avoid crashing the sniffer loop
                console.error("Error processing Windivert packet:", err);
            }

            // return undefined so the packet is allowed to continue through stack
            return undefined;
        });
    }

    close() {
        try {
            if (this.handle) {
                this.handle.close();
                this.handle = null;
            }
        } finally {
            this.running = false;
        }
    }
}