import { useState, useEffect, useCallback, useRef } from "react";
import type { ViewMode, SortColumn, SortDirection, ManualGroupState } from "../../shared/types";
import { useSocket } from "../../shared/hooks";

export interface PlayerUser {
    uid: number;
    name: string;
    profession: string;
    total_damage: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        hpLessen: number;
        total: number;
    };
    total_count: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        total: number;
    };
    total_healing: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        hpLessen: number;
        total: number;
    };
    taken_damage: number;
    total_dps: number;
    total_hps: number;
    realtime_dps_max: number;
    hp: number;
    max_hp: number;
    fightPoint: number;
    damagePercent?: number;
}

export interface SkillData {
    displayName: string;
    type: string;
    elementype: string;
    totalDamage: number;
    totalCount: number;
    critCount: number;
    luckyCount: number;
    critRate: number;
    luckyRate: number;
    damageBreakdown: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        hpLessen: number;
        total: number;
    };
    countBreakdown: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        total: number;
    };
}

export interface SkillsDataByUser {
    [uid: string]: {
        uid: number;
        name: string;
        profession: string;
        skills: {
            [skillId: string]: SkillData;
        };
    };
}

export interface UseDataFetchingOptions {
    viewMode: ViewMode;
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    manualGroupState: ManualGroupState | null;
    onServerReset?: () => void;
    showAllPlayers?: boolean;
}

export interface UseDataFetchingReturn {
    players: PlayerUser[];
    skillsData: SkillsDataByUser | null;
    localUid: number | null;
    isLoading: boolean;
    isPaused: boolean;
    togglePause: () => Promise<void>;
    startTime: number;
}

export function useDataFetching(
    options: UseDataFetchingOptions,
): UseDataFetchingReturn {
    const {
        viewMode,
        sortColumn,
        sortDirection,
        manualGroupState,
        onServerReset,
        showAllPlayers,
    } = options;

    const [players, setPlayers] = useState<PlayerUser[]>([]);
    const [skillsData, setSkillsData] = useState<SkillsDataByUser | null>(null);
    const [localUid, setLocalUid] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [startTime, setStartTime] = useState<number>(Date.now());

    const lastStartTimeRef = useRef<number>(0);
    const lastTotalDamageRef = useRef<number>(0);
    const { on, emitWithResponse } = useSocket();

    useEffect(() => {
        const syncPauseState = async () => {
            try {
                const json = await emitWithResponse({ event: "getPauseState" });
                if (json && typeof json.paused === "boolean") {
                    setIsPaused(json.paused);
                }
            } catch (err) {
                console.error("Failed to fetch server pause state:", err);
            }
        };

        syncPauseState();
    }, [emitWithResponse]);

    const togglePause = useCallback(async () => {
        const newPausedState = !isPaused;
        setIsPaused(newPausedState);

        try {
            const json = await emitWithResponse({ event: "togglePause", data: { paused: newPausedState } });

            if (json && typeof json.paused === "boolean") {
                setIsPaused(json.paused);
            }
        } catch (err) {
            console.error("Failed to update server pause state:", err);
        }
    }, [isPaused, emitWithResponse]);

    useEffect(() => {
        const unsubscribeUserData = on("userData", async (userData) => {
            try {
                if (userData && userData.code === 0) {
                    if (
                        userData.startTime &&
                        userData.startTime !== lastStartTimeRef.current
                    ) {
                        console.log("Server reset detected. Clearing local state.");
                        lastStartTimeRef.current = userData.startTime;
                        lastTotalDamageRef.current = 0;
                        onServerReset?.();
                    }

                    if (viewMode === "skills") {
                        return;
                    }

                    let userArray: PlayerUser[] = Object.entries(userData.user).map(
                        ([uid, data]: [string, any]) => ({
                            ...data,
                            uid: parseInt(uid, 10),
                        }),
                    );

                    if (viewMode === "solo" && localUid !== null) {
                        userArray = userArray.filter((u: PlayerUser) => u.uid === localUid);
                    }

                    userArray = userArray.filter(
                        (u: PlayerUser) =>
                            (u.total_damage && u.total_damage.total > 0) ||
                            u.taken_damage > 0 ||
                            (u.total_healing && u.total_healing.total > 0),
                    );

                    if (
                        manualGroupState &&
                        manualGroupState.enabled &&
                        manualGroupState.members &&
                        manualGroupState.members.length > 0
                    ) {
                        const groupUids = manualGroupState.members;
                        userArray = userArray.filter((u: PlayerUser) =>
                            groupUids.includes(String(u.uid)),
                        );
                    }

                    if (!userArray || userArray.length === 0) {
                        setPlayers([]);
                        setIsLoading(true);
                        return;
                    }

                    setIsLoading(false);

                    const sumaTotalDamage = userArray.reduce(
                        (acc: number, u: PlayerUser) =>
                            acc +
                            (u.total_damage && u.total_damage.total
                                ? Number(u.total_damage.total)
                                : 0),
                        0,
                    );

                    if (sumaTotalDamage !== lastTotalDamageRef.current) {
                        lastTotalDamageRef.current = sumaTotalDamage;
                    }

                    userArray.forEach((u: PlayerUser) => {
                        const userDamage =
                            u.total_damage && u.total_damage.total
                                ? Number(u.total_damage.total)
                                : 0;
                        u.damagePercent =
                            sumaTotalDamage > 0
                                ? Math.max(
                                      0,
                                      Math.min(
                                          100,
                                          (userDamage / sumaTotalDamage) * 100,
                                      ),
                                  )
                                : 0;
                    });

                    sortUserArray(userArray, sortColumn, sortDirection);

                    let finalArray = userArray;
                    if (viewMode === "nearby") {
                        if (showAllPlayers) {
                            finalArray = userArray;
                        } else {
                            const top10 = userArray.slice(0, 10);
                            const isLocalInTop10 = localUid
                                ? top10.some((u: PlayerUser) => u.uid === localUid)
                                : false;

                            if (userArray.length > 10 && !isLocalInTop10 && localUid) {
                                const localUserExtra = userArray.find(
                                    (u: PlayerUser) => u.uid === localUid,
                                );
                                if (localUserExtra) {
                                    finalArray = [...top10, localUserExtra];
                                } else {
                                    finalArray = top10;
                                }
                            } else {
                                finalArray = top10;
                            }
                        }
                    }

                    setPlayers(finalArray);
                    setStartTime(userData.startTime || Date.now());
                }
            } catch (err) {
                console.error("Failed to process userData:", err);
            }
        });

        const unsubscribeSkillData = on("skillData", async (skillData) => {
            try {
                if (skillData && skillData.code === 0) {
                    setSkillsData(skillData.data.skills);
                    setStartTime(skillData.startTime || Date.now());
                    setIsLoading(
                        Object.keys(skillData.data.skills).length === 0,
                    );
                }
            } catch (err) {
                console.error("Failed to process skillData:", err);
            }
        });

        const unsubscribeSoloUser = on("soloUser", async (soloUserData) => {
            try {
                if (soloUserData && soloUserData.code === 0) {
                    const uidKey = Object.keys(soloUserData.user)[0];
                    if (uidKey) {
                        setLocalUid(parseInt(uidKey, 10));
                    }
                }
            } catch (err) {
                console.error("Failed to process soloUserData:", err);
            }
        });

        return () => {
            if (unsubscribeUserData) unsubscribeUserData();
            if (unsubscribeSkillData) unsubscribeSkillData();
            if (unsubscribeSoloUser) unsubscribeSoloUser();
        };
    }, [on, viewMode, sortColumn, sortDirection, manualGroupState, onServerReset, showAllPlayers, localUid]);

    return {
        players,
        skillsData,
        localUid,
        isLoading,
        isPaused,
        togglePause,
        startTime,
    };
}

function sortUserArray(
    userArray: PlayerUser[],
    sortColumn: SortColumn,
    sortDirection: SortDirection,
): void {
    userArray.sort((a, b) => {
        let aVal: number, bVal: number;

        switch (sortColumn) {
            case "totalDmg":
                aVal = a.total_damage?.total ? Number(a.total_damage.total) : 0;
                bVal = b.total_damage?.total ? Number(b.total_damage.total) : 0;
                break;
            case "totalDmgTaken":
                aVal = Number(a.taken_damage) || 0;
                bVal = Number(b.taken_damage) || 0;
                break;
            case "totalHeal":
                aVal = a.total_healing?.total
                    ? Number(a.total_healing.total)
                    : 0;
                bVal = b.total_healing?.total
                    ? Number(b.total_healing.total)
                    : 0;
                break;
            case "realtimeDps":
                aVal = Number(a.total_dps) || 0;
                bVal = Number(b.total_dps) || 0;
                break;
            default:
                aVal = a.total_damage?.total ? Number(a.total_damage.total) : 0;
                bVal = b.total_damage?.total ? Number(b.total_damage.total) : 0;
        }

        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
}
