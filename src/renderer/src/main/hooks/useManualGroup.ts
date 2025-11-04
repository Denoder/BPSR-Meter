import { useState, useEffect, useCallback } from "react";
import type { ManualGroupState } from "../../shared/types";

export interface UseManualGroupReturn {
    manualGroupState: ManualGroupState | null;
    refreshGroupState: () => Promise<void>;
}

export function useManualGroup(): UseManualGroupReturn {
    const [manualGroupState, setManualGroupState] =
        useState<ManualGroupState | null>(null);

    const loadGroupState = useCallback(async () => {
        try {
            const response = await fetch("/api/manual-group");
            const result = await response.json();

            if (result.code === 0 && result.data) {
                setManualGroupState(result.data);
            }
        } catch (error) {
            console.error("Failed to load manual group state:", error);
        }
    }, []);

    useEffect(() => {
        loadGroupState();
    }, [loadGroupState]);

    useEffect(() => {
        const interval = setInterval(loadGroupState, 2000);
        return () => clearInterval(interval);
    }, [loadGroupState]);

    return {
        manualGroupState,
        refreshGroupState: loadGroupState,
    };
}
