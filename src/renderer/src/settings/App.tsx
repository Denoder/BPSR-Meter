import React, { useEffect, useState } from "react";
import "/css/style.css";
import { useWindowControls } from "../shared/hooks";
import { useTranslations } from "../shared/hooks/useTranslations";

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
    const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);

    const { t } = useTranslations();

    const { zoomIn, zoomOut, handleDragStart, handleClose } = useWindowControls({
        baseWidth: 360,
        baseHeight: 520,
        windowType: "settings",
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem("visibleColumns");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    setVisibleColumns((prev) => ({ ...prev, ...parsed }));
                }
            }
        } catch (err) {
            console.warn("Failed to load visibleColumns from localStorage", err);
        }

        try {
            const bpTimerSetting = localStorage.getItem("enableBPTimerSubmission");
            if (bpTimerSetting !== null) {
                setEnableBPTimer(bpTimerSetting === "true");
            }
        } catch (err) {
            console.warn("Failed to load BPTimer setting from localStorage", err);
        }

        try {
            const serverChangeSetting = localStorage.getItem("autoClearOnServerChange");
            if (serverChangeSetting !== null) {
                setAutoClearOnServerChange(serverChangeSetting === "true");
            }
        } catch (err) {
            console.warn("Failed to load autoClearOnServerChange from localStorage", err);
        }

        try {
            const timeoutSetting = localStorage.getItem("autoClearOnTimeout");
            if (timeoutSetting !== null) {
                setAutoClearOnTimeout(timeoutSetting === "true");
            }
        } catch (err) {
            console.warn("Failed to load autoClearOnTimeout from localStorage", err);
        }

        try {
            const timeoutSecondsSetting = localStorage.getItem("autoClearTimeoutSeconds");
            if (timeoutSecondsSetting !== null) {
                setAutoClearTimeoutSeconds(parseInt(timeoutSecondsSetting, 10) || 20);
            }
        } catch (err) {
            console.warn("Failed to load autoClearTimeoutSeconds from localStorage", err);
        }

        try {
            const perfModeSetting = localStorage.getItem("performanceMode");
            if (perfModeSetting !== null) {
                setPerformanceMode(perfModeSetting === "true");
            }
        } catch (err) {
            console.warn("Failed to load performanceMode from localStorage", err);
        }

        try {
            const intervalSetting = localStorage.getItem("updateIntervalMs");
            if (intervalSetting !== null) {
                setUpdateInterval(parseInt(intervalSetting, 10) || 100);
            }
        } catch (err) {
            console.warn("Failed to load updateIntervalMs from localStorage", err);
        }

        try {
            const transparencySetting = localStorage.getItem("disableTransparency");
            if (transparencySetting !== null) {
                setDisableTransparency(transparencySetting === "true");
            }
        } catch (err) {
            console.warn("Failed to load disableTransparency from localStorage", err);
        }

        try {
            const heightStepSetting = localStorage.getItem("heightStep");
            if (heightStepSetting !== null) {
                setHeightStep(parseInt(heightStepSetting, 10) || 50);
            }
        } catch (err) {
            console.warn("Failed to load heightStep from localStorage", err);
        }

        try {
            const transparencySetting = localStorage.getItem("disableTransparency");
            const isDisabled = transparencySetting === "true";
            document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";
        } catch (err) {
            console.warn("Failed to apply transparency setting", err);
        }

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
        try {
            localStorage.setItem("visibleColumns", JSON.stringify(next));
        } catch (e) {
            console.warn("Failed to persist visibleColumns to localStorage", e);
        }

        try {
            window.electronAPI.updateVisibleColumns(next);
        } catch (err) {
            console.warn("Failed to notify main window of visibleColumns change", err);
        }
    };

    const toggleBPTimer = () => {
        const newValue = !enableBPTimer;
        setEnableBPTimer(newValue);
        try {
            localStorage.setItem("enableBPTimerSubmission", String(newValue));
        } catch (e) {
            console.warn("Failed to persist BPTimer setting to localStorage", e);
        }

        try {
            window.electronAPI.updateGlobalSettings({ enableBPTimerSubmission: newValue });
        } catch (err) {
            console.warn("Failed to notify main process of BPTimer setting change", err);
        }
    };

    const toggleAutoClearOnServerChange = () => {
        const newValue = !autoClearOnServerChange;
        setAutoClearOnServerChange(newValue);
        try {
            localStorage.setItem("autoClearOnServerChange", String(newValue));
        } catch (e) {
            console.warn("Failed to persist autoClearOnServerChange to localStorage", e);
        }

        try {
            window.electronAPI.updateGlobalSettings({ autoClearOnServerChange: newValue });
        } catch (err) {
            console.warn("Failed to notify main process of autoClearOnServerChange change", err);
        }
    };

    const toggleAutoClearOnTimeout = () => {
        const newValue = !autoClearOnTimeout;
        setAutoClearOnTimeout(newValue);
        try {
            localStorage.setItem("autoClearOnTimeout", String(newValue));
        } catch (e) {
            console.warn("Failed to persist autoClearOnTimeout to localStorage", e);
        }

        try {
            window.electronAPI.updateGlobalSettings({ autoClearOnTimeout: newValue });
        } catch (err) {
            console.warn("Failed to notify main process of autoClearOnTimeout change", err);
        }
    };

    const handleTimeoutSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0 && value <= 300) {
            setAutoClearTimeoutSeconds(value);
            try {
                localStorage.setItem("autoClearTimeoutSeconds", String(value));
            } catch (err) {
                console.warn("Failed to persist autoClearTimeoutSeconds to localStorage", err);
            }

            try {
                window.electronAPI.updateGlobalSettings({ autoClearTimeoutSeconds: value });
            } catch (err) {
                console.warn("Failed to notify main process of autoClearTimeoutSeconds change", err);
            }
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
        
        try {
            localStorage.setItem("performanceMode", String(newValue));
            localStorage.setItem("updateIntervalMs", String(newInterval));
        } catch (e) {
            console.warn("Failed to persist performance settings to localStorage", e);
        }

        try {
            window.electronAPI.updateGlobalSettings({ 
                performanceMode: newValue,
                updateIntervalMs: newInterval
            });
        } catch (err) {
            console.warn("Failed to notify main process of performance settings change", err);
        }
    };

    const handleUpdateIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 50 && value <= 1000) {
            setUpdateInterval(value);
            try {
                localStorage.setItem("updateIntervalMs", String(value));
            } catch (err) {
                console.warn("Failed to persist updateIntervalMs to localStorage", err);
            }

            try {
                window.electronAPI.updateGlobalSettings({ updateIntervalMs: value });
            } catch (err) {
                console.warn("Failed to notify main process of updateIntervalMs change", err);
            }
        }
    };

    const toggleDisableTransparency = () => {
        const newValue = !disableTransparency;
        setDisableTransparency(newValue);

        // Apply background color immediately
        document.body.style.backgroundColor = newValue ? "#000" : "transparent";

        try {
            localStorage.setItem("disableTransparency", String(newValue));
        } catch (err) {
            console.warn("Failed to persist disableTransparency to localStorage", err);
        }

        try {
            window.electronAPI.updateGlobalSettings({ disableTransparency: newValue });
        } catch (err) {
            console.warn("Failed to notify main process of disableTransparency change", err);
        }
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
                    <h3 className="settings-section-title">Visible Columns</h3>
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
                    <h3 className="settings-section-title">BPTimer Integration</h3>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={enableBPTimer}
                            onChange={toggleBPTimer}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">Submit boss HP data to BPTimer</span>
                    </label>
                    <p className="settings-description">
                        When enabled, boss HP thresholds are automatically submitted to the BPTimer database to help the community track spawn times.
                    </p>
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">Auto Clear Options</h3>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={autoClearOnServerChange}
                            onChange={toggleAutoClearOnServerChange}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">Clear data on server change</span>
                    </label>
                    <p className="settings-description">
                        Automatically clears DPS statistics when changing servers or zones.
                    </p>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={autoClearOnTimeout}
                            onChange={toggleAutoClearOnTimeout}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">Clear data on inactivity timeout</span>
                    </label>
                    <p className="settings-description">
                        Automatically clears DPS statistics after a period of combat inactivity.
                    </p>
                    {autoClearOnTimeout && (
                        <div className="settings-input-row">
                            <label className="settings-input-label">Timeout duration (seconds):</label>
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
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">Performance Options</h3>
                    <label className="column-item settings-row">
                        <input
                            type="checkbox"
                            checked={performanceMode}
                            onChange={togglePerformanceMode}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">Performance mode (reduce CPU/GPU usage)</span>
                    </label>
                    <p className="settings-description">
                        Reduces update frequency to 250ms (from 100ms) to improve FPS. Recommended if experiencing frame drops.
                    </p>
                    {!performanceMode && (
                        <>
                            <div className="settings-input-row">
                                <label className="settings-input-label">Update interval (ms):</label>
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
                                How often the DPS meter updates. Higher values = better performance but less responsive. Default: 100ms
                            </p>
                        </>
                    )}
                    <label className="column-item settings-row mt-2">
                        <input
                            type="checkbox"
                            checked={disableTransparency}
                            onChange={toggleDisableTransparency}
                        />
                        <span className="fake-checkbox" aria-hidden></span>
                        <span className="column-label">Disable window transparency</span>
                    </label>
                    <p className="settings-description">
                        Disables transparent window background to reduce GPU load. Requires application restart to take effect. Recommended for best performance.
                    </p>

                    <div className="settings-input-row mt-2">
                        <label className="settings-input-label">Height adjustment step (px):</label>
                        <input
                            type="number"
                            min="10"
                            max="200"
                            step="10"
                            value={heightStep}
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!isNaN(value) && value > 0) {
                                    setHeightStep(value);
                                    try {
                                        localStorage.setItem("heightStep", String(value));
                                    } catch (err) {
                                        console.warn("Failed to persist heightStep to localStorage", err);
                                    }
                                    try {
                                        window.electronAPI.updateGlobalSettings?.({ heightStep: value });
                                    } catch (err) {
                                        console.warn("Failed to notify main process of heightStep change", err);
                                    }
                                }
                            }}
                            className="settings-number-input"
                        />
                    </div>
                    <p className="settings-description">
                        How many pixels the window height increases or decreases when using the height adjustment buttons. Default: 20px
                    </p>
                </div>

                <div className="settings-columns mt-4">
                    <h3 className="settings-section-title">Updates</h3>
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
                                Checking for updates...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-download" style={{ marginRight: "8px" }}></i>
                                Check for Updates
                            </>
                        )}
                    </button>
                    <p className="settings-description">
                        Check if a new version of BPSR Meter is available on GitHub. Updates are automatically checked on startup.
                    </p>
                </div>
            </div>
        </div>
    );
}
