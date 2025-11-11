import type { GlobalSettings } from "../types";

export const CONSTANTS = {
    PORTS: { START: 8989, END: 9000 },
    LOGGING: { MAX_SIZE: 5 * 1024 * 1024, MAX_FILES: 3 },
    WINDOW: { MIN_WIDTH: 400, MIN_HEIGHT: 300 },
    TIMEOUTS: { SERVER_START: 10000 },
} as const;

export const WINDOW_CONFIGS = {
    main: {
        defaultSize: { width: 950, height: 480, scale: 1 },
        resizable: true,
    },
    group: {
        defaultSize: { width: 480, height: 680, scale: 1 },
        resizable: true,
    },
    history: {
        defaultSize: { width: 950, height: 600, scale: 1 },
        resizable: true,
    },
    device: {
        defaultSize: { width: 600, height: 400, scale: 1 },
        resizable: true,
    },
    settings: {
        defaultSize: { width: 420, height: 520, scale: 1 },
        resizable: true,
    },
    monsters: {
        defaultSize: { width: 950, height: 600, scale: 1 },
        resizable: true,
    },
    update: {
        defaultSize: { width: 500, height: 650, scale: 1 },
        resizable: false,
    },
} as const;

export const DEFAULT_KEYBINDS = {
    lock: "CommandOrControl+L",
    monsters: "CommandOrControl+M",
    group: "CommandOrControl+G",
    settings: "CommandOrControl+S",
    device: "CommandOrControl+D",
    history: "CommandOrControl+H",
    dataReset: "CommandOrControl+R",
} as const;

export const keybindSettings = [
    "lockKeybind",
    "monstersKeybind",
    "groupKeybind",
    "settingsKeybind",
    "deviceKeybind",
    "historyKeybind",
    "dataResetKeybind",
];

export type WindowType = keyof typeof WINDOW_CONFIGS;
export type WindowSize = { width: number; height: number; scale?: number };

export const globalSettings: GlobalSettings = {
    availableLanguages: ["en", "zh"],
    language: "en",
    selectedPlayers: [],
    filterMode: "all",
    isPaused: false,
    autoClearOnServerChange: true,
    autoClearOnTimeout: false,
    autoClearTimeoutSeconds: 20,
    onlyRecordEliteDummy: false,
    enableHistorySave: false,
    enableBPTimerSubmission: true,
    performanceMode: false,
    updateIntervalMs: 100,
    disableTransparency: false,
    transparencyAmount: 70,
    lockPosition: false,
    lockKeybind: "CommandOrControl+L",
    monstersKeybind: "CommandOrControl+M",
    groupKeybind: "CommandOrControl+G",
    settingsKeybind: "CommandOrControl+S",
    deviceKeybind: "CommandOrControl+D",
    historyKeybind: "CommandOrControl+H",
    lastPausedAt: null,
    lastResumedAt: null,
    manualGroup: {
        enabled: false,
        members: [],
    },
};
