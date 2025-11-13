import {
    app,
    BrowserWindow,
    ipcMain,
    IpcMainEvent,
    IpcMainInvokeEvent,
    screen,
} from "electron";
import {
    checkForUpdates,
    checkForUpdatesSilent,
    checkForUpdatesManual,
} from "./update-check";
import { electronApp, is } from "@electron-toolkit/utils";
import fs from "fs";
import path from "path";
import {
    CONSTANTS,
    WindowType,
    WindowSize,
    keybindSettings,
} from "./constants";
import type { GlobalSettings } from "../types";
import { SettingsManager } from "./managers/settings-manager";
import { Logger } from "./logger";
import { WindowManager } from "./managers/window-manager";
import { KeybindManager } from "./managers/keybind-manager";
import { ServerManager } from "./managers/server-manager";

/**
 * Application Core
 */
class Application {
    #settingsManager: SettingsManager;
    #logger: Logger;
    #windowManager: WindowManager;
    #keybindManager: KeybindManager;
    #serverManager: ServerManager;
    #serverPort: number = CONSTANTS.PORTS.START;
    #userDataPath: string;

    constructor() {
        this.#userDataPath = is.dev ? process.cwd() : app.getPath("userData");
        const settingsPath = path.join(this.#userDataPath, "settings.json");
        const logPath = path.join(this.#userDataPath, "information_log.txt");

        this.#settingsManager = new SettingsManager(settingsPath);
        this.#logger = new Logger(logPath, this.#userDataPath);
        this.#serverManager = new ServerManager(this.#logger);
        this.#windowManager = new WindowManager(
            this.#settingsManager,
            this.#logger,
            this.#serverPort,
        );
        this.#keybindManager = new KeybindManager(
            this.#windowManager,
            this.#logger,
        );
    }

    async initialize(): Promise<void> {
        this.#logger.log("=== STARTING APPLICATION ===");

        await this.#serverManager.killProcessUsingPort(CONSTANTS.PORTS.START);
        this.#serverPort = await this.#serverManager.findAvailablePort();

        await this.#startServer();
        await this.#setupKeybinds();
        await this.#createMainWindow();
        await this.#setupIpcHandlers();
        this.#keybindManager.registerIpcHandlers();
        this.#scheduleUpdateCheck();
    }

    async #createMainWindow(): Promise<void> {
        await this.#windowManager.createOrFocusWindow("main");

        const mainWindow = this.#windowManager.getWindow("main");
        if (mainWindow) {
            mainWindow.webContents.on("did-finish-load", () => {
                mainWindow.webContents.send("lock-state-changed", false);
            });

            mainWindow.on("closed", () => {
                this.#windowManager.closeAllWindows();
                this.#serverManager.stopServer();
            });
        }
    }

    async #startServer(): Promise<void> {
        try {
            await this.#serverManager.startServer(
                this.#serverPort,
                this.#userDataPath,
            );
        } catch (error) {
            this.#logger.error("Server startup failed", error);
            const mainWindow = this.#windowManager.getWindow("main");
            if (mainWindow) {
                mainWindow.loadURL(
                    `data:text/html,<h2 style="color:red">Error: ${error}</h2>`,
                );
            }
        }
    }

    async #setupKeybinds(): Promise<void> {
        try {
            const settings = await this.#settingsManager.getSettings();
            this.#keybindManager.registerKeybinds(settings);
        } catch (error) {
            this.#logger.error("Error setting up keybinds", error);
        }
    }

    #scheduleUpdateCheck(): void {
        setTimeout(() => {
            const currentVersion = app.getVersion();
            checkForUpdatesSilent(currentVersion).catch((err) => {
                this.#logger.error("Update check failed", err);
            });
        }, 5000);
    }

    async #setupIpcHandlers(): Promise<void> {
        ipcMain.on("close-window", (event: IpcMainEvent) => {
            BrowserWindow.fromWebContents(event.sender).close();
        });

        ipcMain.on(
            "set-ignore-mouse-events",
            (
                event: IpcMainEvent,
                ignore: boolean,
                options?: { forward: boolean },
            ) => {
                BrowserWindow.fromWebContents(
                    event.sender,
                ).setIgnoreMouseEvents(ignore, options);
            },
        );

        ipcMain.on(
            "resize-window",
            (
                event: IpcMainEvent,
                windowType: WindowType,
                width: number,
                height: number,
            ) => {
                const senderWindow = BrowserWindow.fromWebContents(
                    event.sender,
                );
                if (!senderWindow) return;

                const bounds = senderWindow.getBounds();

                senderWindow.setBounds(
                    {
                        x: bounds.x,
                        y: bounds.y,
                        width: width,
                        height: height,
                    },
                    false,
                );
            },
        );

        ipcMain.on(
            "set-window-position",
            (
                event: IpcMainEvent,
                windowType: WindowType,
                x: number,
                y: number,
            ) => {
                const senderWindow = BrowserWindow.fromWebContents(
                    event.sender,
                );
                if (!senderWindow) return;

                const bounds = senderWindow.getBounds();
                const windowWidth = windowType
                    ? this.#windowManager.lastWindowSizes[windowType].width
                    : bounds.width;
                const windowHeight = windowType
                    ? this.#windowManager.lastWindowSizes[windowType].height
                    : bounds.height;

                const displays = screen.getAllDisplays();

                if (displays.length > 0) {
                    const minX = Math.min(...displays.map((d) => d.workArea.x));
                    const maxX =
                        Math.max(
                            ...displays.map(
                                (d) => d.workArea.x + d.workArea.width,
                            ),
                        ) - windowWidth;
                    const minY = Math.min(...displays.map((d) => d.workArea.y));
                    const maxY =
                        Math.max(
                            ...displays.map(
                                (d) => d.workArea.y + d.workArea.height,
                            ),
                        ) - windowHeight;

                    const clampedX = Math.max(minX, Math.min(x, maxX));
                    const clampedY = Math.max(minY, Math.min(y, maxY));

                    senderWindow.setBounds(
                        {
                            x: clampedX,
                            y: clampedY,
                            width: windowWidth,
                            height: windowHeight,
                        },
                        false,
                    );
                } else {
                    senderWindow.setPosition(x, y);
                }
            },
        );

        ipcMain.handle("get-window-position", (event: IpcMainInvokeEvent) => {
            const window = BrowserWindow.fromWebContents(event.sender);
            const [x, y] = window.getPosition();
            const bounds = window.getBounds();
            return { x, y, width: bounds.width, height: bounds.height };
        });

        ipcMain.on(
            "save-window-size",
            async (
                _event: IpcMainEvent,
                windowType: WindowType,
                width: number,
                height: number,
                scale?: number,
            ) => {
                await this.#windowManager.saveWindowSize(
                    windowType,
                    width,
                    height,
                    scale,
                );
            },
        );

        ipcMain.on(
            "save-window-position",
            async (
                _event: IpcMainEvent,
                windowType: WindowType,
                x: number,
                y: number,
            ) => {
                try {
                    await this.#windowManager.saveWindowPosition(
                        windowType,
                        x,
                        y,
                    );
                } catch (err) {
                    this.#logger.error(
                        `Error saving window position for ${windowType}`,
                        err,
                    );
                }
            },
        );

        ipcMain.handle("get-saved-window-size", async () => {
            return await this.#settingsManager.getWindowSizes(
                this.#windowManager.lastWindowSizes,
            );
        });

        const windowTypes: WindowType[] = [
            "group",
            "history",
            "device",
            "settings",
            "monsters",
            "update",
        ];
        windowTypes.forEach((type) => {
            ipcMain.on(`open-${type}-window`, () =>
                this.#windowManager
                    .createOrFocusWindow(type)
                    .catch((err) =>
                        this.#logger.error(`Error opening ${type} window`, err),
                    ),
            );
        });

        ipcMain.on(
            "update-visible-columns",
            (_event: IpcMainEvent, cols: Record<string, boolean>) => {
                const mainWindow = this.#windowManager.getWindow("main");
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(
                        "visible-columns-updated",
                        cols,
                    );
                }
            },
        );

        ipcMain.on(
            "update-global-settings",
            async (_event: IpcMainEvent, updates: GlobalSettings) => {
                try {
                    const newSettings =
                        await this.#settingsManager.updateSettings(updates);

                    if (Object.hasOwn(updates, "disableTransparency")) {
                        this.#windowManager.broadcastToWindows(
                            "transparency-setting-changed",
                            updates.disableTransparency,
                        );
                    }

                    if (Object.hasOwn(updates, "transparencyAmount")) {
                        this.#windowManager.broadcastToWindows(
                            "transparency-amount-changed",
                            updates.transparencyAmount,
                        );
                    }

                    if (Object.hasOwn(updates, "clickthroughEnabled")) {
                        this.#windowManager.broadcastToWindows(
                            "clickthrough-changed",
                            updates.clickthroughEnabled,
                        );
                    }

                    if (
                        Object.keys(updates).some((key) =>
                            keybindSettings.includes(key),
                        )
                    ) {
                        this.#keybindManager.registerKeybinds(newSettings);
                    }
                } catch (error) {
                    this.#logger.error("Error updating global settings", error);
                }
            },
        );

        this.#ipcHandlers();
    }

    #ipcHandlers(): void {
        ipcMain.handle(
            "delete-history-log",
            async (_event: IpcMainInvokeEvent, logId: string) => {
                try {
                    const logsDir = path.join(this.#userDataPath, "logs");
                    const logPath = path.join(logsDir, logId);

                    if (!logPath.startsWith(logsDir)) {
                        return { success: false, error: "Invalid log path" };
                    }

                    await fs.promises.access(logPath);
                    await fs.promises.rm(logPath, {
                        recursive: true,
                        force: true,
                    });
                    this.#logger.log(`Deleted history log: ${logId}`);

                    return { success: true };
                } catch (error) {
                    this.#logger.error(
                        `Error deleting history log ${logId}`,
                        error,
                    );
                    return { success: false, error: String(error) };
                }
            },
        );

        ipcMain.handle("check-for-updates", async () => {
            const currentVersion = app.getVersion();
            return await checkForUpdates(currentVersion);
        });

        ipcMain.handle("check-for-updates-with-dialog", async () => {
            const currentVersion = app.getVersion();
            return await checkForUpdatesManual(currentVersion);
        });
    }

    shutdown(): void {
        this.#keybindManager.unregisterAll();
        this.#logger.log("App closing, cleaning up...");
    }
}

// Application instance
const application = new Application();

/**
 * App Lifecycle
 */
app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.bpsr-meter");
    application.initialize().catch((error) => {
        console.error("Application initialization failed:", error);
        app.quit();
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            application.initialize().catch((error) => {
                console.error("Application initialization failed:", error);
            });
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    application.shutdown();
});
