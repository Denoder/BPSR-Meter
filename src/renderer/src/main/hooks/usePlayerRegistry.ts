import { useState, useEffect, useCallback } from "react";
import type { PlayerRegistry } from "../../shared/types";

export interface UsePlayerRegistryReturn {
    playerRegistry: PlayerRegistry;
    getPlayerName: (uid: string, currentName: string) => string;
    addToRegistry: (uid: string, name: string) => Promise<boolean>;
    refreshRegistry: () => Promise<void>;
}

export function usePlayerRegistry(): UsePlayerRegistryReturn {
    const [playerRegistry, setPlayerRegistry] = useState<PlayerRegistry>({});

    const loadRegistry = useCallback(async () => {
        try {
            const response = await fetch("/api/player-registry");
            const result = await response.json();

            if (result.code === 0 && result.data) {
                setPlayerRegistry(result.data);
                console.log(
                    "Loaded player registry:",
                    Object.keys(result.data).length,
                    "players",
                );
            }
        } catch (error) {
            console.error("Failed to load player registry:", error);
        }
    }, []);

    useEffect(() => {
        loadRegistry();
    }, [loadRegistry]);

    useEffect(() => {
        const interval = setInterval(loadRegistry, 10000);
        return () => clearInterval(interval);
    }, [loadRegistry]);

    const getPlayerName = useCallback(
        (uid: string, currentName: string): string => {
            if (
                currentName &&
                currentName !== "Unknown" &&
                currentName.trim() !== ""
            ) {
                return currentName;
            }

            if (playerRegistry[uid]) {
                return playerRegistry[uid].name;
            }

            return "Unknown";
        },
        [playerRegistry],
    );

    const addToRegistry = useCallback(
        async (uid: string, name: string): Promise<boolean> => {
            try {
                const response = await fetch("/api/player-registry/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid, name }),
                });

                const result = await response.json();

                if (result.code === 0 && result.data) {
                    setPlayerRegistry(result.data);
                    console.log(`Added player to registry: ${uid} -> ${name}`);
                    return true;
                }

                return false;
            } catch (error) {
                console.error("Failed to add player to registry:", error);
                return false;
            }
        },
        [],
    );

    return {
        playerRegistry,
        getPlayerName,
        addToRegistry,
        refreshRegistry: loadRegistry,
    };
}
