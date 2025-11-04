import React, { useEffect, useCallback } from "react";
import { HistoryHeader, HistoryControls, HistoryList, HistoryDetails, SkillModal } from "./components";
import { useHistoryList, useHistoryDetails, useHistorySettings } from "./hooks";
import { useWindowControls, useSocket } from "../shared/hooks";
import { usePlayerRegistry } from "../main/hooks/usePlayerRegistry";
import { useTranslations } from "../shared/hooks/useTranslations";

export function HistoryApp(): React.JSX.Element {
    // Hooks
    const {
        historyItems,
        isLoading: isLoadingList,
        error: listError,
        refreshHistoryList,
    } = useHistoryList();

    const {
        selectedTimestamp,
        summary,
        userData,
        selectedPlayerSkills,
        isLoadingDetails,
        isLoadingSkills,
        detailsError,
        loadDetails,
        loadPlayerSkills,
        closeSkillModal,
    } = useHistoryDetails();

    const { isHistorySavingEnabled, saveOnLineSwitch, toggleHistorySaving, toggleSaveOnLineSwitch } = useHistorySettings();

    const { getPlayerName, refreshRegistry } = usePlayerRegistry();

    const { translateSkill, translateProfession, t } = useTranslations();

    const socket = useSocket();

    const { scale, zoomIn, zoomOut, handleDragStart, handleClose, isDragging } =
        useWindowControls({
            baseWidth: 1125,
            baseHeight: 875,
            windowType: "history",
        });

    useEffect(() => {
        refreshHistoryList();
    }, [refreshHistoryList]);

    // Listen for history updates from server
    useEffect(() => {
        const handleHistoryUpdate = () => {
            refreshHistoryList();
        };

        socket.on('historyUpdated', handleHistoryUpdate);

        return () => {
            socket.off('historyUpdated', handleHistoryUpdate);
        };
    }, [socket, refreshHistoryList]);

    useEffect(() => {
        try {
            const disableTransparency = localStorage.getItem("disableTransparency") === "true";
            document.body.style.backgroundColor = disableTransparency ? "#000" : "transparent";
            
            const performanceMode = localStorage.getItem("performanceMode") === "true";
            if (performanceMode) {
                document.body.classList.add("performance-mode");
            } else {
                document.body.classList.remove("performance-mode");
            }
        } catch (err) {
            console.warn("Failed to apply transparency setting", err);
        }

        try {
            const unsubscribe = window.electronAPI.onTransparencySettingChanged?.((isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";
            });
        
            return unsubscribe;
        } catch (err) {
            console.warn("Failed to setup transparency listener", err);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(refreshRegistry, 10000);
        return () => clearInterval(interval);
    }, [refreshRegistry]);

    const handleSelectItem = useCallback(
        async (timestamp: string) => {
            await loadDetails(timestamp);
        },
        [loadDetails],
    );

    const handleViewSkills = useCallback(
        async (timestamp: string, uid: string) => {
            await loadPlayerSkills(timestamp, uid);
        },
        [loadPlayerSkills],
    );

    const handleRefresh = useCallback(async () => {
        await refreshHistoryList();
    }, [refreshHistoryList]);

    const handleDeleteItem = useCallback(async (timestamp: string) => {
        try {
            if (!window.electronAPI?.deleteHistoryLog) {
                console.error("deleteHistoryLog API not available");
                return;
            }
            
            const result = await window.electronAPI.deleteHistoryLog(timestamp);
            
            if (result.success) {
                if (selectedTimestamp === timestamp) {
                    loadDetails(null);
                }

                await refreshHistoryList();
            } else {
                alert(`Failed to delete log: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error deleting history log:", error);
            alert(`Failed to delete log: ${error}`);
        }
    }, [selectedTimestamp, loadDetails, refreshHistoryList]);

    useEffect(() => {
        let debounceTimer: number | null = null;

        const resizeIfNeeded = (width: number, height: number) => {
            if (!isDragging) {
                window.electronAPI.resizeWindowToContent("history", width, height, scale);
            }
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const cr = entry.target.getBoundingClientRect();
            if (debounceTimer) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                resizeIfNeeded(Math.ceil(cr.width), Math.ceil(cr.height));
                debounceTimer = null;
            }, 80);
        });

        const el = document.querySelector(".history-window");
        if (el) observer.observe(el);

        return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer);
            observer.disconnect();
        };
    }, [isDragging, scale]);

    return (
        <div className="history-window">
            <HistoryHeader
                onClose={handleClose}
                onDragStart={handleDragStart}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                t={t}
            />

            <div className="history-container">
                <div className="history-list-section">
                    <HistoryControls
                        isHistorySavingEnabled={isHistorySavingEnabled}
                        saveOnLineSwitch={saveOnLineSwitch}
                        onRefresh={handleRefresh}
                        onToggleHistorySaving={toggleHistorySaving}
                        onToggleSaveOnLineSwitch={toggleSaveOnLineSwitch}
                        t={t}
                    />

                    <HistoryList
                        historyItems={historyItems}
                        isLoading={isLoadingList}
                        selectedTimestamp={selectedTimestamp}
                        onSelectItem={handleSelectItem}
                        onDeleteItem={handleDeleteItem}
                    />
                </div>

                <div className="history-details-section">
                    <HistoryDetails
                        summary={summary}
                        userData={userData}
                        isLoading={isLoadingDetails}
                        error={detailsError}
                        getPlayerName={getPlayerName}
                        translateProfession={translateProfession}
                        onViewSkills={handleViewSkills}
                        selectedTimestamp={selectedTimestamp}
                        t={t}
                    />
                </div>
            </div>

            <SkillModal
                playerSkills={selectedPlayerSkills}
                isLoading={isLoadingSkills}
                onClose={closeSkillModal}
                getPlayerName={getPlayerName}
                translateSkill={translateSkill}
                t={t}
            />
        </div>
    );
}

export default HistoryApp;
