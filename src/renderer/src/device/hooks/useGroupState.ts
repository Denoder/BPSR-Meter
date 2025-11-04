import { useState, useEffect, useCallback } from "react";
import type { ManualGroupState } from "../../shared/types";

export interface UseGroupStateReturn {
    groupState: ManualGroupState;
    toggleGroupEnabled: () => Promise<void>;
    addMember: (uuid: string) => Promise<void>;
    removeMember: (uuid: string) => Promise<void>;
    clearGroup: () => Promise<void>;
    refreshGroupState: () => Promise<void>;
}

export function useGroupState(): UseGroupStateReturn {
    const [groupState, setGroupState] = useState<ManualGroupState>({
        enabled: false,
        members: [],
    });

    // Load group state from server
    const loadGroupState = useCallback(async () => {
        try {
            const response = await fetch("/api/manual-group");
            const result = await response.json();

            if (result.code === 0 && result.data) {
                setGroupState(result.data);
                console.log("Loaded group state:", result.data);
            }
        } catch (error) {
            console.error("Failed to load group state:", error);
        }
    }, []);

    // Save group state to server
    const saveGroupState = useCallback(async (newState: ManualGroupState) => {
        try {
            const response = await fetch("/api/manual-group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newState),
            });

            const result = await response.json();
            if (result.code === 0) {
                console.log("Group state saved successfully");
            }
        } catch (error) {
            console.error("Failed to save group state:", error);
        }
    }, []);

    // Toggle group enabled state
    const toggleGroupEnabled = useCallback(async () => {
        const newState: ManualGroupState = {
            ...groupState,
            enabled: !groupState.enabled,
        };

        setGroupState(newState);
        await saveGroupState(newState);
        console.log(
            `Group filter ${newState.enabled ? "ENABLED" : "DISABLED"}`,
        );
    }, [groupState, saveGroupState]);

    // Add member to group
    const addMember = useCallback(
        async (uuid: string) => {
            if (groupState.members.includes(uuid)) {
                console.log("Player already in group:", uuid);
                return;
            }

            const newState: ManualGroupState = {
                ...groupState,
                members: [...groupState.members, uuid],
            };

            setGroupState(newState);
            await saveGroupState(newState);
            console.log("Added member to group:", uuid);
        },
        [groupState, saveGroupState],
    );

    // Remove member from group
    const removeMember = useCallback(
        async (uuid: string) => {
            const newState: ManualGroupState = {
                ...groupState,
                members: groupState.members.filter((m) => m !== uuid),
            };

            setGroupState(newState);
            await saveGroupState(newState);
            console.log("Removed member from group:", uuid);
        },
        [groupState, saveGroupState],
    );

    // Clear all group members
    const clearGroup = useCallback(async () => {
        try {
            const response = await fetch("/api/manual-group/clear", {
                method: "POST",
            });

            const result = await response.json();
            if (result.code === 0 && result.data) {
                setGroupState(result.data);
                console.log("Group cleared successfully");
            }
        } catch (error) {
            console.error("Failed to clear group:", error);
        }
    }, []);

    // Load group state on mount
    useEffect(() => {
        loadGroupState();
    }, [loadGroupState]);

    return {
        groupState,
        toggleGroupEnabled,
        addMember,
        removeMember,
        clearGroup,
        refreshGroupState: loadGroupState,
    };
}
