import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    closeWindow: () => ipcRenderer.send("close-window"),
    toggleLockState: () => ipcRenderer.send("toggle-lock-state"),
    onLockStateChanged: (callback: (isLocked: boolean) => void) =>
        ipcRenderer.on(
            "lock-state-changed",
            (_event: IpcRendererEvent, isLocked: boolean) => callback(isLocked),
        ),
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => ipcRenderer.send("set-ignore-mouse-events", ignore, options),
    getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
    setWindowPosition: (x: number, y: number) => ipcRenderer.send("set-window-position", x, y),
    resizeWindowToContent: (
        windowType: string,
        width: number,
        height: number,
        scale: number,
    ) => ipcRenderer.send("resize-window-to-content", windowType, width, height, scale),
    openGroupWindow: () => ipcRenderer.send("open-group-window"),
    openHistoryWindow: () => ipcRenderer.send("open-history-window"),
    openDeviceWindow: () => ipcRenderer.send("open-device-window"),
    openSettingsWindow: () => ipcRenderer.send("open-settings-window"),
    openMonstersWindow: () => ipcRenderer.send("open-monsters-window"),
    increaseWindowHeight: (windowType: string, step?: number) => ipcRenderer.send("increase-window-height", windowType, step),
    decreaseWindowHeight: (windowType: string, step?: number) => ipcRenderer.send("decrease-window-height", windowType, step),
    onWindowShown: (callback: () => void) => ipcRenderer.on("window-shown", () => callback()),
    saveWindowSize: (
        windowType: string,
        width: number,
        height: number,
        scale?: number,
    ) => ipcRenderer.send("save-window-size", windowType, width, height, scale),
    getSavedWindowSizes: () => ipcRenderer.invoke("get-saved-window-sizes"),
    updateVisibleColumns: (cols: Record<string, boolean>) => ipcRenderer.send("update-visible-columns", cols),
    onVisibleColumnsChanged: (callback: (cols: Record<string, boolean>) => void) => ipcRenderer.on("visible-columns-updated", (_e: IpcRendererEvent, cols: Record<string, boolean>) => callback(cols)),
    updateGlobalSettings: (settings: Partial<Record<string, any>>) => ipcRenderer.send("update-global-settings", settings),
    onTransparencySettingChanged: (callback: (isDisabled: boolean) => void) => {
        const listener = (_e: IpcRendererEvent, isDisabled: boolean) => callback(isDisabled);
        ipcRenderer.on("transparency-setting-changed", listener);
        return () => ipcRenderer.removeListener("transparency-setting-changed", listener);
    },
    onHeightStepChanged: (callback: (step: number) => void) => {
        const listener = (_e: IpcRendererEvent, step: number) => callback(step);
        ipcRenderer.on("height-step-changed", listener);
        return () => ipcRenderer.removeListener("height-step-changed", listener);
    },
    deleteHistoryLog: (logId: string) => ipcRenderer.invoke("delete-history-log", logId),
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    checkForUpdatesWithDialog: () => ipcRenderer.invoke("check-for-updates-with-dialog"),
});

window.addEventListener("DOMContentLoaded", () => {
    const replaceText = (selector: string, text: string) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const type of ["chrome", "node", "electron"] as const) {
        replaceText(`${type}-version`, process.versions[type] || "unknown");
    }
});
