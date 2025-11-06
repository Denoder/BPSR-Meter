import React from "react";
import { BOSS_SPAWN_CONFIGS, SpawnType, getNextSpawnTime, formatTimeUntilSpawn } from "./bossSpawnTimes";
import { useTranslations } from "../shared/hooks/useTranslations";

interface BossScheduleProps {
    translatedNames: Record<number, string>;
}

export default function BossSchedule({ translatedNames }: BossScheduleProps): React.JSX.Element {
    const { t } = useTranslations();
    
    return (
        <div className="monsters-container">
            <div className="text-lg font-bold mb-4 text-center" style={{ color: "#3498db" }}>
                {t("ui.titles.bossSchedule")}
            </div>

            {/* On The Hour Spawns */}
            <div className="mb-6">
                <div className="text-sm font-semibold mb-2" style={{ color: "#2ecc71" }}>
                    {t("ui.messages.everyHour")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(() => {
                        const config = BOSS_SPAWN_CONFIGS.find(c => c.spawnType === SpawnType.ON_THE_HOUR);
                        if (!config) return null;

                        const uniqueBosses = new Map<string, string>();
                        config.monsterIds.forEach(id => {
                            const name = translatedNames[Number(id)] || `Boss ${id}`;
                            if (!uniqueBosses.has(name)) {
                                uniqueBosses.set(name, id);
                            }
                        });

                        return Array.from(uniqueBosses.entries()).map(([name, id]) => {
                            const spawnInfo = getNextSpawnTime(id);
                            return (
                                <div key={name} className="p-2 rounded text-xs" style={{ background: "rgba(255,255,255,0.05)" }}>
                                    <div className="font-semibold mb-1">{name}</div>
                                    {spawnInfo && (
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                                            {t("ui.messages.next")}: {spawnInfo.time} ({formatTimeUntilSpawn(spawnInfo.secondsUntil)})
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Half Hour Spawns */}
            <div className="mb-6">
                <div className="text-sm font-semibold mb-2" style={{ color: "#f39c12" }}>
                    {t("ui.messages.everyHalfHour")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(() => {
                        const config = BOSS_SPAWN_CONFIGS.find(c => c.spawnType === SpawnType.HALF_HOUR);
                        if (!config) return null;

                        const uniqueBosses = new Map<string, string>();
                        config.monsterIds.forEach(id => {
                            const name = translatedNames[Number(id)] || `Boss ${id}`;
                            if (!uniqueBosses.has(name)) {
                                uniqueBosses.set(name, id);
                            }
                        });

                        return Array.from(uniqueBosses.entries()).map(([name, id]) => {
                            const spawnInfo = getNextSpawnTime(id);
                            return (
                                <div key={name} className="p-2 rounded text-xs" style={{ background: "rgba(255,255,255,0.05)" }}>
                                    <div className="font-semibold mb-1">{name}</div>
                                    {spawnInfo && (
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                                            {t("ui.messages.next")}: {spawnInfo.time} ({formatTimeUntilSpawn(spawnInfo.secondsUntil)})
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Specific Times Spawns */}
            <div className="mb-4">
                <div className="text-sm font-semibold mb-2" style={{ color: "#e74c3c" }}>
                    {t("ui.messages.specificTimes", "Specific Times (10:00, 14:00, 18:00 UTC-2)")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(() => {
                        const config = BOSS_SPAWN_CONFIGS.find(c => c.spawnType === SpawnType.SPECIFIC_TIMES);
                        if (!config) return null;

                        const uniqueBosses = new Map<string, string>();
                        config.monsterIds.forEach(id => {
                            const name = translatedNames[Number(id)] || `Boss ${id}`;
                            if (!uniqueBosses.has(name)) {
                                uniqueBosses.set(name, id);
                            }
                        });

                        return Array.from(uniqueBosses.entries()).map(([name, id]) => {
                            const spawnInfo = getNextSpawnTime(id);
                            return (
                                <div key={name} className="p-2 rounded text-xs" style={{ background: "rgba(255,255,255,0.05)" }}>
                                    <div className="font-semibold mb-1">{name}</div>
                                    {spawnInfo && (
                                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                                            {t("ui.messages.next")}: {spawnInfo.time} ({formatTimeUntilSpawn(spawnInfo.secondsUntil)})
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}
