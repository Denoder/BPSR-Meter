import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type WindowType =
    | "main"
    | "group"
    | "history"
    | "device"
    | "settings"
    | "monsters";

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electron", {
    closeWindow: () => ipcRenderer.send("close-window"),
    toggleLockState: () => ipcRenderer.send("toggle-lock-state"),
    onLockStateChanged: (callback: (isLocked: boolean) => void) => {
        const listener = (_event: IpcRendererEvent, isLocked: boolean) =>
            callback(isLocked);
        ipcRenderer.on("lock-state-changed", listener);
        return () => ipcRenderer.removeListener("lock-state-changed", listener);
    },
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
        ipcRenderer.send("set-ignore-mouse-events", ignore, options),
    getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
    setWindowPosition: (windowType: WindowType, x: number, y: number) =>
        ipcRenderer.send("set-window-position", windowType, x, y),
    resizeWindow: (windowType: WindowType, width: number, height: number) =>
        ipcRenderer.send("resize-window", windowType, width, height),
    openGroupWindow: () => ipcRenderer.send("open-group-window"),
    openHistoryWindow: () => ipcRenderer.send("open-history-window"),
    openDeviceWindow: () => ipcRenderer.send("open-device-window"),
    openSettingsWindow: () => ipcRenderer.send("open-settings-window"),
    openMonstersWindow: () => ipcRenderer.send("open-monsters-window"),
    onDataReset: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on("reset-data", listener);
        return () => ipcRenderer.removeListener("reset-data", listener);
    },
    onWindowShown: (callback: () => void) =>
        ipcRenderer.on("window-shown", () => callback()),
    onWindowFocused: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on("window-focused", listener);
        return () => ipcRenderer.removeListener("window-focused", listener);
    },
    onWindowBlurred: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on("window-blurred", listener);
        return () => ipcRenderer.removeListener("window-blurred", listener);
    },
    saveWindowSize: (
        windowType: WindowType,
        width: number,
        height: number,
        scale?: number,
    ) => ipcRenderer.send("save-window-size", windowType, width, height, scale),
    getSavedWindowSize: () => ipcRenderer.invoke("get-saved-window-size"),
    saveWindowPosition: (windowType: WindowType, x: number, y: number) =>
        ipcRenderer.send("save-window-position", windowType, x, y),
    updateVisibleColumns: (cols: Record<string, boolean>) =>
        ipcRenderer.send("update-visible-columns", cols),
    onVisibleColumnsChanged: (
        callback: (cols: Record<string, boolean>) => void,
    ) =>
        ipcRenderer.on(
            "visible-columns-updated",
            (_e: IpcRendererEvent, cols: Record<string, boolean>) =>
                callback(cols),
        ),
    updateGlobalSettings: (settings: Partial<Record<string, any>>) =>
        ipcRenderer.send("update-global-settings", settings),
    onTransparencySettingChanged: (callback: (isDisabled: boolean) => void) => {
        const listener = (_e: IpcRendererEvent, isDisabled: boolean) =>
            callback(isDisabled);
        ipcRenderer.on("transparency-setting-changed", listener);
        return () =>
            ipcRenderer.removeListener(
                "transparency-setting-changed",
                listener,
            );
    },
    onTransparencyAmountChanged: (callback: (amount: number) => void) => {
        const listener = (_e: IpcRendererEvent, amount: number) =>
            callback(amount);
        ipcRenderer.on("transparency-amount-changed", listener);
        return () =>
            ipcRenderer.removeListener("transparency-amount-changed", listener);
    },
    onClickthroughChanged: (callback: (enabled: boolean) => void) => {
        const listener = (_e: IpcRendererEvent, enabled: boolean) =>
            callback(enabled);
        ipcRenderer.on("clickthrough-changed", listener);
        return () =>
            ipcRenderer.removeListener("clickthrough-changed", listener);
    },
    onHeightStepChanged: (callback: (step: number) => void) => {
        const listener = (_e: IpcRendererEvent, step: number) => callback(step);
        ipcRenderer.on("height-step-changed", listener);
        return () =>
            ipcRenderer.removeListener("height-step-changed", listener);
    },
    onManualHeightChanged: (callback: (enabled: boolean) => void) => {
        const listener = (_e: IpcRendererEvent, enabled: boolean) =>
            callback(enabled);
        ipcRenderer.on("manual-height-changed", listener);
        return () =>
            ipcRenderer.removeListener("manual-height-changed", listener);
    },
    deleteHistoryLog: (logId: string) =>
        ipcRenderer.invoke("delete-history-log", logId),
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    checkForUpdatesWithDialog: () =>
        ipcRenderer.invoke("check-for-updates-with-dialog"),
    // Update dialog APIs
    onUpdateInfo: (callback: (updateInfo: any) => void) => {
        const listener = (_event: IpcRendererEvent, updateInfo: any) =>
            callback(updateInfo);
        ipcRenderer.on("update-info", listener);
        return () => ipcRenderer.removeListener("update-info", listener);
    },
    onDownloadProgress: (callback: (percent: number) => void) => {
        const listener = (_event: IpcRendererEvent, percent: number) =>
            callback(percent);
        ipcRenderer.on("download-progress", listener);
        return () => ipcRenderer.removeListener("download-progress", listener);
    },
    onUpdateStatus: (callback: (status: string) => void) => {
        const listener = (_event: IpcRendererEvent, status: string) =>
            callback(status);
        ipcRenderer.on("update-status", listener);
        return () => ipcRenderer.removeListener("update-status", listener);
    },
    onUpdateError: (callback: (error: string) => void) => {
        const listener = (_event: IpcRendererEvent, error: string) =>
            callback(error);
        ipcRenderer.on("update-error", listener);
        return () => ipcRenderer.removeListener("update-error", listener);
    },
    startDownload: () => ipcRenderer.send("start-download"),
});
