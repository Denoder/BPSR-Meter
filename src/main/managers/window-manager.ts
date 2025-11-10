import { BrowserWindow, type BrowserWindowConstructorOptions } from "electron";
import path from "path";
import fs from "fs";
import { is } from "@electron-toolkit/utils";
import { WINDOW_CONFIGS, WindowType, WindowSize } from "../constants";
import { SettingsManager } from "./settings-manager";
import { Logger } from "../logger";

export class WindowManager {
    windows: Record<WindowType, BrowserWindow | null>;
    lastWindowSizes: Record<WindowType, WindowSize>;
    #settingsManager: SettingsManager;
    #logger: Logger;
    #serverPort: number;

    constructor(
        settingsManager: SettingsManager,
        logger: Logger,
        serverPort: number,
    ) {
        this.windows = this.initializeWindows();
        this.lastWindowSizes = this.initializeDefaultSizes();
        this.#settingsManager = settingsManager;
        this.#logger = logger;
        this.#serverPort = serverPort;
    }

    initializeWindows(): Record<WindowType, BrowserWindow | null> {
        const windows: Record<WindowType, BrowserWindow | null> = {} as any;
        (Object.keys(WINDOW_CONFIGS) as WindowType[]).forEach((type) => {
            windows[type] = null;
        });
        return windows;
    }

    initializeDefaultSizes(): Record<WindowType, WindowSize> {
        const sizes: Record<WindowType, WindowSize> = {} as any;
        (Object.keys(WINDOW_CONFIGS) as WindowType[]).forEach((type) => {
            const config = WINDOW_CONFIGS[type];
            sizes[type] = { ...config.defaultSize, scale: 1 };
        });
        return sizes;
    }

    createWindowConfig(
        windowType: WindowType,
        savedSizes: Record<WindowType, WindowSize>,
    ): BrowserWindowConstructorOptions {
        const config = WINDOW_CONFIGS[windowType];
        const size = Object.assign(
            config.defaultSize,
            this.lastWindowSizes[windowType],
            savedSizes[windowType],
        );
        this.lastWindowSizes[windowType] = size;

        let shouldUseTransparency = true;
        try {
            const settings = fs.readFileSync(
                this.#settingsManager.settingsPath,
                "utf8",
            );
            const parsedSettings = JSON.parse(settings);
            shouldUseTransparency = !parsedSettings.disableTransparency;
        } catch (error) {
            this.#logger.error("Error reading transparency setting", error);
        }

        return {
            width: size.width,
            height: size.height,
            transparent: shouldUseTransparency,
            frame: false,
            alwaysOnTop: true,
            resizable: config.resizable,
            skipTaskbar: windowType !== "main",
            show: windowType === "main",
            useContentSize: true,
            webPreferences: {
                preload: path.join(__dirname, "../../out/preload/index.cjs"),
                nodeIntegration: true,
                contextIsolation: true,
            },
            icon: path.join(__dirname, "../../icon.ico"),
            title: windowType.charAt(0).toUpperCase() + windowType.slice(1),
        };
    }

    setupWindowEvents(window: BrowserWindow, windowType: WindowType) {
        window.setAlwaysOnTop(true, "screen-saver");
        window.setIgnoreMouseEvents(false);

        window.once("ready-to-show", () => {
            if (windowType !== "main") window.show();
            this.#logger.log(`${windowType} window ready and shown`);
        });

        window.on("show", () => {
            window.webContents.send("window-shown");
        });

        window.on("focus", () => {
            window.webContents.send("window-focused");
        });

        window.on("blur", () => {
            window.webContents.send("window-blurred");
        });

        window.on("closed", () => {
            this.windows[windowType] = null;
        });
    }

    loadWindowURL(window: BrowserWindow, page: string) {
        const url =
            is.dev && process.env.ELECTRON_RENDERER_URL
                ? `${process.env.ELECTRON_RENDERER_URL}/${page}.html`
                : `http://localhost:${this.#serverPort}/${page}.html`;

        window.loadURL(url);
        this.#logger.log(`Loaded ${page} window from: ${url}`);
    }

    async createOrFocusWindow(windowType: WindowType): Promise<void> {
        if (this.windows[windowType]) {
            this.windows[windowType]!.focus();
            return;
        }

        const savedSizes = await this.#settingsManager.getWindowSizes(
            this.lastWindowSizes,
        );
        const windowConfig = this.createWindowConfig(windowType, savedSizes);

        this.windows[windowType] = new BrowserWindow(windowConfig);
        this.setupWindowEvents(this.windows[windowType]!, windowType);
        this.loadWindowURL(
            this.windows[windowType]!,
            windowType === "main" ? "index" : windowType,
        );
    }

    toggleWindow(windowType: WindowType): void {
        const window = this.windows[windowType];
        if (window && !window.isDestroyed()) {
            if (window.isVisible()) {
                window.close();
            } else {
                window.show();
                window.focus();
            }
        } else {
            this.createOrFocusWindow(windowType).catch((err) =>
                this.#logger.error(`Error opening ${windowType} window`, err),
            );
        }
    }

    broadcastToWindows(event: string, data?: any): void {
        Object.values(this.windows).forEach((window) => {
            if (window && !window.isDestroyed()) {
                window.webContents.send(event, data);
            }
        });
    }

    getWindow(windowType: WindowType): BrowserWindow | null {
        return this.windows[windowType];
    }

    getAllWindows(): BrowserWindow[] {
        return Object.values(this.windows).filter(Boolean) as BrowserWindow[];
    }

    closeAllWindows(): void {
        Object.values(this.windows).forEach((win) => win?.close());
    }

    async saveWindowSize(
        windowType: WindowType,
        width: number,
        height: number,
        scale?: number,
    ): Promise<void> {
        this.lastWindowSizes[windowType] = {
            ...this.lastWindowSizes[windowType],
            ...(width !== undefined && { width }),
            ...(height !== undefined && { height }),
            ...(scale !== undefined && { scale }),
        };
        await this.#settingsManager.saveWindowSize(
            windowType,
            this.lastWindowSizes[windowType],
        );
    }

    setWindowMovable(movable: boolean): void {
        this.getAllWindows().forEach((window) => {
            window.setMovable(movable);
        });
    }
}
