import React, { useCallback, useEffect } from "react";
import {
    GroupHeader,
    GroupToggle,
    GroupMembersList,
    AvailablePlayers,
    PlayerRegistrySection,
    ClearGroupButton,
} from "./components";
import { useGroupState, useAvailablePlayers } from "./hooks";
import { useWindowControls, useSocket } from "../shared/hooks";
import { usePlayerRegistry } from "../main/hooks/usePlayerRegistry";
import { useTranslations } from "../shared/hooks/useTranslations";

export function GroupApp(): React.JSX.Element {
    const {
        groupState,
        toggleGroupEnabled,
        addMember,
        removeMember,
        clearGroup,
    } = useGroupState();

    const { playerRegistry, addToRegistry, refreshRegistry } =
        usePlayerRegistry();

    const { t } = useTranslations();
    const { emitWithResponse } = useSocket();

    const { availablePlayers } = useAvailablePlayers(playerRegistry);

    const { scale, zoomIn, zoomOut, handleDragStart, handleClose, isDragging } =
        useWindowControls({
            baseWidth: 480,
            baseHeight: 530,
            windowType: "group",
        });

    const handleAddPlayer = useCallback(
        async (uuid: string) => {
            await addMember(uuid);
        },
        [addMember],
    );

    const handleRemoveMember = useCallback(
        async (uuid: string) => {
            await removeMember(uuid);
        },
        [removeMember],
    );

    const handleClearGroup = useCallback(async () => {
        await clearGroup();
    }, [clearGroup]);

    const handleSaveToRegistry = useCallback(
        async (uid: string, name: string) => {
            const success = await addToRegistry(uid, name);
            if (success) {
                console.log(`Player ${name} (${uid}) saved to registry`);
            }
        },
        [addToRegistry],
    );

    const handleDeleteFromRegistry = useCallback(
        async (uid: string) => {
            try {
                const result = await emitWithResponse({ 
                    event: "deleteFromPlayerRegistry", 
                    data: { uid } 
                });

                if (result.code === 0) {
                    console.log(`Deleted player from registry: ${uid}`);
                    await refreshRegistry();
                }
            } catch (error) {
                console.error("Failed to delete player from registry:", error);
            }
        },
        [emitWithResponse, refreshRegistry],
    );

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
        let debounceTimer: number | null = null;

        const resizeIfNeeded = (width: number, height: number) => {
            if (!isDragging) {
                window.electronAPI.resizeWindowToContent("group", width, height, scale);
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

        const el = document.querySelector(".group-window");
        if (el) observer.observe(el);

        return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer);
            observer.disconnect();
        };
    }, [isDragging, scale]);

    return (
        <div className="group-window">
            <GroupHeader
                onClose={handleClose}
                onDragStart={handleDragStart}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                t={t}
            />

            <div className="group-container">
                <GroupToggle
                    enabled={groupState.enabled}
                    memberCount={groupState.members.length}
                    onToggle={toggleGroupEnabled}
                    t={t}
                />

                <ClearGroupButton
                    onClearGroup={handleClearGroup}
                    disabled={groupState.members.length === 0}
                    t={t}
                />

                <GroupMembersList
                    members={groupState.members}
                    availablePlayers={availablePlayers}
                    playerRegistry={playerRegistry}
                    onRemoveMember={handleRemoveMember}
                    t={t}
                />

                <AvailablePlayers
                    players={availablePlayers}
                    groupMembers={groupState.members}
                    onAddPlayer={handleAddPlayer}
                    t={t}
                />

                <PlayerRegistrySection
                    playerRegistry={playerRegistry}
                    onSavePlayer={handleSaveToRegistry}
                    onDeletePlayer={handleDeleteFromRegistry}
                    t={t}
                />
            </div>
        </div>
    );
}

export default GroupApp;
