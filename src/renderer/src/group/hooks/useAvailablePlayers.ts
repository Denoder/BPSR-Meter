import { useState, useEffect, useCallback } from "react";
import { useInterval } from "../../shared/hooks";
import type { PlayerRegistry } from "../../shared/types";

export interface AvailablePlayer {
    uuid: string;
    uid: number;
    name: string;
    profession: string;
    hp: number;
    max_hp: number;
    total_damage: {
        total: number;
    };
    taken_damage: number;
    total_healing: {
        total: number;
    };
    total_dps: number;
}

export interface UseAvailablePlayersReturn {
    availablePlayers: AvailablePlayer[];
    isLoading: boolean;
    refreshPlayers: () => Promise<void>;
}

export function useAvailablePlayers(
    playerRegistry: PlayerRegistry,
): UseAvailablePlayersReturn {
    const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchPlayers = useCallback(async () => {
        try {
            const response = await fetch("/api/data");
            const result = await response.json();

            if (result.code === 0 && result.user) {
 
                const playersArray: AvailablePlayer[] = Object.entries(
                    result.user,
                ).map(([uid, userData]: [string, any]) => {

                    const userName =
                        userData.name &&
                        userData.name !== "Unknown" &&
                        userData.name.trim() !== ""
                            ? userData.name
                            : playerRegistry[uid]?.name || "Unknown";

                    return {
                        uuid: uid,
                        uid: parseInt(uid, 10),
                        name: userName,
                        profession: userData.profession || "Unknown",
                        hp: userData.hp || 0,
                        max_hp: userData.max_hp || 0,
                        total_damage: {
                            total: userData.total_damage?.total || 0,
                        },
                        taken_damage: userData.taken_damage || 0,
                        total_healing: {
                            total: userData.total_healing?.total || 0,
                        },
                        total_dps: userData.total_dps || 0,
                    };
                });

                setAvailablePlayers(playersArray);
                setIsLoading(false);
            } else {
                console.warn("No user data received from API");
                setAvailablePlayers([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Failed to fetch available players:", error);
            setAvailablePlayers([]);
            setIsLoading(false);
        }
    }, [playerRegistry]);


    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    useInterval(fetchPlayers, 2000);

    return {
        availablePlayers,
        isLoading,
        refreshPlayers: fetchPlayers,
    };
}
