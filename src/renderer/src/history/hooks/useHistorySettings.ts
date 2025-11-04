import { useState, useEffect, useCallback } from "react";

export interface UseHistorySettingsReturn {
    isHistorySavingEnabled: boolean;
    saveOnLineSwitch: boolean;
    isLoading: boolean;
    toggleHistorySaving: () => Promise<void>;
    toggleSaveOnLineSwitch: () => Promise<void>;
}

export function useHistorySettings(): UseHistorySettingsReturn {
    const [isHistorySavingEnabled, setIsHistorySavingEnabled] = useState<boolean>(false);
    const [saveOnLineSwitch, setSaveOnLineSwitch] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Check history saving status
    const checkStatus = useCallback(async () => {
        try {
            const response = await fetch("/api/settings");
            const result = await response.json();

            if (result.code === 0) {
                const enabled = result.data.enableHistorySave || false;
                const lineSwitchSave = result.data.saveOnLineSwitch !== false;
                setIsHistorySavingEnabled(enabled);
                setSaveOnLineSwitch(lineSwitchSave);
            }

            setIsLoading(false);
        } catch (error) {
            console.error("Failed to check history status:", error);
            setIsLoading(false);
        }
    }, []);

    // Toggle history saving
    const toggleHistorySaving = useCallback(async () => {
        try {
            const settingsRes = await fetch("/api/settings");
            const settings = await settingsRes.json();

            if (settings.code !== 0) return;

            const newEnabled = !settings.data.enableHistorySave;

            const updateRes = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...settings.data,
                    enableHistorySave: newEnabled,
                }),
            });

            const result = await updateRes.json();
            if (result.code === 0) {
                setIsHistorySavingEnabled(newEnabled);
                console.log(
                    `History saving ${newEnabled ? "enabled" : "disabled"}`,
                );
            }
        } catch (error) {
            console.error("Failed to toggle history saving:", error);
        }
    }, []);

    // Toggle save on line switch
    const toggleSaveOnLineSwitch = useCallback(async () => {
        try {
            const settingsRes = await fetch("/api/settings");
            const settings = await settingsRes.json();

            if (settings.code !== 0) return;

            const newEnabled = !settings.data.saveOnLineSwitch;

            const updateRes = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...settings.data,
                    saveOnLineSwitch: newEnabled,
                }),
            });

            const result = await updateRes.json();
            if (result.code === 0) {
                setSaveOnLineSwitch(newEnabled);
                console.log(
                    `Save on line switch ${newEnabled ? "enabled" : "disabled"}`,
                );
            }
        } catch (error) {
            console.error("Failed to toggle save on line switch:", error);
        }
    }, []);

    // Load initial status
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    return {
        isHistorySavingEnabled,
        saveOnLineSwitch,
        isLoading,
        toggleHistorySaving,
        toggleSaveOnLineSwitch,
    };
}
