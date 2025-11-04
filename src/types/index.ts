// Core Types for BPSR-Meter

export interface DamageStats {
    normal: number;
    critical: number;
    lucky: number;
    crit_lucky: number;
    hpLessen: number;
    total: number;
    totalHit: number;
    max: number;
    maxCritical: number;
    max_skill_id?: number;
    max_critical_skill_id?: number;
    maxSkillName?: string;
    maxCriticalSkillName?: string;
}

export interface SkillData {
    id: number;
    name: string;
    stats: DamageStats;
}

export interface UserData {
    uid: string;
    name: string;
    profession: number;
    level: number;
    stats: DamageStats;
    skills: { [skillId: string]: SkillData };
    dps: number;
    percentage: number;
    lastUpdate: number;
}

export interface EnemyData {
    id: string;
    name: string;
    stats: DamageStats;
    dps: number;
    lastUpdate: number;
}

export type PlayerRegistry = { [uid: string]: PlayerRegistryEntry };

export interface PlayerRegistryEntry {
    name: string;
    profession?: number;
    level?: number;
}

export interface Settings {
    selectedPlayers?: string[];
    filterMode?: "all" | "group";
    isPaused?: boolean;
}

export interface ManualGroupMember {
    uid: string;
    name: string;
}

export interface ManualGroup {
    enabled: boolean;
    members: ManualGroupMember[];
}

export interface GlobalSettings {
    selectedPlayers: string[];
    filterMode: "all" | "group";
    isPaused: boolean;
    enableFightLog?: boolean;
    enableHistorySave?: boolean;
    saveOnLineSwitch?: boolean;
    autoClearOnTimeout?: boolean;
    autoClearTimeoutSeconds?: number;
    autoClearOnServerChange?: boolean;
    onlyRecordEliteDummy?: boolean;
    language?: string;
    availableLanguages?: string[];
    manualGroup?: ManualGroup;
    windowSizes?: {
        main?: { width: number; height: number; scale?: number };
        group?: { width: number; height: number };
        history?: { width: number; height: number };
    };
    selectedDevice?: number | string | null;
    captureBackend?: "npcap" | "windivert";
    lastPausedAt?: number | null;
    lastResumedAt?: number | null;
    enableBPTimerSubmission?: boolean;
    performanceMode?: boolean;
    updateIntervalMs?: number;
    disableTransparency?: boolean;
}

export interface ApiResponse<T = any> {
    code: number;
    data?: T;
    msg?: string;
    user?: any;
    enemy?: any;
    timestamp?: number;
    startTime?: number;
    paused?: boolean;
}

export interface TranslationData {
    skills?: { [skillId: string]: string };
    professions?: { [professionId: string]: string };
    ui?: { [key: string]: string };
}

export interface PacketData {
    opcode: number;
    data: Buffer;
    size: number;
}

export interface DamageData {
    targetId: string;
    targetName?: string;
    skillId: number;
    skillName?: string;
    damage: number;
    isCritical: boolean;
    isLucky: boolean;
    attackerId: string;
    attackerName?: string;
    timestamp: number;
}

export interface NetworkDevice {
    name: string;
    description: string;
    addresses: Array<{
        addr: string;
        netmask?: string;
        broadcast?: string;
    }>;
}

export interface Logger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}

export interface SocketEvents {
    "settings-updated": (settings: Settings) => void;
    "data-update": (data: any) => void;
    "player-registry-update": (registry: {
        [uid: string]: PlayerRegistryEntry;
    }) => void;
}

export interface Proto {
    [key: number]: any;
    _raw?: Buffer;
    toString?(): string;
    toHex?(): string;
    toBase64?(): string;
    toBuffer?(): Buffer;
}

export interface SkillConfig {
    [skillId: string]:
        | string
        | {
              name: string;
              profession?: string;
              type?: string;
          };
}

export interface MonsterNames {
    [monsterId: string]: string;
}

export function isValidUid(uid: any): uid is string {
    return typeof uid === "string" && uid.length > 0;
}

export function isValidDamage(damage: any): damage is number {
    return typeof damage === "number" && damage >= 0;
}
