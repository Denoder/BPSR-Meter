import React from "react";

export interface HistoryControlsProps {
    isHistorySavingEnabled: boolean;
    saveOnLineSwitch: boolean;
    onRefresh: () => void;
    onToggleHistorySaving: () => void;
    onToggleSaveOnLineSwitch: () => void;
    t: (key: string, fallback?: string | null) => string;
}

export function HistoryControls({
    isHistorySavingEnabled,
    saveOnLineSwitch,
    onRefresh,
    onToggleHistorySaving,
    onToggleSaveOnLineSwitch,
    t,
}: HistoryControlsProps): React.JSX.Element {
    return (
        <div className="history-header">
            <div className="history-header-row">
                <button
                    id="enable-history-btn"
                    className={`control-button ${isHistorySavingEnabled ? "enabled" : ""}`}
                    onClick={onToggleHistorySaving}
                    title={
                        isHistorySavingEnabled
                            ? t("ui.buttons.disableHistorySaving")
                            : t("ui.buttons.enableHistorySaving")
                    }
                    style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        fontWeight: 600,
                    }}
                >
                    <i
                        className={`fa-solid fa-toggle-${isHistorySavingEnabled ? "on" : "off"}`}
                        style={{ marginRight: "6px" }}
                    ></i>
                    {isHistorySavingEnabled ? t("ui.messages.savingEnabled") : t("ui.buttons.enableSaving")}
                </button>

                <button
                    id="save-line-switch-btn"
                    className={`control-button ${saveOnLineSwitch ? "enabled" : ""}`}
                    onClick={onToggleSaveOnLineSwitch}
                    disabled={!isHistorySavingEnabled}
                    title={
                        saveOnLineSwitch
                            ? t("ui.buttons.disableSaveOnLineSwitch", "Disable save on line switch")
                            : t("ui.buttons.enableSaveOnLineSwitch", "Enable save on line switch")
                    }
                    style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        opacity: isHistorySavingEnabled ? 1 : 0.4,
                        cursor: isHistorySavingEnabled ? "pointer" : "not-allowed",
                    }}
                >
                    <i
                        className={`fa-solid fa-arrows-left-right`}
                        style={{ marginRight: "6px" }}
                    ></i>
                    {saveOnLineSwitch 
                        ? t("ui.messages.saveOnLineSwitch", "Save on line switch") 
                        : t("ui.messages.skipLineSwitch", "Skip line switch")}
                </button>
            </div>

            <div className="history-header-row">
                <button
                    id="refresh-history-btn"
                    className="control-button"
                    onClick={onRefresh}
                    title={t("ui.buttons.refreshHistory")}
                    style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        fontWeight: 600,
                    }}
                >
                    <i
                        className="fa-solid fa-rotate-right"
                        style={{ marginRight: "6px" }}
                    ></i>
                    {t("ui.buttons.refreshHistory")}
                </button>
            </div>
        </div>
    );
}
