import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, screen } from "electron";
import { checkForUpdates, checkForUpdatesSilent, showUpdateDialog } from "./updateChecker";
import path from "path";
import { exec, fork, ChildProcess } from "child_process";
import { electronApp, is } from "@electron-toolkit/utils";
import net from "net";
import fs from "fs";

/** 
 * Constants and Globals
 */

const WINDOW_CONFIGS = {
    main: { defaultSize: { width: 650, height: 700 }, minSize: { width: 650, height: 700 }, resizable: true },
    group: { defaultSize: { width: 480, height: 530 }, minSize: { width: 400, height: 450 }, resizable: true },
    history: { defaultSize: { width: 800, height: 600 }, minSize: { width: 800, height: 600 }, resizable: true },
    device: { defaultSize: { width: 600, height: 400 }, minSize: { width: 400, height: 300 }, resizable: true },
    settings: { defaultSize: { width: 420, height: 520 }, minSize: { width: 360, height: 420 }, resizable: true },
    monsters: { defaultSize: { width: 480, height: 600 }, minSize: { width: 360, height: 300 }, resizable: true }
} as const;

type WindowType = keyof typeof WINDOW_CONFIGS;
type WindowSize = { width: number; height: number; scale?: number };

const windows: Record<WindowType, BrowserWindow | null> = {
    main: null, group: null, history: null, device: null, settings: null, monsters: null
};

const lastWindowSizes: Record<WindowType, WindowSize> = {
    main: { width: 650, height: 700, scale: 1 },
    group: { width: 480, height: 530, scale: 1 },
    history: { width: 800, height: 600, scale: 1 },
    device: { width: 600, height: 400, scale: 1 },
    settings: { width: 420, height: 520, scale: 1 },
    monsters: { width: 480, height: 600, scale: 1 }
};

let serverProcess: ChildProcess | null = null;
let serverPort: number = 8989;
let isLocked: boolean = false;
const userDataPath = is.dev ? process.cwd() : app.getPath("userData");
const settingsPath = path.join(userDataPath, "settings.json");

/**
 * Utilities
 */

const MAX_LOG_SIZE = 5 * 1024 * 1024;
const MAX_LOG_FILES = 3;

function rotateLogFile(logPath: string): void {
    try {
        for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
            const oldFile = `${logPath}.${i}`;
            const newFile = `${logPath}.${i + 1}`;
            if (fs.existsSync(oldFile)) {
                if (i === MAX_LOG_FILES - 1) {
                    fs.unlinkSync(oldFile);
                } else {
                    fs.renameSync(oldFile, newFile);
                }
            }
        }

        if (fs.existsSync(logPath)) {
            fs.renameSync(logPath, `${logPath}.1`);
        }
    } catch (e) {
        console.error("Log rotation failed:", e);
    }
}

function logToFile(msg: string): void {
    const timestamp = new Date().toISOString();
    const logPath = path.join(userDataPath, "information_log.txt");

    try {
        fs.mkdirSync(userDataPath, { recursive: true });

        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath);
            if (stats.size > MAX_LOG_SIZE) {
                rotateLogFile(logPath);
            }
        }

        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        console.error("Log failed:", e);
    }
    console.log(msg);
}

async function loadWindowSizes(): Promise<Record<WindowType, WindowSize>> {
    try {
        const data = await fs.promises.readFile(settingsPath, "utf8");
        const settings = JSON.parse(data);

        if (settings.windowSizes) {
            Object.entries(settings.windowSizes).forEach(([type, size]) => {
                if (type in lastWindowSizes) {
                    lastWindowSizes[type as WindowType] = size as WindowSize;
                }
            });
            return settings.windowSizes;
        }
    } catch {
        logToFile("No saved window sizes found, using defaults");
    }
}

async function saveWindowSize(windowType: WindowType, width: number, height: number, scale?: number): Promise<void> {
    try {
        lastWindowSizes[windowType] = { width, height, ...(scale && { scale }) };

        let settings: any = {};
        try {
            const data = await fs.promises.readFile(settingsPath, "utf8");
            settings = JSON.parse(data);
        } catch { }

        settings.windowSizes = { ...settings.windowSizes, [windowType]: lastWindowSizes[windowType] };
        await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 4));
    } catch (error) {
        logToFile(`Error saving window size: ${error}`);
    }
}

function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port);
    });
}

async function findAvailablePort(startPort: number = 8989, maxPort: number = 9000): Promise<number> {
    for (let port = startPort; port <= maxPort; port++) {
        if (await checkPort(port)) {
            logToFile(`Port ${port} is available`);
            return port;
        }
        logToFile(`Port ${port} is in use, trying next...`);
    }
    throw new Error("No available ports found");
}

async function killProcessUsingPort(port: number): Promise<void> {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (!stdout) return resolve();

            const lines = stdout.split("\n").filter(line => line.includes("LISTENING"));
            const pid = lines[0]?.trim().split(/\s+/).pop();

            if (pid) {
                exec(`taskkill /PID ${pid} /F`, (killError) => {
                    if (!killError) logToFile(`Process ${pid} killed successfully`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

/**
 * Window Management
 */

function createWindowConfig(windowType: WindowType, savedSizes: Record<WindowType, WindowSize>) {
    const config = WINDOW_CONFIGS[windowType];
    const size = savedSizes[windowType] || lastWindowSizes[windowType] || config.defaultSize;

    let shouldUseTransparency = true;
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, "utf8");
            const settings = JSON.parse(data);
            shouldUseTransparency = !settings.disableTransparency;
        }
    } catch (error) {
        logToFile(`Error reading transparency setting: ${error}`);
    }

    return {
        width: size.width,
        height: size.height,
        minWidth: config.minSize.width,
        minHeight: config.minSize.height,
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
        title: windowType.charAt(0).toUpperCase() + windowType.slice(1)
    };
}

function setupWindowEvents(window: BrowserWindow, windowType: WindowType) {
    window.setAlwaysOnTop(true, "screen-saver");
    window.setIgnoreMouseEvents(false);

    window.once("ready-to-show", () => {
        if (windowType !== "main") window.show();
        logToFile(`${windowType} window ready and shown`);
    });

    window.on("show", () => {
        window.webContents.send("window-shown");
    });

    window.on("focus", () => {
        window.webContents.send("window-focused");
    });

    window.on("closed", () => {
        windows[windowType] = null;
    });
}

function loadWindowURL(window: BrowserWindow, page: string) {
    const url = is.dev && process.env.ELECTRON_RENDERER_URL
        ? `${process.env.ELECTRON_RENDERER_URL}/${page}.html`
        : `http://localhost:${serverPort}/${page}.html`;

    window.loadURL(url);
    logToFile(`Loaded ${page} window from: ${url}`);
}

async function createOrFocusWindow(windowType: WindowType) {
    if (windows[windowType]) {
        windows[windowType].focus();
        return;
    }

    const savedSizes = await loadWindowSizes();
    const windowConfig = createWindowConfig(windowType, savedSizes);

    windows[windowType] = new BrowserWindow(windowConfig);
    setupWindowEvents(windows[windowType]!, windowType);
    loadWindowURL(windows[windowType]!, windowType);
}

/**
 * IPC Handlers
 */

function setupIpcHandlers() {
    ipcMain.on("close-window", (event: IpcMainEvent) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
    });

    ipcMain.on("set-ignore-mouse-events", (event: IpcMainEvent, ignore: boolean, options?: { forward: boolean }) => {
        BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, options);
    });

    ipcMain.handle("get-window-position", (event: IpcMainInvokeEvent) => {
        const [x, y] = BrowserWindow.fromWebContents(event.sender)?.getPosition() || [0, 0];
        return { x, y };
    });

    ipcMain.on("toggle-lock-state", () => {
        if (windows.main) {
            isLocked = !isLocked;
            windows.main.setMovable(!isLocked);
            windows.main.webContents.send("lock-state-changed", isLocked);
        }
    });

    ipcMain.on("resize-window-to-content", (event: IpcMainEvent, windowType: WindowType, width: number, height: number, scale: number) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow) return;

        const targetWidth = Math.min(width, width);
        const targetHeight = Math.min(height, height);
        senderWindow.setContentSize(targetWidth, targetHeight, false);
        senderWindow.setBounds({ width: targetWidth, height: targetHeight }, false);

        setTimeout(() => {
            const bounds = senderWindow.getBounds();
            if (windowType in lastWindowSizes) {
                lastWindowSizes[windowType] = { width: bounds.width, height: bounds.height, scale };
            }
        }, 10);
    });

    ipcMain.on("save-window-size", (_event: IpcMainEvent, windowType: WindowType, width: number, height: number, scale?: number) => {
        saveWindowSize(windowType, width, height, scale);
    });

    ipcMain.handle("get-saved-window-sizes", loadWindowSizes);

    ipcMain.on("open-group-window", () => createOrFocusWindow("group"));
    ipcMain.on("open-history-window", () => createOrFocusWindow("history"));
    ipcMain.on("open-device-window", () => createOrFocusWindow("device"));
    ipcMain.on("open-settings-window", () => createOrFocusWindow("settings"));
    ipcMain.on("open-monsters-window", () => createOrFocusWindow("monsters"));

    ipcMain.on("increase-window-height", (event: IpcMainEvent, windowType: WindowType, step: number = 20) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow) return;

        const bounds = senderWindow.getBounds();
        const newHeight = bounds.height + step;
        senderWindow.setContentSize(bounds.width, newHeight, false);
        senderWindow.setBounds({ width: bounds.width, height: newHeight }, false);

        if (windowType in lastWindowSizes) {
            const scale = lastWindowSizes[windowType].scale || 1;
            lastWindowSizes[windowType] = { width: bounds.width, height: newHeight, scale };
            saveWindowSize(windowType, bounds.width, newHeight, scale);
        }
    });

    ipcMain.on("decrease-window-height", (event: IpcMainEvent, windowType: WindowType, step: number = 20) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow) return;

        const bounds = senderWindow.getBounds();
        const config = WINDOW_CONFIGS[windowType];
        const minHeight = config?.minSize.height || 300;
        const newHeight = Math.max(minHeight, bounds.height - step);
        
        senderWindow.setContentSize(bounds.width, newHeight, false);
        senderWindow.setBounds({ width: bounds.width, height: newHeight }, false);

        if (windowType in lastWindowSizes) {
            const scale = lastWindowSizes[windowType].scale || 1;
            lastWindowSizes[windowType] = { width: bounds.width, height: newHeight, scale };
            saveWindowSize(windowType, bounds.width, newHeight, scale);
        }
    });

    ipcMain.on("update-visible-columns", (_event: IpcMainEvent, cols: Record<string, boolean>) => {
        if (windows.main && !windows.main.isDestroyed()) {
            windows.main.webContents.send("visible-columns-updated", cols);
        }
    });

    ipcMain.on("update-global-settings", async (_event: IpcMainEvent, settings: Partial<Record<string, any>>) => {
        try {
            let currentSettings: any = {};
            try {
                const data = await fs.promises.readFile(settingsPath, "utf8");
                currentSettings = JSON.parse(data);
            } catch { }

            Object.assign(currentSettings, settings);
            await fs.promises.writeFile(settingsPath, JSON.stringify(currentSettings, null, 4));

            if (settings.hasOwnProperty("disableTransparency")) {
                Object.values(windows).forEach((window) => {
                    if (window && !window.isDestroyed()) {
                        window.webContents.send("transparency-setting-changed", settings.disableTransparency);
                    }
                });
            }

            if (settings.hasOwnProperty("heightStep")) {
                if (windows.main && !windows.main.isDestroyed()) {
                    windows.main.webContents.send("height-step-changed", settings.heightStep);
                }
            }
        } catch (error) {
            logToFile(`Error updating global settings: ${error}`);
        }
    });

    ipcMain.handle("delete-history-log", async (_event: IpcMainInvokeEvent, logId: string) => {
        try {
            const logsDir = path.join(userDataPath, "logs");
            const logPath = path.join(logsDir, logId);

            if (!logPath.startsWith(logsDir)) {
                return { success: false, error: "Invalid log path" };
            }

            try {
                await fs.promises.access(logPath);
            } catch {
                return { success: false, error: "Log not found" };
            }

            await fs.promises.rm(logPath, { recursive: true, force: true });
            logToFile(`Deleted history log: ${logId}`);

            return { success: true };
        } catch (error) {
            logToFile(`Error deleting history log ${logId}: ${error}`);
            return { success: false, error: String(error) };
        }
    });

    ipcMain.on("set-window-position", (event: IpcMainEvent, x: number, y: number) => {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow) return;

        let windowType: WindowType | null = null;
        for (const [type, win] of Object.entries(windows)) {
            if (win === senderWindow) {
                windowType = type as WindowType;
                break;
            }
        }

        const bounds = senderWindow.getBounds();
        const windowWidth = windowType ? lastWindowSizes[windowType].width : bounds.width;
        const windowHeight = windowType ? lastWindowSizes[windowType].height : bounds.height;

        const displays = screen.getAllDisplays();

        if (displays.length > 0) {
            const minX = Math.min(...displays.map(d => d.workArea.x));
            const maxX = Math.max(...displays.map(d => d.workArea.x + d.workArea.width)) - windowWidth;
            const minY = Math.min(...displays.map(d => d.workArea.y));
            const maxY = Math.max(...displays.map(d => d.workArea.y + d.workArea.height)) - windowHeight;

            const clampedX = Math.max(minX, Math.min(x, maxX));
            const clampedY = Math.max(minY, Math.min(y, maxY));

            senderWindow.setBounds({
                x: clampedX,
                y: clampedY,
                width: windowWidth,
                height: windowHeight
            }, false);
        } else {
            senderWindow.setPosition(x, y);
        }
    });

    // Update checker handlers
    ipcMain.handle("check-for-updates", async () => {
        const currentVersion = app.getVersion();
        return await checkForUpdates(currentVersion);
    });

    ipcMain.handle("check-for-updates-with-dialog", async () => {
        const currentVersion = app.getVersion();
        const updateInfo = await checkForUpdates(currentVersion);
        
        if (updateInfo.available) {
            await showUpdateDialog(updateInfo);
        }
        
        return updateInfo;
    });
}

/**
 *  Server Management
 */

function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(__dirname, "../../out/main/server.js");
        logToFile(`Launching server on port ${serverPort} from: ${serverPath}`);

        serverProcess = fork(serverPath, [serverPort.toString()], {
            stdio: ["pipe", "pipe", "pipe", "ipc"],
            env: { ...process.env, resourcesPath: process.resourcesPath, USER_DATA_PATH: userDataPath }
        });

        const timeout = setTimeout(() => {
            reject(new Error("Server did not respond in time (10s timeout)"));
        }, 10000);

        serverProcess.stdout?.on("data", (data: Buffer) => {
            const output = data.toString().trim();
            logToFile(`SERVER: ${output}`);

            const match = output.match(/Web server started at (http:\/\/localhost:\d+)/);
            if (match && windows.main) {
                clearTimeout(timeout);
                loadWindowURL(windows.main, "index");
                resolve();
            }
        });

        serverProcess.stderr?.on("data", (data: Buffer) => {
            logToFile(`SERVER ERROR: ${data.toString().trim()}`);
        });

        serverProcess.on("error", reject);
    });
}

/**
 * Main Application
 */

async function createMainWindow(): Promise<void> {
    logToFile("=== STARTING APPLICATION ===");

    await killProcessUsingPort(8989);
    serverPort = await findAvailablePort();

    await loadWindowSizes();

    windows.main = new BrowserWindow(createWindowConfig("main", lastWindowSizes));
    setupWindowEvents(windows.main, "main");

    windows.main.webContents.on("did-finish-load", () => {
        windows.main.webContents.send("lock-state-changed", isLocked);
    });

    windows.main.on("closed", () => {
        Object.values(windows).forEach(win => win?.close());
        if (serverProcess) {
            serverProcess.kill("SIGTERM");
            setTimeout(() => serverProcess?.kill("SIGKILL"), 5000);
        }
    });

    setupIpcHandlers();

    try {
        await startServer();
    } catch (error) {
        logToFile(`Server startup failed: ${error}`);
        if (windows.main) {
            windows.main.loadURL(`data:text/html,<h2 style="color:red">Error: ${error}</h2>`);
        }
    }
}

/**
 * App Lifecycle
 */

app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.electron");
    createMainWindow();

    setTimeout(() => {
        const currentVersion = app.getVersion();
        checkForUpdatesSilent(currentVersion).catch(err => {
            logToFile(`Update check failed: ${err}`);
        });
    }, 5000);

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    logToFile("App closing, cleaning up...");
});