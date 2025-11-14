import { globalShortcut, ipcMain } from "electron";
import { DEFAULT_KEYBINDS } from "../constants";
import { WindowManager } from "./window-manager";
import { WindowType } from "../constants";
import { Logger } from "../logger";

export class KeybindManager {
    #isLocked: boolean = false;
    #WindowManager: WindowManager;
    #logger: Logger;

    constructor(windowManager: WindowManager, logger: Logger) {
        this.#WindowManager = windowManager;
        this.#logger = logger;
    }

    registerKeybinds(settings: any): void {
        const keybinds = {
            lock: settings.lockKeybind || DEFAULT_KEYBINDS.lock,
            monsters: settings.monstersKeybind || DEFAULT_KEYBINDS.monsters,
            group: settings.groupKeybind || DEFAULT_KEYBINDS.group,
            settings: settings.settingsKeybind || DEFAULT_KEYBINDS.settings,
            device: settings.deviceKeybind || DEFAULT_KEYBINDS.device,
            history: settings.historyKeybind || DEFAULT_KEYBINDS.history,
            dataReset: settings.dataResetKeybind || DEFAULT_KEYBINDS.dataReset,
            minimize: settings.minimizeKeybind || DEFAULT_KEYBINDS.minimize,
        };

        globalShortcut.unregisterAll();

        Object.entries(keybinds).forEach(([action, keybind]) => {
            const ret = globalShortcut.register(keybind, () =>
                this.handleKeybind(action),
            );
            if (!ret) {
                this.#logger.log(
                    `Failed to register ${action} keybind: ${keybind}`,
                );
            } else {
                this.#logger.log(`Registered ${action} keybind: ${keybind}`);
            }
        });
    }

    handleKeybind(action: string): void {
        const toggleActions = [
            "monsters",
            "group",
            "settings",
            "device",
            "history",
        ];

        switch (action) {
            case "lock":
                this.toggleLockState();
                break;
            case "dataReset":
                this.handleDataReset();
                break;
            case "minimize":
                this.handleMinimizeWindow();
                break;
            default:
                if (toggleActions.includes(action)) {
                    this.#WindowManager.toggleWindow(action as WindowType);
                }
                break;
        }
    }

    handleDataReset(): void {
        const mainWindow = this.#WindowManager.getWindow("main");
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("reset-data");
        }
    }

    toggleLockState(): void {
        this.#isLocked = !this.#isLocked;
        this.#WindowManager.setWindowMovable(!this.#isLocked);
        this.#WindowManager.broadcastToWindows(
            "lock-state-changed",
            this.#isLocked,
        );
        this.#logger.log(`Lock state changed to: ${this.#isLocked}`);
    }

    handleMinimizeWindow(): void {
        const mainWindow = this.#WindowManager.getWindow("main");
        if (mainWindow && !mainWindow.isDestroyed()) {
            this.#WindowManager.toggleMinimizeWindow("main" as WindowType);
        }
    }

    registerIpcHandlers(): void {
        ipcMain.on("toggle-lock-state", () => this.toggleLockState());
    }

    unregisterAll(): void {
        globalShortcut.unregisterAll();
    }
}
