// Type definitions for Electron API exposed via preload

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
    setIgnoreMouseEvents: (
        ignore: boolean,
        options?: { forward: boolean },
    ) => void;
    getWindowPosition: () => Promise<{ x: number; y: number }>;
    setWindowPosition: (x: number, y: number) => void;
    resizeWindowToContent: (
        windowType: "main" | "group" | "history" | "device" | "settings" | "monsters",
        width: number,
        height: number,
        scale: number,
    ) => void;
    openGroupWindow: () => void;
    openMonstersWindow: () => void;
    openHistoryWindow: () => void;
    openDeviceWindow: () => void;
    openSettingsWindow: () => void;
    increaseWindowHeight: (windowType: "main" | "group" | "history" | "device" | "settings" | "monsters", step?: number) => void;
    decreaseWindowHeight: (windowType: "main" | "group" | "history" | "device" | "settings" | "monsters", step?: number) => void;
    onWindowShown: (callback: () => void) => void;
    saveWindowSize: (
        windowType: "main" | "group" | "history" | "device" | "settings" | "monsters",
        width: number,
        height: number,
        scale?: number,
    ) => void;
    getSavedWindowSizes: () => Promise<{
        main?: { width: number; height: number; scale?: number };
        group?: { width: number; height: number; scale?: number };
        history?: { width: number; height: number; scale?: number };
        device?: { width: number; height: number; scale?: number };
        settings?: { width: number; height: number; scale?: number };
        monsters?: { width: number; height: number; scale?: number };
    }>;
    updateVisibleColumns?: (cols: Record<string, boolean>) => void;
    onVisibleColumnsChanged?: (callback: (cols: Record<string, boolean>) => void) => void;
    updateGlobalSettings?: (settings: Partial<Record<string, any>>) => void;
    onTransparencySettingChanged?: (callback: (isDisabled: boolean) => void) => () => void;
    onHeightStepChanged?: (callback: (step: number) => void) => () => void;
    onManualHeightChanged?: (callback: (enabled: boolean) => void) => () => void;
    deleteHistoryLog?: (logId: string) => Promise<{ success: boolean; error?: string }>;
    checkForUpdates?: () => Promise<UpdateInfo>;
    checkForUpdatesWithDialog?: () => Promise<UpdateInfo>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
