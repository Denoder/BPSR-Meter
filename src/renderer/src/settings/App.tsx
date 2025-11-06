import React, { useEffect, useState } from "react";
import "/css/style.css";
import { useWindowControls } from "../shared/hooks";
import { useTranslations } from "../shared/hooks/useTranslations";
import { useSocket } from "../shared/hooks/useSocket";
import * as storage from "../shared/utils/localStorage";

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
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const k of DEFAULT_KEYS) initial[k] = true;
        return initial;
    });

    const [enableBPTimer, setEnableBPTimer] = useState<boolean>(true);
    const [autoClearOnServerChange, setAutoClearOnServerChange] = useState<boolean>(true);
    const [autoClearOnTimeout, setAutoClearOnTimeout] = useState<boolean>(false);
    const [autoClearTimeoutSeconds, setAutoClearTimeoutSeconds] = useState<number>(20);
    const [performanceMode, setPerformanceMode] = useState<boolean>(false);
    const [updateInterval, setUpdateInterval] = useState<number>(100);
    const [disableTransparency, setDisableTransparency] = useState<boolean>(false);
    const [heightStep, setHeightStep] = useState<number>(20);
    const [enableManualHeight, setEnableManualHeight] = useState<boolean>(false);
    const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);

    useSocket();
    const { t } = useTranslations();

    const { zoomIn, zoomOut, handleDragStart, handleClose } = useWindowControls({
        baseWidth: 360,
        baseHeight: 520,
        windowType: "settings",
    });

    // Fetch settings from backend API
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings");
                const json = await response.json();

                if (json && json.code === 0 && json.data) {
                    const settings = json.data;

                    if (settings.hasOwnProperty("enableBPTimerSubmission")) {
                        const localValue = storage.getBoolean("enableBPTimerSubmission");
                        setEnableBPTimer(localValue !== null ? localValue : settings.enableBPTimerSubmission);
                    }

                    if (settings.hasOwnProperty("autoClearOnServerChange")) {
                        const localValue = storage.getBoolean("autoClearOnServerChange");
                        setAutoClearOnServerChange(localValue !== null ? localValue : settings.autoClearOnServerChange);
                    }

                    if (settings.hasOwnProperty("autoClearOnTimeout")) {
                        const localValue = storage.getBoolean("autoClearOnTimeout");
                        setAutoClearOnTimeout(localValue !== null ? localValue : settings.autoClearOnTimeout);
                    }

                    if (settings.hasOwnProperty("autoClearTimeoutSeconds")) {
                        const localValue = storage.getNumber("autoClearTimeoutSeconds");
                        setAutoClearTimeoutSeconds(localValue !== null ? localValue : settings.autoClearTimeoutSeconds);
                    }

                    if (settings.hasOwnProperty("performanceMode")) {
                        const localValue = storage.getBoolean("performanceMode");
                        setPerformanceMode(localValue !== null ? localValue : settings.performanceMode);
                    }

                    if (settings.hasOwnProperty("updateIntervalMs")) {
                        const localValue = storage.getNumber("updateIntervalMs");
                        setUpdateInterval(localValue !== null ? localValue : settings.updateIntervalMs);
                    }

                    if (settings.hasOwnProperty("disableTransparency")) {
                        const localValue = storage.getBoolean("disableTransparency");
                        setDisableTransparency(localValue !== null ? localValue : settings.disableTransparency);
                    }

                    if (settings.hasOwnProperty("heightStep")) {
                        const localValue = storage.getNumber("heightStep");
                        setHeightStep(localValue !== null ? localValue : settings.heightStep);
                    }

                    if (settings.hasOwnProperty("enableManualHeight")) {
                        const localValue = storage.getBoolean("enableManualHeight");
                        setEnableManualHeight(localValue !== null ? localValue : settings.enableManualHeight);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch settings from API, using localStorage only", err);
            }
        };

        fetchSettings();
    }, []);

    useEffect(() => {
        // Load visibleColumns from localStorage
        const visibleCols = storage.getJSON<Record<string, boolean>>("visibleColumns");
        if (visibleCols && typeof visibleCols === "object") {
            setVisibleColumns((prev) => ({ ...prev, ...visibleCols }));
        }

        // Apply transparency setting
        const isDisabled = storage.getBoolean("disableTransparency", false);
        document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";

        // Setup transparency listener
        try {
            const unsubscribe = window.electronAPI.onTransparencySettingChanged?.((isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";
                setDisableTransparency(isDisabled);
            });
            return unsubscribe;
        } catch (err) {
            console.warn("Failed to setup transparency listener", err);
        }
    }, []);

    const toggle = (key: string) => {
        const next = { ...visibleColumns, [key]: !visibleColumns[key] };
        setVisibleColumns(next);
        storage.setJSON("visibleColumns", next);

        try {
            window.electronAPI.updateVisibleColumns(next);
        } catch (err) {
            console.warn("Failed to notify main window of visibleColumns change", err);
        }
    };

    const toggleBPTimer = () => {
        const newValue = !enableBPTimer;
        setEnableBPTimer(newValue);
        storage.setItem("enableBPTimerSubmission", newValue);
        window.electronAPI.updateGlobalSettings({ enableBPTimerSubmission: newValue });
    };

    const toggleAutoClearOnServerChange = () => {
        const newValue = !autoClearOnServerChange;
        setAutoClearOnServerChange(newValue);
        storage.setItem("autoClearOnServerChange", newValue);

        window.electronAPI.updateGlobalSettings({ autoClearOnServerChange: newValue });
    };

    const toggleAutoClearOnTimeout = () => {
        const newValue = !autoClearOnTimeout;
        setAutoClearOnTimeout(newValue);
        storage.setItem("autoClearOnTimeout", newValue);
        window.electronAPI.updateGlobalSettings({ autoClearOnTimeout: newValue });
    };

    const handleTimeoutSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0 && value <= 300) {
            setAutoClearTimeoutSeconds(value);
            storage.setItem("autoClearTimeoutSeconds", value);
            window.electronAPI.updateGlobalSettings({ autoClearTimeoutSeconds: value });
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

        window.electronAPI.updateGlobalSettings({
            performanceMode: newValue,
            updateIntervalMs: newInterval
        });
    };

    const handleUpdateIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 50 && value <= 1000) {
            setUpdateInterval(value);
            storage.setItem("updateIntervalMs", value);
            window.electronAPI.updateGlobalSettings({ updateIntervalMs: value });
        }
    };

    const toggleDisableTransparency = () => {
        const newValue = !disableTransparency;
        setDisableTransparency(newValue);

        document.body.style.backgroundColor = newValue ? "#000" : "transparent";

        storage.setItem("disableTransparency", newValue);
        window.electronAPI.updateGlobalSettings({ disableTransparency: newValue });
    };

    const handleCheckForUpdates = async () => {
        if (!window.electronAPI?.checkForUpdatesWithDialog) {
            alert("Update checker not available");
            return;
        }

        setCheckingUpdate(true);
        try {
            const updateInfo = await window.electronAPI.checkForUpdatesWithDialog();

            if (!updateInfo.available && !updateInfo.error) {
                alert(`You're running the latest version (${updateInfo.currentVersion})`);
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
            <div className="settings-header">
                <div className="drag-indicator pointer-events-auto" onMouseDown={handleDragStart} style={{ cursor: "move" }}>
                    <i className="fa-solid fa-grip-vertical"></i>
                </div>
                <span className="group-title">{t("ui.titles.settings")}</span>
                <div style={{ flex: 1 }} />
                <button id="settings-zoom-out" className="control-button" onClick={zoomOut} title={t("ui.buttons.zoomOut")}>
                    <i className="fa-solid fa-minus"></i>
                </button>
                <button id="settings-zoom-in" className="control-button" onClick={zoomIn} title={t("ui.buttons.zoomIn")}>
                    <i className="fa-solid fa-plus"></i>
                </button>
                <button id="settings-close" className="control-button" onClick={handleClose} title={t("ui.buttons.close")}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div className="settings-container">
                <div className="settings-columns mt-3">
                    <h3 className="settings-section-title">{t("ui.settings.sections.visibleColumns")}</h3>
                    <div className="settings-grid">
                        {DEFAULT_KEYS.map((k) => (
                            <label key={k} className="column-item settings-row">
                                <input
                                    type="checkbox"
                                    checked={!!visibleColumns[k]}
                                    onChange={() => toggle(k)}
                                />
                                <span className="fake-checkbox" aria-hidden></span>
                                <span className="column-label">{t(`ui.stats.${k}`)}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">{t("ui.settings.sections.bptimerIntegration")}</h3>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={enableBPTimer}
                            onChange={toggleBPTimer}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">{t("ui.settings.labels.submitBossData")}</span>
                    </label>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.submitBossData")}
                    </p>
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">{t("ui.settings.sections.generalOptions")}</h3>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={autoClearOnServerChange}
                            onChange={toggleAutoClearOnServerChange}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">{t("ui.settings.labels.clearOnServerChange")}</span>
                    </label>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.clearOnServerChange")}
                    </p>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={autoClearOnTimeout}
                            onChange={toggleAutoClearOnTimeout}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">{t("ui.settings.labels.clearOnTimeout")}</span>
                    </label>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.clearOnTimeout")}
                    </p>
                    {autoClearOnTimeout && (
                        <div className="settings-input-row">
                            <label className="settings-input-label">{t("ui.settings.labels.timeoutDuration")}</label>
                            <input
                                type="number"
                                min="1"
                                max="300"
                                value={autoClearTimeoutSeconds}
                                onChange={handleTimeoutSecondsChange}
                                className="settings-number-input"
                            />
                        </div>
                    )}

                    <label className="column-item settings-row mt-2">
                        <input
                            type="checkbox"
                            checked={disableTransparency}
                            onChange={toggleDisableTransparency}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">{t("ui.settings.labels.disableTransparency")}</span>
                    </label>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.disableTransparency", "Disables transparent window background to reduce GPU load. Requires application restart to take effect. Recommended for best performance.")}
                    </p>

                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={enableManualHeight}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setEnableManualHeight(checked);
                                storage.setItem("enableManualHeight", checked);
                                window.electronAPI.updateGlobalSettings?.({ enableManualHeight: checked });
                            }}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">{t("ui.settings.labels.enableManualHeight", "Enable manual height adjustment")}</span>
                    </label>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.enableManualHeight")}
                    </p>
                    {enableManualHeight && (
                        <>
                            <div className="settings-input-row mt-2">
                                <label className="settings-input-label">{t("ui.settings.labels.heightAdjustmentStep")}</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="200"
                                    step="10"
                                    value={heightStep}
                                    disabled={!enableManualHeight}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        if (!isNaN(value) && value > 0) {
                                            setHeightStep(value);
                                            storage.setItem("heightStep", value);
                                            window.electronAPI.updateGlobalSettings?.({ heightStep: value });
                                        }
                                    }}
                                    className="settings-number-input"
                                />
                            </div>
                            <p className="settings-description">
                                {t("ui.settings.descriptions.heightAdjustmentStep")}
                            </p>
                        </>
                    )}
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">{t("ui.settings.sections.performanceOptions")}</h3>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={performanceMode}
                            onChange={togglePerformanceMode}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">{t("ui.settings.labels.performanceMode")}</span>
                    </label>
                    <p className="settings-description">
                        {t("ui.settings.descriptions.performanceMode")}
                    </p>
                    {!performanceMode && (
                        <>
                            <div className="settings-input-row">
                                <label className="settings-input-label">{t("ui.settings.labels.updateInterval")}</label>
                                <input
                                    type="number"
                                    min="50"
                                    max="1000"
                                    step="50"
                                    value={updateInterval}
                                    onChange={handleUpdateIntervalChange}
                                    className="settings-number-input"
                                />
                            </div>
                            <p className="settings-description">
                                {t("ui.settings.descriptions.updateInterval")}
                            </p>
                        </>
                    )}
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">{t("ui.settings.sections.updates")}</h3>
                    <button
                        className="control-button"
                        onClick={handleCheckForUpdates}
                        disabled={checkingUpdate}
                        style={{
                            padding: "8px 16px",
                            width: "100%",
                            backgroundColor: "var(--bg-secondary)",
                            cursor: checkingUpdate ? "wait" : "pointer"
                        }}
                    >
                        {checkingUpdate ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }}></i>
                                {t("ui.settings.labels.checkingForUpdates", "Checking for updates...")}
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-download" style={{ marginRight: "8px" }}></i>
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
