import React, { useEffect, useState } from "react";
import "/css/style.css";
import { useWindowControls } from "@shared/hooks";
import { useTranslations } from "@shared/hooks/useTranslations";
import { useSocket } from "@shared/hooks/useSocket";
import { useWindowResize } from "@shared/hooks/useWindowResize";
import ResizeHandle from "@shared/components/ResizeHandle";
import WindowHeader from "@shared/components/WindowHeader";
import {
    KeybindInput,
    Checkbox,
    NumberInput,
    RangeInput,
    Description,
} from "@shared/components/settings";
import * as storage from "@shared/utils/localStorage";
import { electron } from "@shared/utils/electron";

const DEFAULT_KEYS = [
    "dps",
    "hps",
    "totalDmg",
    "dmgTaken",
    "percentDmg",
    "critPercent",
    "critDmg",
    "avgCritDmg",
    "luckyPercent",
    "peakDps",
    "totalHeal",
];

export default function SettingsApp(): React.JSX.Element {
    const [visibleColumns, setVisibleColumns] = useState<
        Record<string, boolean>
    >(() => {
        const initial: Record<string, boolean> = {};
        for (const k of DEFAULT_KEYS) initial[k] = true;
        return initial;
    });

    const [enableBPTimer, setEnableBPTimer] = useState<boolean>(true);
    const [autoClearOnServerChange, setAutoClearOnServerChange] =
        useState<boolean>(true);
    const [autoClearOnTimeout, setAutoClearOnTimeout] =
        useState<boolean>(false);
    const [autoClearTimeoutSeconds, setAutoClearTimeoutSeconds] =
        useState<number>(20);
    const [performanceMode, setPerformanceMode] = useState<boolean>(false);
    const [updateInterval, setUpdateInterval] = useState<number>(100);
    const [disableTransparency, setDisableTransparency] =
        useState<boolean>(false);
    const [transparencyAmount, setTransparencyAmount] = useState<number>(70);
    const [lockPosition, setLockPosition] = useState<boolean>(false);
    const [lockKeybind, setLockKeybind] =
        useState<string>("CommandOrControl+L");
    const [monstersKeybind, setMonstersKeybind] =
        useState<string>("CommandOrControl+M");
    const [groupKeybind, setGroupKeybind] =
        useState<string>("CommandOrControl+G");
    const [settingsKeybind, setSettingsKeybind] =
        useState<string>("CommandOrControl+S");
    const [deviceKeybind, setDeviceKeybind] =
        useState<string>("CommandOrControl+D");
    const [historyKeybind, setHistoryKeybind] =
        useState<string>("CommandOrControl+H");
    const [dataResetKeybind, setDataResetKeybind] =
        useState<string>("CommandOrControl+R");
    const [minimizeKeybind, setMinimizeKeybind] = 
        useState<string>("CommandOrControl+B")
    const [isRecordingKeybind, setIsRecordingKeybind] = useState<string | null>(
        null,
    );
    const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);

    useSocket();
    const { t } = useTranslations();

    const { zoomIn, zoomOut, handleDragStart, handleClose, isLocked } =
        useWindowControls({
            baseWidth: 360,
            baseHeight: 520,
            windowType: "settings",
        });

    const { handleResizeStart } = useWindowResize("settings");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings");
                const json = await response.json();

                if (json && json.code === 0 && json.data) {
                    const settings = json.data;

                    if (settings.hasOwnProperty("enableBPTimerSubmission")) {
                        const localValue = storage.getBoolean(
                            "enableBPTimerSubmission",
                        );
                        setEnableBPTimer(
                            localValue !== null
                                ? localValue
                                : settings.enableBPTimerSubmission,
                        );
                    }

                    if (settings.hasOwnProperty("autoClearOnServerChange")) {
                        const localValue = storage.getBoolean(
                            "autoClearOnServerChange",
                        );
                        setAutoClearOnServerChange(
                            localValue !== null
                                ? localValue
                                : settings.autoClearOnServerChange,
                        );
                    }

                    if (settings.hasOwnProperty("autoClearOnTimeout")) {
                        const localValue =
                            storage.getBoolean("autoClearOnTimeout");
                        setAutoClearOnTimeout(
                            localValue !== null
                                ? localValue
                                : settings.autoClearOnTimeout,
                        );
                    }

                    if (settings.hasOwnProperty("autoClearTimeoutSeconds")) {
                        const localValue = storage.getNumber(
                            "autoClearTimeoutSeconds",
                        );
                        setAutoClearTimeoutSeconds(
                            localValue !== null
                                ? localValue
                                : settings.autoClearTimeoutSeconds,
                        );
                    }

                    if (settings.hasOwnProperty("performanceMode")) {
                        const localValue =
                            storage.getBoolean("performanceMode");
                        setPerformanceMode(
                            localValue !== null
                                ? localValue
                                : settings.performanceMode,
                        );
                    }

                    if (settings.hasOwnProperty("updateIntervalMs")) {
                        const localValue =
                            storage.getNumber("updateIntervalMs");
                        setUpdateInterval(
                            localValue !== null
                                ? localValue
                                : settings.updateIntervalMs,
                        );
                    }

                    if (settings.hasOwnProperty("disableTransparency")) {
                        const localValue = storage.getBoolean(
                            "disableTransparency",
                        );
                        setDisableTransparency(
                            localValue !== null
                                ? localValue
                                : settings.disableTransparency,
                        );
                    }

                    if (settings.hasOwnProperty("transparencyAmount")) {
                        const localValue =
                            storage.getNumber("transparencyAmount");
                        setTransparencyAmount(
                            localValue !== null
                                ? localValue
                                : settings.transparencyAmount,
                        );
                    }
                }
            } catch (err) {
                console.warn(
                    "Failed to fetch settings from API, using localStorage only",
                    err,
                );
            }
        };

        const savedLockKeybind = storage.getItem(
            "lockKeybind",
            "CommandOrControl+L",
        );
        if (savedLockKeybind) {
            setLockKeybind(savedLockKeybind);
        }

        const savedMonstersKeybind = storage.getItem(
            "monstersKeybind",
            "CommandOrControl+M",
        );
        if (savedMonstersKeybind) {
            setMonstersKeybind(savedMonstersKeybind);
        }

        const savedGroupKeybind = storage.getItem(
            "groupKeybind",
            "CommandOrControl+G",
        );
        if (savedGroupKeybind) {
            setGroupKeybind(savedGroupKeybind);
        }

        const savedSettingsKeybind = storage.getItem(
            "settingsKeybind",
            "CommandOrControl+S",
        );
        if (savedSettingsKeybind) {
            setSettingsKeybind(savedSettingsKeybind);
        }

        const savedDeviceKeybind = storage.getItem(
            "deviceKeybind",
            "CommandOrControl+D",
        );
        if (savedDeviceKeybind) {
            setDeviceKeybind(savedDeviceKeybind);
        }

        const savedHistoryKeybind = storage.getItem(
            "historyKeybind",
            "CommandOrControl+H",
        );
        if (savedHistoryKeybind) {
            setHistoryKeybind(savedHistoryKeybind);
        }

        const savedMinimizeKeybind = storage.getItem(
            "minimizeKeybind",
            "CommandOrControl+B",
        );
        if (savedMinimizeKeybind) {
            setMinimizeKeybind(savedMinimizeKeybind);
        }

        fetchSettings();
    }, []);

    useEffect(() => {
        // Load visibleColumns from localStorage
        const visibleCols =
            storage.getJSON<Record<string, boolean>>("visibleColumns");
        if (visibleCols && typeof visibleCols === "object") {
            setVisibleColumns((prev) => ({ ...prev, ...visibleCols }));
        }

        // Apply transparency setting
        const isDisabled = storage.getBoolean("disableTransparency", false);
        document.body.style.backgroundColor = isDisabled
            ? "#000"
            : "transparent";

        // Apply transparency amount
        const amount = storage.getNumber("transparencyAmount", 70);
        const opacity = amount / 100;
        document.documentElement.style.setProperty(
            "--transparency-amount",
            opacity.toString(),
        );

        // Setup transparency listener
        const unsubscribe = electron.onTransparencySettingChanged(
            (isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled
                    ? "#000"
                    : "transparent";
                setDisableTransparency(isDisabled);
            },
        );
        return unsubscribe;
    }, []);

    useEffect(() => {
        const unsubscribe = electron.onTransparencyAmountChanged(
            (amount: number) => {
                const opacity = amount / 100;
                document.documentElement.style.setProperty(
                    "--transparency-amount",
                    opacity.toString(),
                );
                setTransparencyAmount(amount);
                storage.setItem("transparencyAmount", amount);
            },
        );
        return unsubscribe;
    }, []);

    useEffect(() => {
        const unsubscribe = electron.onLockStateChanged((locked: boolean) => {
            setLockPosition(locked);
        });
        return unsubscribe;
    }, []);

    const toggle = (key: string) => {
        const next = { ...visibleColumns, [key]: !visibleColumns[key] };
        setVisibleColumns(next);
        storage.setJSON("visibleColumns", next);
        electron.updateVisibleColumns(next);
    };

    const toggleBPTimer = () => {
        const newValue = !enableBPTimer;
        setEnableBPTimer(newValue);
        storage.setItem("enableBPTimerSubmission", newValue);
        electron.updateGlobalSettings({ enableBPTimerSubmission: newValue });
    };

    const toggleAutoClearOnServerChange = () => {
        const newValue = !autoClearOnServerChange;
        setAutoClearOnServerChange(newValue);
        storage.setItem("autoClearOnServerChange", newValue);
        electron.updateGlobalSettings({ autoClearOnServerChange: newValue });
    };

    const toggleAutoClearOnTimeout = () => {
        const newValue = !autoClearOnTimeout;
        setAutoClearOnTimeout(newValue);
        storage.setItem("autoClearOnTimeout", newValue);
        electron.updateGlobalSettings({ autoClearOnTimeout: newValue });
    };

    const handleTimeoutSecondsChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0 && value <= 300) {
            setAutoClearTimeoutSeconds(value);
            storage.setItem("autoClearTimeoutSeconds", value);
            electron.updateGlobalSettings({ autoClearTimeoutSeconds: value });
        }
    };

    const togglePerformanceMode = () => {
        const newValue = !performanceMode;
        setPerformanceMode(newValue);

        // Apply performance mode class immediately
        if (newValue) {
            document.body.classList.add("performance-mode");
        } else {
            document.body.classList.remove("performance-mode");
        }

        // Auto-adjust update interval based on performance mode
        const newInterval = newValue ? 250 : 100;
        setUpdateInterval(newInterval);

        storage.setItem("performanceMode", newValue);
        storage.setItem("updateIntervalMs", newInterval);

        electron.updateGlobalSettings({
            performanceMode: newValue,
            updateIntervalMs: newInterval,
        });
    };

    const handleUpdateIntervalChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 50 && value <= 1000) {
            setUpdateInterval(value);
            storage.setItem("updateIntervalMs", value);
            electron.updateGlobalSettings({ updateIntervalMs: value });
        }
    };

    const toggleDisableTransparency = () => {
        const newValue = !disableTransparency;
        setDisableTransparency(newValue);

        document.body.style.backgroundColor = newValue ? "#000" : "transparent";

        storage.setItem("disableTransparency", newValue);
        electron.updateGlobalSettings({ disableTransparency: newValue });
    };

    const handleTransparencyAmountChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            setTransparencyAmount(value);
            storage.setItem("transparencyAmount", value);
            electron.updateGlobalSettings({ transparencyAmount: value });

            // Apply transparency to CSS variables
            const opacity = value / 100;
            document.documentElement.style.setProperty(
                "--transparency-amount",
                opacity.toString(),
            );
        }
    };

    const toggleLockPosition = () => {
        electron.toggleLockState();
    };

    const handleKeybindRecord = (type: string) => {
        setIsRecordingKeybind(type);
    };

    const handleKeybindKeyDown = (e: React.KeyboardEvent) => {
        if (!isRecordingKeybind) return;

        e.preventDefault();
        e.stopPropagation();

        const parts: string[] = [];

        if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");

        const key = e.key;
        if (!["Control", "Meta", "Alt", "Shift"].includes(key)) {
            parts.push(key.toUpperCase());
        }

        if (parts.length > 1) {
            const keybind = parts.join("+");

            switch (isRecordingKeybind) {
                case "lock":
                    setLockKeybind(keybind);
                    storage.setItem("lockKeybind", keybind);
                    electron.updateGlobalSettings({ lockKeybind: keybind });
                    break;
                case "dataReset":
                    setDataResetKeybind(keybind);
                    storage.setItem("dataResetKeybind", keybind);
                    electron.updateGlobalSettings({
                        dataResetKeybind: keybind,
                    });
                    break;
                case "monsters":
                    setMonstersKeybind(keybind);
                    storage.setItem("monstersKeybind", keybind);
                    electron.updateGlobalSettings({ monstersKeybind: keybind });
                    break;
                case "group":
                    setGroupKeybind(keybind);
                    storage.setItem("groupKeybind", keybind);
                    electron.updateGlobalSettings({ groupKeybind: keybind });
                    break;
                case "settings":
                    setSettingsKeybind(keybind);
                    storage.setItem("settingsKeybind", keybind);
                    electron.updateGlobalSettings({ settingsKeybind: keybind });
                    break;
                case "device":
                    setDeviceKeybind(keybind);
                    storage.setItem("deviceKeybind", keybind);
                    electron.updateGlobalSettings({ deviceKeybind: keybind });
                    break;
                case "history":
                    setHistoryKeybind(keybind);
                    storage.setItem("historyKeybind", keybind);
                    electron.updateGlobalSettings({ historyKeybind: keybind });
                    break;
                case "minimize":
                    setMinimizeKeybind(keybind);
                    storage.setItem("minimizeKeybind", keybind);
                    electron.updateGlobalSettings({ minimizeKeybind: keybind });
                    break;
            }

            setIsRecordingKeybind(null);
        }
    };

    const handleKeybindBlur = () => {
        setIsRecordingKeybind(null);
    };

    const handleCheckForUpdates = async () => {
        setCheckingUpdate(true);
        try {
            const updateInfo = await electron.checkForUpdatesWithDialog();

            if (!updateInfo.available && !updateInfo.error) {
            } else if (updateInfo.error) {
                alert(`Failed to check for updates: ${updateInfo.error}`);
            }
        } catch (error) {
            console.error("Update check failed:", error);
            alert(`Failed to check for updates: ${error}`);
        } finally {
            setCheckingUpdate(false);
        }
    };

    return (
        <div className="settings-window p-4">
            <ResizeHandle handleResizeStart={handleResizeStart} />

            <WindowHeader
                title={t("ui.titles.settings")}
                onClose={handleClose}
                onDragStart={handleDragStart}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                isLocked={isLocked}
                t={t}
                className="settings-header"
            />

            <div className="settings-container">
                <div className="settings-columns mt-3">
                    <h3 className="settings-section-title">
                        {t("ui.settings.sections.visibleColumns")}
                    </h3>
                    <div className="settings-grid">
                        {DEFAULT_KEYS.map((k) => (
                            <label key={k} className="column-item settings-row">
                                <input
                                    type="checkbox"
                                    checked={!!visibleColumns[k]}
                                    onChange={() => toggle(k)}
                                />
                                <span
                                    className="fake-checkbox"
                                    aria-hidden
                                ></span>
                                <span className="column-label">
                                    {t(`ui.stats.${k}`)}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">
                        {t("ui.settings.sections.bptimerIntegration")}
                    </h3>
                    <Checkbox
                        label={t("ui.settings.labels.submitBossData")}
                        checked={enableBPTimer}
                        onChange={toggleBPTimer}
                    />
                    <Description>
                        {t("ui.settings.descriptions.submitBossData")}
                    </Description>
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">
                        {t("ui.settings.sections.generalOptions")}
                    </h3>
                    <Checkbox
                        label={t("ui.settings.labels.clearOnServerChange")}
                        checked={autoClearOnServerChange}
                        onChange={toggleAutoClearOnServerChange}
                    />
                    <Description>
                        {t("ui.settings.descriptions.clearOnServerChange")}
                    </Description>
                    <Checkbox
                        label={t("ui.settings.labels.clearOnTimeout")}
                        checked={autoClearOnTimeout}
                        onChange={toggleAutoClearOnTimeout}
                    />
                    <Description>
                        {t("ui.settings.descriptions.clearOnTimeout")}
                    </Description>
                    {autoClearOnTimeout && (
                        <NumberInput
                            label={t("ui.settings.labels.timeoutDuration")}
                            min={1}
                            max={300}
                            value={autoClearTimeoutSeconds}
                            onChange={handleTimeoutSecondsChange}
                        />
                    )}

                    <Checkbox
                        label={t("ui.settings.labels.disableTransparency")}
                        checked={disableTransparency}
                        onChange={toggleDisableTransparency}
                        className="column-item settings-row mt-2"
                    />
                    <Description>
                        {t(
                            "ui.settings.descriptions.disableTransparency",
                            "Disables transparent window background to reduce GPU load. Requires application restart to take effect. Recommended for best performance.",
                        )}
                    </Description>

                    {!disableTransparency && (
                        <RangeInput
                            label={t("ui.settings.labels.transparencyAmount")}
                            min={0}
                            max={100}
                            value={transparencyAmount}
                            onChange={handleTransparencyAmountChange}
                        />
                    )}

                    <Checkbox
                        label={t("ui.settings.labels.lockPosition")}
                        checked={lockPosition}
                        onChange={toggleLockPosition}
                        className="column-item settings-row mt-2"
                    />
                    <Description>
                        {t(
                            "ui.settings.descriptions.lockPosition",
                            "Prevents all windows from being moved. Can also be toggled using the lock button on the main window.",
                        )}
                    </Description>

                    <KeybindInput
                        label={t("ui.settings.labels.lockKeybind")}
                        value={lockKeybind}
                        type="lock"
                        isRecording={isRecordingKeybind === "lock"}
                        onFocus={() => handleKeybindRecord("lock")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />
                    <p className="settings-description">
                        {t(
                            "ui.settings.descriptions.lockKeybind",
                            "Click the input field and press your desired key combination. Works globally even when the app is not focused.",
                        )}
                    </p>

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.monstersKeybind",
                            "Monsters Window Keybind",
                        )}
                        value={monstersKeybind}
                        type="monsters"
                        isRecording={isRecordingKeybind === "monsters"}
                        onFocus={() => handleKeybindRecord("monsters")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.groupKeybind",
                            "Group Window Keybind",
                        )}
                        value={groupKeybind}
                        type="group"
                        isRecording={isRecordingKeybind === "group"}
                        onFocus={() => handleKeybindRecord("group")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.settingsKeybind",
                            "Settings Window Keybind",
                        )}
                        value={settingsKeybind}
                        type="settings"
                        isRecording={isRecordingKeybind === "settings"}
                        onFocus={() => handleKeybindRecord("settings")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.deviceKeybind",
                            "Device Window Keybind",
                        )}
                        value={deviceKeybind}
                        type="device"
                        isRecording={isRecordingKeybind === "device"}
                        onFocus={() => handleKeybindRecord("device")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.historyKeybind",
                            "History Window Keybind",
                        )}
                        value={historyKeybind}
                        type="history"
                        isRecording={isRecordingKeybind === "history"}
                        onFocus={() => handleKeybindRecord("history")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.dataResetKeybind",
                            "Data Reset Keybind",
                        )}
                        value={dataResetKeybind}
                        type="dataReset"
                        isRecording={isRecordingKeybind === "dataReset"}
                        onFocus={() => handleKeybindRecord("dataReset")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />

                    <KeybindInput
                        label={t(
                            "ui.settings.labels.minimizeKeybind",
                            "Show/Hide Meter Keybind",
                        )}
                        value={minimizeKeybind}
                        type="minimize"
                        isRecording={isRecordingKeybind === "minimize"}
                        onFocus={() => handleKeybindRecord("minimize")}
                        onKeyDown={handleKeybindKeyDown}
                        onBlur={handleKeybindBlur}
                        pressKeysPlaceholder={t(
                            "ui.settings.placeholders.pressKeys",
                            "Press keys...",
                        )}
                    />
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">
                        {t("ui.settings.sections.performanceOptions")}
                    </h3>
                    <Checkbox
                        label={t("ui.settings.labels.performanceMode")}
                        checked={performanceMode}
                        onChange={togglePerformanceMode}
                    />
                    <Description>
                        {t("ui.settings.descriptions.performanceMode")}
                    </Description>
                    {!performanceMode && (
                        <>
                            <NumberInput
                                label={t("ui.settings.labels.updateInterval")}
                                min={50}
                                max={1000}
                                value={updateInterval}
                                onChange={handleUpdateIntervalChange}
                            />
                            <Description>
                                {t("ui.settings.descriptions.updateInterval")}
                            </Description>
                        </>
                    )}
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">
                        {t("ui.settings.sections.updates")}
                    </h3>
                    <button
                        className="control-button px-4 py-4 w-full"
                        onClick={handleCheckForUpdates}
                        disabled={checkingUpdate}
                        style={{
                            backgroundColor: "var(--bg-secondary)",
                            cursor: checkingUpdate ? "wait" : "pointer",
                        }}
                    >
                        {checkingUpdate ? (
                            <>
                                <i
                                    className="fa-solid fa-spinner fa-spin"
                                    style={{ marginRight: "8px" }}
                                ></i>
                                {t(
                                    "ui.settings.labels.checkingForUpdates",
                                    "Checking for updates...",
                                )}
                            </>
                        ) : (
                            <>
                                <i
                                    className="fa-solid fa-download"
                                    style={{ marginRight: "8px" }}
                                ></i>
                                {t("ui.settings.labels.checkForUpdates")}
                            </>
                        )}
                    </button>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.checkForUpdates")}
                    </p>
                </div>
            </div>
        </div>
    );
}
