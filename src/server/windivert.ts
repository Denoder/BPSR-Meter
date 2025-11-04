import { HeaderReader as DecodersHeaderReader, BYTESWAP16 as DecodersBYTESWAP16 } from './decoders';
import path from 'path';

const RESOURCES_PATH = process.env.NODE_ENV === 'development' ? process.cwd() : process.env.resourcesPath;
const bindingPath = path.join(RESOURCES_PATH, 'build/Release/windivert.node');
const module = { exports: {} };
process.dlopen(module, bindingPath);
const windivert = module.exports;

export interface WinDivertHandle {
    open(): void;
    recv(cb: (packet: Buffer, addr: Buffer) => void): void;
    send(obj: { packet: Buffer; addr: Buffer }): boolean;
    close(): boolean;
    HelperCalcChecksums(packetObj: { packet: Buffer }, flags: number): { UDPChecksum?: number; TCPChecksum?: number; IPChecksum?: number } | null;
    sendEx(obj: { packet: Buffer; addr: Buffer }, flags?: number): { sent: boolean; sendLen: number } | any;
    recvEx(flags?: number): { packet: Buffer; addr: Buffer; recvLen: number } | any;
    shutdown(how: number): boolean;
    setParam(param: number, value: number): boolean;
    getParam(param: number): number;
    HelperParseIPv4Address(s: string): number | null;
    HelperParseIPv6Address(s: string): Buffer | null;
    HelperFormatIPv4Address(addr: number): string | null;
    HelperFormatIPv6Address(buf: Buffer): string | null;
    HelperHashPacket(packet: Buffer, seed?: number): string;
    HelperDecrementTTL(packet: Buffer): boolean;
}

export const FLAGS = Object.freeze({
    DEFAULT: 0x0000,
    SNIFF: 0x0001,
    DROP: 0x0002,
    RECV_ONLY: 0x0004,
    READ_ONLY: 0x0004,
    SEND_ONLY: 0x0008,
    WRITE_ONLY: 0x0008,
    NO_INSTALL: 0x0010,
    FRAGMENTS: 0x0020,
});

export const PROTOCOLS = Object.freeze({
    TCP: 6,
    UDP: 17,
    ICMP: 1,
    ICMPV6: 58,
});

export const LAYERS = Object.freeze({
    NETWORK: 0,
    NETWORK_FORWARD: 1,
    FLOW: 2,
    SOCKET: 3,
    REFLECT: 4,
});

export const SHUTDOWN = Object.freeze({
    RECV: 1,
    SEND: 2,
    BOTH: 3,
});

export const EVENTS = Object.freeze({
    NETWORK_PACKET: 0,
    FLOW_ESTABLISHED: 1,
    FLOW_DELETED: 2,
    SOCKET_BIND: 3,
    SOCKET_CONNECT: 4,
    SOCKET_LISTEN: 5,
    SOCKET_ACCEPT: 6,
    SOCKET_CLOSE: 7,
    REFLECT_OPEN: 8,
    REFLECT_CLOSE: 9,
});

export const HELPER_FLAGS = Object.freeze({
    NO_IP_CHECKSUM: 1,
    NO_ICMP_CHECKSUM: 2,
    NO_ICMPV6_CHECKSUM: 4,
    NO_TCP_CHECKSUM: 8,
    NO_UDP_CHECKSUM: 16,
});

export const PARAM = Object.freeze({
    QUEUE_LENGTH: 0,
    QUEUE_TIME: 1,
    QUEUE_SIZE: 2,
    VERSION_MAJOR: 3,
    VERSION_MINOR: 4,
});

export const PRIORITY = Object.freeze({
    HIGHEST: 30000,
    LOWEST: -30000,
});

export const PARAM_DEFAULTS = Object.freeze({
    QUEUE_LENGTH_DEFAULT: 4096,
    QUEUE_LENGTH_MIN: 32,
    QUEUE_LENGTH_MAX: 16384,
    QUEUE_TIME_DEFAULT: 2000,
    QUEUE_TIME_MIN: 100,
    QUEUE_TIME_MAX: 16000,
    QUEUE_SIZE_DEFAULT: 4194304,
    QUEUE_SIZE_MIN: 65535,
    QUEUE_SIZE_MAX: 33554432,
});

export const MISC = Object.freeze({
    BATCH_MAX: 0xFF,
    MTU_MAX: 40 + 0xFFFF, // 65575
});

export async function checkAdmin(): Promise<void> {
    const mod = await import('is-admin');
    if (!await mod.default()) {
        throw new Error('You must run this application as an administrator.');
    }
}

export async function createWindivert(filter: string, layer?: number, flag?: number): Promise<any> {
    await checkAdmin();
    // @ts-ignore
    return new wd.WinDivert(filter, layer, flag);
}

export function addReceiveListener(handle: WinDivertHandle, callback: (packet: Buffer, addr: any) => Buffer | void) {
    try {
        handle.recv(function (packet: Buffer, addr: Buffer) {
            const newPacket = callback(packet, addr);
            if (Buffer.isBuffer(newPacket)) {
                try {
                    handle.HelperCalcChecksums({ packet: newPacket }, 0);
                    handle.send({ packet: newPacket, addr });
                } catch (error) {
                    console.error('Recv Error:', error);
                }
            } else if (newPacket === undefined) {
                handle.send({ packet, addr });
            }
        });
    } catch (error) {
        console.error(error);
    }
}

export function sendEx(handle: WinDivertHandle, packetBuffer: Buffer, addrBuffer: Buffer, flags = 0) {
    return handle.sendEx({ packet: packetBuffer, addr: addrBuffer }, flags);
}

export function recvEx(handle: WinDivertHandle, flags = 0) {
    return handle.recvEx(flags);
}

export function shutdown(handle: WinDivertHandle, how: number) {
    return handle.shutdown(how);
}

export function setParam(handle: WinDivertHandle, param: number, value: number) {
    return handle.setParam(param, value);
}

export function getParam(handle: WinDivertHandle, param: number) {
    return handle.getParam(param);
}

export function parseIPv4Address(handle: WinDivertHandle, addrStr: string) {
    return handle.HelperParseIPv4Address(addrStr);
}

export function parseIPv6Address(handle: WinDivertHandle, addrStr: string) {
    return handle.HelperParseIPv6Address(addrStr);
}

export function formatIPv4Address(handle: WinDivertHandle, addrNum: number) {
    return handle.HelperFormatIPv4Address(addrNum);
}

export function formatIPv6Address(handle: WinDivertHandle, addrBuffer: Buffer) {
    return handle.HelperFormatIPv6Address(addrBuffer);
}

export function hashPacket(handle: WinDivertHandle, packetBuffer: Buffer, seed = 0) {
    return handle.HelperHashPacket(packetBuffer, seed);
}

export function decrementTTL(handle: WinDivertHandle, packetBuffer: Buffer) {
    return handle.HelperDecrementTTL(packetBuffer);
}

export const HeaderReader = DecodersHeaderReader;
export const BYTESWAP16 = DecodersBYTESWAP16;

export const wd = windivert;

export default {
    FLAGS,
    LAYERS,
    PROTOCOLS,
    createWindivert,
    addReceiveListener,
    HeaderReader,
    BYTESWAP16,
    sendEx,
    recvEx,
    shutdown,
    setParam,
    getParam,
    parseIPv4Address,
    parseIPv6Address,
    formatIPv4Address,
    formatIPv6Address,
    hashPacket,
    decrementTTL,
    wd,
};
