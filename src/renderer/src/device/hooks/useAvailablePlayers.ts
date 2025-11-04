import { useState, useEffect } from "react";
import type { PlayerRegistry } from "../../shared/types";
import { useSocket } from "../../shared/hooks";

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
    //refreshPlayers: () => Promise<void>;
}

export function useAvailablePlayers(
    playerRegistry: PlayerRegistry,
): UseAvailablePlayersReturn {
    const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { on } = useSocket();

    // Connect to socket.io server
    useEffect(() => {
        const unsubscribe = on("userData", async (result) => {
            try {
                if (result.code === 0 && result.user) {
                    // Convert user object to array with uuid
                    const playersArray: AvailablePlayer[] = Object.entries(
                        result.user,
                    ).map(([uid, userData]: [string, any]) => {
                        // Check playerRegistry for name if userData.name is missing or Unknown
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
                    console.warn("No user data received");
                    setAvailablePlayers([]);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to process available players:", error);
                setAvailablePlayers([]);
                setIsLoading(false);
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [on, playerRegistry]);

    return {
        availablePlayers,
        isLoading
    };
}
