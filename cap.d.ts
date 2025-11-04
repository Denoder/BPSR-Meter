/**
 * Type definitions for the 'cap' Node.js module.
 */
declare module 'cap' {
    import { EventEmitter } from 'events';

    export class Cap extends EventEmitter {
        constructor();

        open(device: string, filter: string, bufSize: number, buffer: Buffer): string;
        close(): void;
        setMinBytes?(nBytes: number): void;
        send(buffer: Buffer, nBytes?: number): void;

        on(event: 'packet', listener: (nbytes: number, truncated: boolean) => void): this;

        static findDevice(ip?: string): string | undefined;
        static deviceList(): DeviceInfo[];
    }

    export interface DeviceInfo {
        name: string;
        description?: string;
        addresses: NetworkAddress[];
        flags?: string;
    }

    export interface NetworkAddress {
        addr: string;
        netmask?: string;
        broadaddr?: string;
    }

    export interface EthernetInfo {
        dstmac: string;
        srcmac: string;
        type?: number;
        vlan?: {
            priority: number;
            CFI: boolean;
            VID: number;
        };
        length?: number;
    }

    export interface EthernetResult {
        info: EthernetInfo;
        offset: number;
    }

    export interface IPv4Info {
        hdrlen: number;
        dscp: number;
        ecn: number;
        totallen: number;
        id: number;
        flags: number;
        fragoffset: number;
        ttl: number;
        protocol: number;
        hdrchecksum: number;
        srcaddr: string;
        dstaddr: string;
        options?: any;
    }

    export interface IPv4Result {
        info: IPv4Info;
        hdrlen: number;
        offset: number;
    }

    export interface IPv6Info {
        class: number;
        flowLabel: number;
        payloadlen: number;
        protocol?: number;
        hopLimit: number;
        srcaddr: string;
        dstaddr: string;
        extensions?: any;
    }

    export interface IPv6Result {
        info: IPv6Info;
        payloadlen: number;
        offset: number;
    }

    export interface ICMPv4BaseInfo {
        type: number;
        code: number;
        checksum: number;
    }

    export interface ICMPv4EchoInfo extends ICMPv4BaseInfo {
        identifier?: number;
        seqno?: number;
    }

    export interface ICMPv4TimestampInfo extends ICMPv4EchoInfo {
        originate?: number;
        receive?: number;
        transmit?: number;
    }

    export interface ICMPv4MaskInfo extends ICMPv4EchoInfo {
        mask: string;
    }

    export interface ICMPv4RedirectInfo extends ICMPv4BaseInfo {
        gatewayAddr: string;
        IPHeader: { info: IPv4Info; hdrlen: number };
        dataOffset: number;
    }

    export interface ICMPv4ErrorInfo extends ICMPv4BaseInfo {
        IPHeader: { info: IPv4Info; hdrlen: number };
        dataOffset: number;
        pointer?: number;
        nextHopMTU?: number;
    }

    export interface ICMPv4RouterInfo extends ICMPv4BaseInfo {
        lifetime: number;
        addrs?: Array<{ addr: string; pref: number }>;
    }

    export interface ICMPv4TracerouteInfo extends ICMPv4BaseInfo {
        identifier: number;
        outHopCount: number;
        retHopCount: number;
        outLnkSpeed: number;
        outLnkMTU: number;
    }

    export type ICMPv4Info = 
        | ICMPv4EchoInfo 
        | ICMPv4TimestampInfo 
        | ICMPv4MaskInfo 
        | ICMPv4RedirectInfo 
        | ICMPv4ErrorInfo 
        | ICMPv4RouterInfo 
        | ICMPv4TracerouteInfo 
        | ICMPv4BaseInfo;

    export interface ICMPv4Result {
        info: ICMPv4Info;
        offset: number;
    }

    // Transport Layer Protocols
    export interface TCPInfo {
        srcport: number;
        dstport: number;
        seqno: number;
        ackno?: number;
        flags: number;
        window: number;
        checksum: number;
        urgentptr?: number;
        options?: any;
    }

    export interface TCPResult {
        info: TCPInfo;
        hdrlen: number;
        offset: number;
    }

    export interface UDPInfo {
        srcport: number;
        dstport: number;
        length: number;
        checksum: number;
    }

    export interface UDPResult {
        info: UDPInfo;
        offset: number;
    }

    export interface SCTPChunkInfo {
        type: number;
        flags: number;
        offset: number;
        length: number;
    }

    export interface SCTPInfo {
        srcport: number;
        dstport: number;
        verifyTag?: number;
        checksum: number;
        chunks?: SCTPChunkInfo[];
    }

    export interface SCTPResult {
        info: SCTPInfo;
        offset: number;
    }

    // ARP Protocol
    export interface ARPInfo {
        hardwareaddr: number;
        protocol: number;
        hdrlen: number;
        protlen: number;
        opcode: number;
        sendermac: string;
        senderip: string;
        targetmac: string;
        targetip: string;
    }

    export interface ARPResult {
        info: ARPInfo;
        offset: number;
    }

    export const decoders: {
        PROTOCOL: {
            ETHERNET: {
                [key: string]: number;
                IPV4: number;
                X75: number;
                CHAOSNET: number;
                X25: number;
                ARP: number;
                ARP_RELAY: number;
                TRILL: number;
                L2_IS_IS: number;
                ARP_REVERSE: number;
                APPLETALK: number;
                APPLETALK_AARP: number;
                VLAN: number;
                SNMP: number;
                XTP: number;
                IPV6: number;
                TCPIP_COMPRESS: number;
                PPP: number;
                GSMP: number;
                PPPOE_DISCOVER: number;
                PPPOE_SESSION: number;
                LOOPBACK: number;
            };
            IP: {
                [key: string]: number;
                HOPOPT: number;
                ICMP: number;
                IGMP: number;
                GGP: number;
                IPV4: number;
                ST: number;
                TCP: number;
                CBT: number;
                EGP: number;
                IGP: number;
                BBN_RCC_MON: number;
                NVP_II: number;
                PUP: number;
                ARGUS: number;
                EMCON: number;
                XNET: number;
                CHAOS: number;
                UDP: number;
                MUX: number;
                DCN_MEAS: number;
                HMP: number;
                PRM: number;
                XNS_IDP: number;
                TRUNK_1: number;
                TRUNK_2: number;
                LEAF_1: number;
                LEAF_2: number;
                RDP: number;
                IRTP: number;
                ISO_TP4: number;
                NETBLT: number;
                MFE_NSP: number;
                MERIT_INP: number;
                DCCP: number;
                THC: number;
                IDPR: number;
                XTP: number;
                DDP: number;
                IDPR_CMTP: number;
                TP: number;
                IL: number;
                IPV6: number;
                SDRP: number;
                IPV6_ROUTE: number;
                IPV6_FRAG: number;
                IDRP: number;
                RSVP: number;
                GRE: number;
                DSR: number;
                BNA: number;
                ESP: number;
                AH: number;
                I_NLSP: number;
                SWIPE: number;
                NARP: number;
                MOBILE: number;
                TLSP: number;
                SKIP: number;
                ICMPV6: number;
                IPV6_NONXT: number;
                IPV6_OPTS: number;
                CFTP: number;
                SAT_EXPAK: number;
                KRYPTOLAN: number;
                RVD: number;
                IPPC: number;
                SAT_MON: number;
                VISA: number;
                IPCV: number;
                CPNX: number;
                CPHB: number;
                WSN: number;
                PVP: number;
                BR_SAT_MON: number;
                SUN_ND: number;
                WB_MON: number;
                WB_EXPAK: number;
                ISO_IP: number;
                VMTP: number;
                SECURE_VMTP: number;
                VINES: number;
                TTP: number;
                IPTM: number;
                NSFNET_IGP: number;
                DGP: number;
                TCF: number;
                EIGRP: number;
                OSPFIGP: number;
                SPRITE_RPC: number;
                LARP: number;
                MTP: number;
                AX25: number;
                IPIP: number;
                MICP: number;
                SCC_SP: number;
                ETHERIP: number;
                ENCAP: number;
                GMTP: number;
                IFMP: number;
                PNNI: number;
                PIM: number;
                ARIS: number;
                SCPS: number;
                QNX: number;
                A_N: number;
                IPCOMP: number;
                SNP: number;
                COMPAQ_PEER: number;
                IPX_IN_IP: number;
                VRRP: number;
                PGM: number;
                L2TP: number;
                DDX: number;
                IATP: number;
                STP: number;
                SRP: number;
                UTI: number;
                SMP: number;
                SM: number;
                PTP: number;
                ISIS: number;
                FIRE: number;
                CRTP: number;
                CRUDP: number;
                SSCOPMCE: number;
                IPLT: number;
                SPS: number;
                PIPE: number;
                SCTP: number;
                FC: number;
                RSVP_E2E_IGNORE: number;
                MOBILITY_HEADER: number;
                UDPLITE: number;
                MPLS_IN_IP: number;
                MANET: number;
                HIP: number;
                SHIM6: number;
                WESP: number;
                ROHC: number;
            };
        };

        Ethernet(buf: Buffer, bufOffset?: number): EthernetResult;
        ARP(buf: Buffer, bufOffset?: number): ARPResult;

        IPV4(buf: Buffer, bufOffset?: number): IPv4Result;
        IPV6(buf: Buffer, bufOffset?: number): IPv6Result;
        ICMPV4(buf: Buffer, nbytes: number, bufOffset?: number): ICMPv4Result;

        TCP(buf: Buffer, bufOffset?: number): TCPResult;
        UDP(buf: Buffer, bufOffset?: number): UDPResult;
        SCTP(buf: Buffer, nbytes: number, bufOffset?: number): SCTPResult;
    };
}