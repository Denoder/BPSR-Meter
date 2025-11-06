import React, { useEffect, useState, useRef } from "react";
import type { ApiResponse } from "../shared/types";
import { translateForLang } from "../shared/utils/translations";
import { useTranslations } from "../shared/hooks/useTranslations";
import { useWindowControls, useSocket } from "../shared/hooks";
import MonstersHeader from "./MonstersHeader";
import MonsterList from "./MonsterList";
import BossSchedule from "./BossSchedule";
import { BOSS_SPAWN_CONFIGS } from "./bossSpawnTimes";
import { monsterRespawnTracker } from "./monsterRespawnTracker";

interface MonsterEntry {
    name?: string | null;
    hp?: number | null;
    max_hp?: number | null;
    monster_id?: number | null;
    last_seen?: number | null;
    position?: { x: number; y: number; z: number } | null;
    distance?: number | null;
    direction?: string | null;
}

interface MonsterData extends ApiResponse {
    enemy: Record<string, MonsterEntry>;
}

export default function MonstersApp(): React.JSX.Element {
    const [monsters, setMonsters] = useState<Record<string, MonsterEntry>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<"id" | "name" | "hp" | "distance">("distance");
    const [sortDesc, setSortDesc] = useState<boolean>(false);
    const [translatedNames, setTranslatedNames] = useState<Record<number, string>>({});
    const [bossOnlyMode, setBossOnlyMode] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [activeTab, setActiveTab] = useState<"monsters" | "schedule">("monsters");
    const previousMonstersRef = useRef<Record<string, MonsterEntry>>({});

    const { scale, zoomIn, zoomOut, handleDragStart, handleClose, isDragging } = useWindowControls({
        baseWidth: 560,
        baseHeight: 420,
        windowType: "monsters",
    });

    const { t, currentLanguage } = useTranslations();
    const { on } = useSocket();

    useEffect(() => {
        try {
            const disableTransparency = localStorage.getItem("disableTransparency") === "true";
            document.body.style.backgroundColor = disableTransparency ? "#000" : "transparent";
        } catch (err) {
            console.warn("Failed to apply transparency setting", err);
        }

        try {
            const listener = window.electronAPI.onTransparencySettingChanged?.((isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";
            });
            return listener;
        } catch (err) {
            console.warn("Failed to setup transparency listener", err);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab !== "schedule") return;

        const loadBossNames = async () => {
            try {
                const allBossIds = new Set<number>();
                BOSS_SPAWN_CONFIGS.forEach(config => {
                    config.monsterIds.forEach(id => allBossIds.add(Number(id)));
                });

                const newNames: Record<number, string> = {};
                for (const mid of allBossIds) {
                    const key = `monsters.${mid}`;
                    const translatedName = await translateForLang(currentLanguage, key, null);
                    if (translatedName) newNames[mid] = translatedName;
                }

                if (Object.keys(newNames).length > 0) {
                    setTranslatedNames(newNames);
                }
            } catch (e) {
                console.warn("Failed to load boss names:", e);
            }
        };

        loadBossNames();
    }, [activeTab, currentLanguage]);

    useEffect(() => {
        let mounted = true;

        const unsubscribe = on("monsterData", (data: MonsterData) => {
            if (!mounted) return;

            try {
                if (data && data.enemy) {
                    const incoming: Record<string, MonsterEntry> = data.enemy || {};

                    // Filter out invalid entries
                    const filtered = Object.fromEntries(
                        Object.entries(incoming).filter(([_id, entry]) => {
                            if (!entry) return false;
                            const hp = entry.hp;
                            if (typeof hp !== "number") return true;
                            return hp >= 0;
                        }),
                    );

                    // Track monster deaths and respawns
                    const previousMonsters = previousMonstersRef.current;
                    for (const [uid, monster] of Object.entries(filtered)) {
                        const previousMonster = previousMonsters[uid];
                        const monsterId = monster.monster_id?.toString();
                        
                        if (monsterId) {
                            if (monster.hp && monster.hp > 0) {
                                if (!previousMonster || previousMonster.hp === 0 || previousMonster.hp === null) {
                                    monsterRespawnTracker.recordRespawn(uid, monsterId);
                                }
                            }
                            else if (monster.hp === 0 && previousMonster && previousMonster.hp && previousMonster.hp > 0) {
                                monsterRespawnTracker.recordDeath(uid, monsterId);
                            }
                        }
                    }

                    previousMonstersRef.current = filtered;
                    
                    setMonsters(filtered);

                    // Load missing translations
                    (async () => {
                        try {
                            const missingIds = new Set<number>();
                            for (const [id, entry] of Object.entries(filtered)) {
                                const mid = (entry as any).monster_id;
                                const hasName = entry && entry.name && entry.name !== "Unknown";
                                if (!hasName && mid) missingIds.add(Number(mid));
                            }
                            if (missingIds.size === 0) return;

                            const newNames: Record<number, string> = {};
                            for (const mid of missingIds) {
                                const key = `monsters.${mid}`;
                                const translatedName = await translateForLang(currentLanguage, key, null);
                                if (translatedName) newNames[mid] = translatedName;
                            }
                            if (Object.keys(newNames).length > 0) {
                                setTranslatedNames((s) => ({ ...s, ...newNames }));
                            }
                        } catch (e) {
                        }
                    })();
                } else {
                    setMonsters({});
                }
                setIsLoading(false);
            } catch (err: any) {
                console.error("Failed to process monster data", err);
                if (mounted) setError(String(err));
            }
        });

        return () => {
            mounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, [on]);

    useEffect(() => {
        let debounceTimer: number | null = null;

        const resizeIfNeeded = (width: number, height: number) => {
            if (!isDragging) {
                window.electronAPI.resizeWindowToContent("monsters", width, height, scale);
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

        const el = document.querySelector(".monsters-window");
        if (el) observer.observe(el);

        return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer);
            observer.disconnect();
        };
    }, [isDragging, scale]);

    return (
        <div className="monsters-window pointer-events-auto">
            <MonstersHeader onClose={handleClose} onDragStart={handleDragStart} onZoomIn={zoomIn} onZoomOut={zoomOut} t={t} />

            {/* Tab Navigation */}
            <div className="flex gap-1 p-2 pb-0 mb-2">
                <button
                    onClick={() => setActiveTab("monsters")}
                    className="px-4 py-2 text-sm font-semibold rounded"
                    style={{
                        background: activeTab === "monsters" ? "rgba(52, 152, 219, 0.3)" : "rgba(255,255,255,0.05)",
                        color: activeTab === "monsters" ? "#3498db" : "rgba(255,255,255,0.6)"
                    }}
                >
                    {t("ui.titles.monsterList")}
                </button>
                <button
                    onClick={() => setActiveTab("schedule")}
                    className="px-4 py-2 text-sm font-semibold rounded"
                    style={{
                        background: activeTab === "schedule" ? "rgba(52, 152, 219, 0.3)" : "rgba(255,255,255,0.05)",
                        color: activeTab === "schedule" ? "#3498db" : "rgba(255,255,255,0.6)",
                    }}
                >
                    {t("ui.titles.bossSchedule")}
                </button>
            </div>

            {isLoading ? (
                <div>{t("ui.messages.loading")}</div>
            ) : error ? (
                <div style={{ color: "#f88" }}>Error: {error}</div>
            ) : activeTab === "monsters" ? (
                <MonsterList
                    monsters={monsters}
                    bossOnlyMode={bossOnlyMode}
                    setBossOnlyMode={setBossOnlyMode}
                    sortKey={sortKey}
                    setSortKey={setSortKey}
                    sortDesc={sortDesc}
                    setSortDesc={setSortDesc}
                    t={t}
                />
            ) : (
                <BossSchedule translatedNames={translatedNames} />
            )}
        </div>
    );
}
