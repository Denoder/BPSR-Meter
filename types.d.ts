// Global types
export interface UserData {
    realtime_dps?: number;
    realtime_dps_max?: number;
    total_dps?: number;
    total_damage?: DamageBreakdown;
    total_count?: CountBreakdown;
    realtime_hps?: number;
    realtime_hps_max?: number;
    total_hps?: number;
    total_healing?: DamageBreakdown;
    taken_damage?: number;
    profession?: string;
    name?: string;
    fightPoint?: number;
    fight_point?: number;
    dead_count?: number;
    hp?: number;
    max_hp?: number;
    uid?: string | number;
    rank?: number;
}

export interface DamageBreakdown {
    normal?: number;
    critical?: number;
    lucky?: number;
    crit_lucky?: number;
    hpLessen?: number;
    total?: number;
}

export interface CountBreakdown {
    normal?: number;
    critical?: number;
    lucky?: number;
    crit_lucky?: number;
    total?: number;
}

export interface SkillData {
    totalDamage?: number;
    totalCount?: number;
    critRate?: number;
    luckyRate?: number;
    damageBreakdown?: DamageBreakdown;
    countBreakdown?: CountBreakdown;
    displayName?: string;
    type?: string;
}

export interface PlayerSkillData {
    name?: string;
    profession?: string;
    skills?: { [skillId: string]: SkillData };
}

export interface ManualGroupState {
    enabled: boolean;
    members: Array<{ uid: string; name: string }>;
}

export interface ApiResponse {
    code: number;
    data?: any;
    user?: { [uid: string]: UserData };
    timestamp?: number;
    startTime?: number;
    skills?: { [uid: string]: PlayerSkillData };
    message?: string;
}

export interface Settings {
    language?: string;
    playerRegistry?: { [uid: string]: string };
    manualGroup?: ManualGroupState;
}

export interface ProfessionInfo {
    name: string;
    icon: string;
    role?: string;
    color?: string;
}

export interface UpdateInfo {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl?: string;
    releaseNotes?: string;
    error?: string;
}

export interface ElectronAPI {
    closeWindow: () => void;
    toggleLockState: () => void;
    onLockStateChanged: (callback: (isLocked: boolean) => void) => void;
    setIgnoreMouseEvents: (ignore: boolean, options?: any) => void;
    getWindowPosition: () => Promise<[number, number]>;
    setWindowPosition: (x: number, y: number) => void;
    resizeWindowToContent: (width: number, height: number, scale: number) => void;
    openGroupWindow: () => void;
    openHistoryWindow: () => void;
    onWindowShown?: (callback: () => void) => void;
    checkForUpdates: () => Promise<UpdateInfo>;
    checkForUpdatesWithDialog: () => Promise<UpdateInfo>;
}

// Extend Window interface
declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
