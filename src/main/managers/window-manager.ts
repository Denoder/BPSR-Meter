import {
    BrowserWindow,
    type BrowserWindowConstructorOptions,
    screen,
} from "electron";
import path from "path";
import fs from "fs";
import { is } from "@electron-toolkit/utils";
import {
    WINDOW_CONFIGS,
    WindowType,
    WindowSize,
    WindowPosition,
} from "../constants";
import { SettingsManager } from "./settings-manager";
import { Logger } from "../logger";

export class WindowManager {
    windows: Record<WindowType, BrowserWindow | null>;
    lastWindowSizes: Record<WindowType, WindowSize>;
    lastWindowPositions: Record<WindowType, { x: number; y: number }>;
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
        this.lastWindowPositions = this.initializeDefaultPositions();
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

    initializeDefaultPositions(): Record<WindowType, { x: number; y: number }> {
        const positions: Record<WindowType, { x: number; y: number }> =
            {} as any;
        (Object.keys(WINDOW_CONFIGS) as WindowType[]).forEach((type) => {
            positions[type] = { x: 0, y: 0 };
        });
        return positions;
    }

    createWindowConfig(
        windowType: WindowType,
        savedSizes: Record<WindowType, WindowSize>,
        savedPositions?: Record<WindowType, WindowPosition>,
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

        const opts: BrowserWindowConstructorOptions = {
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
        const pos = savedPositions?.[windowType];
        if (pos?.x && pos?.y) {
            try {
                const displays = screen.getAllDisplays();
                if (displays.length > 0) {
                    const windowWidth = size.width;
                    const windowHeight = size.height;

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

                    const clampedX = Math.max(minX, Math.min(pos.x, maxX));
                    const clampedY = Math.max(minY, Math.min(pos.y, maxY));

                    opts.x = clampedX;
                    opts.y = clampedY;
                } else {
                    opts.x = pos.x;
                    opts.y = pos.y;
                }
            } catch (err) {
                opts.x = pos.x;
                opts.y = pos.y;
            }
        }

        return opts;
    }

    setupWindowEvents(window: BrowserWindow, windowType: WindowType) {
        window.setAlwaysOnTop(true, "screen-saver");
        window.setIgnoreMouseEvents(false);

        let moveTimeout: NodeJS.Timeout | null = null;
        window.on("move", () => {
            if (moveTimeout) clearTimeout(moveTimeout);
            moveTimeout = setTimeout(async () => {
                try {
                    const bounds = window.getBounds();
                    await this.saveWindowPosition(
                        windowType,
                        bounds.x,
                        bounds.y,
                    );
                } catch (err) {
                    this.#logger.error(
                        "Failed to save window position on move",
                        err,
                    );
                }
            }, 500);
        });

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
        const savedPositions = await this.#settingsManager.getWindowPositions(
            this.lastWindowPositions,
        );
        const windowConfig = this.createWindowConfig(
            windowType,
            savedSizes,
            savedPositions,
        );

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

    async saveWindowPosition(
        windowType: WindowType,
        x?: number,
        y?: number,
    ): Promise<void> {
        this.lastWindowPositions[windowType] = {
            ...this.lastWindowPositions[windowType],
            ...(x !== undefined && { x }),
            ...(y !== undefined && { y }),
        };
        await this.#settingsManager.saveWindowPosition(
            windowType,
            this.lastWindowPositions[windowType],
        );
    }

    setWindowMovable(movable: boolean): void {
        this.getAllWindows().forEach((window) => {
            window.setMovable(movable);
        });
    }
}
