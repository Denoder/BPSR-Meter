export function safeElectron<T = any>(
    method: string,
    ...args: any[]
): T | undefined {
    try {
        const fn = window.electron?.[method];
        if (typeof fn === "function") {
            return fn(...args);
        }
        console.warn(`Electron API method '${method}' is not available`);
        return undefined;
    } catch (error) {
        console.error(`Error calling electron.${method}:`, error);
        return undefined;
    }
}

export interface UpdateInfo {
    version: string;
    releaseNotes: string;
    downloadUrl: string;
    canReinstall: boolean;
    currentVersion: string;
    latestVersion: string;
    available: boolean;
}

export type WindowType =
    | "main"
    | "group"
    | "history"
    | "device"
    | "settings"
    | "monsters"
    | "update";
export type WindowSize = { width: number; height: number; scale?: number };
export type WindowPosition = { x: number; y: number };

export const electron = {
    // General
    onDataReset: (callback: () => void) =>
        safeElectron("onDataReset", callback),
    // Window controls
    closeWindow: () => safeElectron("closeWindow"),
    toggleLockState: () => safeElectron("toggleLockState"),
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
        safeElectron("setIgnoreMouseEvents", ignore, options),
    getWindowPosition: async (): Promise<WindowPosition> =>
        (await safeElectron("getWindowPosition")) || { x: 0, y: 0 },
    setWindowPosition: (windowType: WindowType, x: number, y: number) =>
        safeElectron("setWindowPosition", windowType, x, y),
    saveWindowSize: (
        windowType: WindowType,
        width?: number,
        height?: number,
        scale?: number,
    ) => safeElectron("saveWindowSize", windowType, width, height, scale),
    getSavedWindowSize: async (
        windowType?: WindowType,
    ): Promise<WindowSize | null> => {
        const all = (await safeElectron("getSavedWindowSize")) as
            | Record<WindowType, WindowSize>
            | undefined;
        if (!all) return null;
        if (windowType) return all[windowType] || null;
        return all as unknown as WindowSize | null;
    },

    // Window position
    saveWindowPosition: (windowType: WindowType, x: number, y: number) =>
        safeElectron("saveWindowPosition", windowType, x, y),

    // Window resize
    resizeWindow: (windowType: WindowType, width: number, height: number) =>
        safeElectron("resizeWindow", windowType, width, height),

    // Window openers
    openHistoryWindow: () => safeElectron("openHistoryWindow"),
    openGroupWindow: () => safeElectron("openGroupWindow"),
    openMonstersWindow: () => safeElectron("openMonstersWindow"),
    openSettingsWindow: () => safeElectron("openSettingsWindow"),
    openDeviceWindow: () => safeElectron("openDeviceWindow"),

    // Settings updates
    updateVisibleColumns: (columns: Record<string, boolean>) =>
        safeElectron("updateVisibleColumns", columns),
    updateGlobalSettings: (settings: Record<string, any>) =>
        safeElectron("updateGlobalSettings", settings),

    // Event listeners
    onVisibleColumnsChanged: (
        callback: (columns: Record<string, boolean>) => void,
    ) => safeElectron("onVisibleColumnsChanged", callback),
    onTransparencySettingChanged: (callback: (isDisabled: boolean) => void) =>
        safeElectron("onTransparencySettingChanged", callback),
    onTransparencyAmountChanged: (callback: (amount: number) => void) =>
        safeElectron("onTransparencyAmountChanged", callback),
    onLockStateChanged: (callback: (locked: boolean) => void) =>
        safeElectron("onLockStateChanged", callback),
    onClickthroughChanged: (callback: (enabled: boolean) => void) =>
        safeElectron("onClickthroughChanged", callback),

    // Updates
    checkForUpdatesWithDialog: async (): Promise<{
        available: boolean;
        currentVersion?: string;
        error?: string;
    }> =>
        (await safeElectron("checkForUpdatesWithDialog")) || {
            available: false,
            error: "API not available",
        },
    installUpdateAndRestart: () => safeElectron("installUpdateAndRestart"),
    onUpdateInfo: (callback: (info: UpdateInfo) => void) =>
        safeElectron("onUpdateInfo", callback),
    onDownloadProgress: (callback: (percent: number) => void) =>
        safeElectron("onDownloadProgress", callback),
    onUpdateStatus: (callback: (status: string) => void) =>
        safeElectron("onUpdateStatus", callback),
    onUpdateError: (callback: (error: string) => void) =>
        safeElectron("onUpdateError", callback),
    startDownload: () => safeElectron("startDownload"),

    // History
    deleteHistoryLog: async (
        timestamp: string,
    ): Promise<{ success: boolean; error?: string }> =>
        (await safeElectron("deleteHistoryLog", timestamp)) || {
            success: false,
            error: "API not available",
        },

    // Damage logs
    saveDamageLog: async (data: any): Promise<{ success: boolean }> =>
        (await safeElectron("saveDamageLog", data)) || { success: false },
    getDamageLogs: async (): Promise<any[]> =>
        (await safeElectron("getDamageLogs")) || [],
    deleteDamageLog: async (filename: string): Promise<{ success: boolean }> =>
        (await safeElectron("deleteDamageLog", filename)) || { success: false },
};

export function isElectron(): boolean {
    return typeof window !== "undefined" && !!window.electron;
}
