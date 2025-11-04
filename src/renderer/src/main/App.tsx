import React, { useState, useCallback, useEffect } from "react";
import { ControlBar } from "./components/ControlBar";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { PlayerList } from "./components/PlayerList";
import { SkillsView } from "./components/SkillsView";
import { useDataFetching } from "./hooks/useDataFetching";
import { useElectronIntegration } from "./hooks/useElectronIntegration";
import { usePlayerRegistry } from "./hooks/usePlayerRegistry";
import { useManualGroup } from "./hooks/useManualGroup";
import { useTranslations } from "../shared/hooks/useTranslations";
import { resetStatistics } from "../shared/api";
import type { ViewMode, SortColumn, SortDirection } from "../shared/types";

export function MainApp(): React.JSX.Element {

    const [viewMode, setViewMode] = useState<ViewMode>("nearby");
    const [sortColumn, setSortColumn] = useState<SortColumn>("totalDmg");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);
    const [skillsScope, setSkillsScope] = useState<"solo" | "nearby">("nearby");
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        dps: true,
        hps: true,
        totalDmg: true,
        dmgTaken: true,
        percentDmg: true,
        critPercent: true,
        critDmg: true,
        avgCritDmg: true,
        luckyPercent: true,
        peakDps: true,
        totalHeal: true,
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
    }, []);

    useEffect(() => {
        try {
            window.electronAPI.onVisibleColumnsChanged((cols: Record<string, boolean>) => {
                if (cols && typeof cols === "object") {
                    setVisibleColumns((prev) => ({ ...prev, ...cols }));
                    try {
                        localStorage.setItem("visibleColumns", JSON.stringify(cols));
                    } catch (e) {
                        console.warn("Failed to persist visibleColumns from IPC", e);
                    }
                }
            });
        } catch (err) {

        }
    }, []);

    useEffect(() => {
        try {
            const disableTransparency = localStorage.getItem("disableTransparency") === "true";
            document.body.style.backgroundColor = disableTransparency ? "#000" : "transparent";
        } catch (err) {
            console.warn("Failed to apply transparency setting", err);
        }

        try {
            const unsubscribe = window.electronAPI.onTransparencySettingChanged((isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";
            });
            return unsubscribe;
        } catch (err) {
            console.warn("Failed to setup transparency listener", err);
        }
    }, []);

    useEffect(() => {
        try {
            const performanceMode = localStorage.getItem("performanceMode") === "true";
            if (performanceMode) {
                document.body.classList.add("performance-mode");
            } else {
                document.body.classList.remove("performance-mode");
            }
        } catch (err) {
            console.warn("Failed to apply performance mode class", err);
        }
    }, []);

    // Hooks
    const {
        currentLanguage,
        t,
        translateSkill,
        translateProfession,
        changeLanguage,
    } = useTranslations();
    const { getPlayerName, addToRegistry } = usePlayerRegistry();
    const { manualGroupState } = useManualGroup();

    const {
        scale,
        isLocked,
        toggleLock,
        zoomIn,
        zoomOut,
        handleDragStart,
        handleMouseOver,
        handleMouseOut,
        handleMouseLeave,
        handleWheel,
        isDragging,
    } = useElectronIntegration({
        baseWidth: 650,
        baseHeight: 700,
    });

    const {
        players,
        skillsData,
        localUid,
        isLoading,
        isPaused,
        togglePause,
        startTime,
    } = useDataFetching({
        viewMode,
        sortColumn,
        sortDirection,
        manualGroupState,
        onServerReset: () => {
            console.log("Server reset callback triggered");
        },
        showAllPlayers,
    });

    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === "nearby" ? "solo" : "nearby"));
    }, []);

    const handleToggleSkillsMode = useCallback(() => {
        setViewMode((prev) => (prev === "skills" ? "nearby" : "skills"));
    }, []);

    const handleToggleSkillsScope = useCallback(() => {
        setSkillsScope((prev) => (prev === "nearby" ? "solo" : "nearby"));
    }, []);

    const handleSortChange = useCallback(
        (column: SortColumn) => {
            if (sortColumn === column) {
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            } else {
                setSortColumn(column);
                setSortDirection("desc");
            }
        },
        [sortColumn],
    );

    const handleSync = useCallback(async () => {
        await resetStatistics();
    }, []);

    const handleLanguageToggle = useCallback(async () => {
        const newLang = currentLanguage === "en" ? "zh" : "en";
        await changeLanguage(newLang);
    }, [currentLanguage, changeLanguage]);

    const handleAddToRegistry = useCallback(
        async (uid: string, name: string) => {
            const success = await addToRegistry(uid, name);

            if (success) {
                const btn = document.querySelector(
                    `.add-to-registry-btn[data-uid="${uid}"]`,
                ) as HTMLButtonElement;
                if (btn) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    btn.style.background = "rgba(46, 204, 113, 0.3)";
                    btn.style.borderColor = "#2ecc71";
                    btn.style.color = "#2ecc71";

                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.background = "";
                        btn.style.borderColor = "";
                        btn.style.color = "";
                    }, 1000);
                }
            }
        },
        [addToRegistry],
    );

    const handleClose = useCallback(() => {
        window.electronAPI.closeWindow();
    }, []);

    const handleOpenGroup = useCallback(() => {
        window.electronAPI.openGroupWindow();
    }, []);

    const handleOpenHistory = useCallback(() => {
        window.electronAPI.openHistoryWindow();
    }, []);

    const handleOpenMonsters = useCallback(() => {
        window.electronAPI.openMonstersWindow();
    }, []);

    useEffect(() => {
        let debounceTimer: number | null = null;

        const resizeIfNeeded = (width: number, height: number) => {
            // Only resize if not currently dragging
            if (!isDragging) {
                window.electronAPI.resizeWindowToContent("main", width, height, scale);
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

        const el = document.querySelector(".dps-meter");
        if (el) observer.observe(el);

        return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer);
            observer.disconnect();
        };
    }, [isDragging, scale]);

    return (
        <div
            className={`dps-meter ${isLocked ? "locked" : ""}`}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
        >
            <ControlBar
                isLocked={isLocked}
                onToggleLock={toggleLock}
                onClose={handleClose}
                onDragStart={handleDragStart}
                viewMode={viewMode}
                onToggleViewMode={handleToggleViewMode}
                onToggleSkillsMode={handleToggleSkillsMode}
                skillsScope={skillsScope}
                onToggleSkillsScope={handleToggleSkillsScope}
                sortColumn={sortColumn}
                onSortChange={handleSortChange}
                onSync={handleSync}
                isPaused={isPaused}
                onTogglePause={togglePause}
                showAllPlayers={showAllPlayers}
                onToggleShowAll={() => setShowAllPlayers((s) => !s)}
                currentLanguage={currentLanguage}
                onLanguageToggle={handleLanguageToggle}
                onOpenGroup={handleOpenGroup}
                onOpenHistory={handleOpenHistory}
                onOpenMonsters={handleOpenMonsters}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                visibleColumns={visibleColumns}
                onToggleColumn={(key: string) => {
                    const newState = { ...visibleColumns, [key]: !visibleColumns[key] };
                    setVisibleColumns(newState);
                    try {
                        localStorage.setItem("visibleColumns", JSON.stringify(newState));
                    } catch (e) {
                        console.warn("Failed to persist visibleColumns to localStorage", e);
                    }
                }}
                t={t}
                startTime={startTime}
                players={players}
                localUid={localUid}
                manualGroupMembers={manualGroupState?.enabled ? manualGroupState.members : undefined}
            />

            {isLoading ? (
                <LoadingIndicator
                    message={t(
                        "ui.messages.waitingForData",
                        "Waiting for data...",
                    )}
                />
            ) : viewMode === "skills" && skillsData ? (
                <SkillsView
                    skillsData={
                        skillsScope === "solo" && localUid
                            ? { [String(localUid)]: skillsData[String(localUid)] }
                            : skillsData
                    }
                    startTime={startTime}
                    getPlayerName={getPlayerName}
                    translateProfession={translateProfession}
                    translateSkill={translateSkill}
                    scope={skillsScope}
                    t={t}
                />
            ) : (
                <PlayerList
                    players={players}
                    localUid={localUid}
                    onAddToRegistry={handleAddToRegistry}
                    getPlayerName={getPlayerName}
                    translateProfession={translateProfession}
                    visibleColumns={visibleColumns}
                    t={t}
                />
            )}
        </div>
    );
}

export default MainApp;
