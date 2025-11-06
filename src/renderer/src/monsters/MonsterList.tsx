import React from "react";
import SortDropdown from "./SortDropdown";
import { TRACKED_MONSTER_IDS } from "../shared/constants";
import { formatStat } from "../shared/utils/formatters";
import { getNextSpawnTime, formatTimeUntilSpawn } from "./bossSpawnTimes";
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

interface MonsterListProps {
    monsters: Record<string, MonsterEntry>;
    bossOnlyMode: boolean;
    setBossOnlyMode: (value: boolean | ((prev: boolean) => boolean)) => void;
    sortKey: "id" | "name" | "hp" | "distance";
    setSortKey: (value: "id" | "name" | "hp" | "distance") => void;
    sortDesc: boolean;
    setSortDesc: (value: boolean | ((prev: boolean) => boolean)) => void;
    t: (key: string, fallback?: string | null) => string;
}

export default function MonsterList({
    monsters,
    bossOnlyMode,
    setBossOnlyMode,
    sortKey,
    setSortKey,
    sortDesc,
    setSortDesc,
    t
}: MonsterListProps): React.JSX.Element {
    return (
        <div className="monsters-container">
            <div className="flex justify-between items-center mb-2 gap-2">
                <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">
                        {t("ui.messages.monsters")} ({
                            bossOnlyMode
                                ? Object.values(monsters).filter(m => m.monster_id && TRACKED_MONSTER_IDS.has(String(m.monster_id))).length
                                : Object.keys(monsters).length
                        })
                    </div>
                    <button
                        onClick={() => setBossOnlyMode((prev) => !prev)}
                        className="text-xs px-2 py-1 rounded"
                        style={{
                            background: bossOnlyMode ? "#3498db" : "rgba(255,255,255,0.1)",
                            color: bossOnlyMode ? "#fff" : "rgba(255,255,255,0.7)"
                        }}
                    >
                        {bossOnlyMode ? t("ui.buttons.bossesOnly", "Bosses Only") : t("ui.buttons.allMonsters")}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs">{t("ui.buttons.sort", "Sort")}:</label>
                    <div className="min-w-[140px]">
                        <SortDropdown value={sortKey} onChange={(v) => setSortKey(v as any)} />
                    </div>
                    <button
                        onClick={() => setSortDesc((s) => !s)}
                        className="text-xs px-3 py-1 rounded min-w-[50px] uppercase"
                        style={{
                            background: "rgba(255,255,255,0.1)",
                            color: "#fff"
                        }}
                    >
                        {sortDesc ? t("ui.buttons.desc", "Desc ↓") : t("ui.buttons.asc", "Asc ↑")}
                    </button>
                </div>
            </div>

            <table className="monsters-table w-full border-collapse">
                <thead>
                    <tr>
                        <th className="text-left p-1">{t("ui.messages.name")}</th>
                        <th className="text-center p-1">{t("ui.messages.hp")}</th>
                        <th className="text-center p-1">{t("ui.messages.direction")}</th>
                        <th className="text-right p-1 pl-5">{t("ui.messages.distance")}</th>
                        <th className="text-center p-1 pl-5">{t("ui.messages.nextSpawn")}</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(monsters)
                        .map(([id, m]) => ({ id, ...m }))
                        .filter((m) => {
                            if (!bossOnlyMode) return true;
                            return m.monster_id && TRACKED_MONSTER_IDS.has(String(m.monster_id));
                        })
                        .sort((a, b) => {
                            if (sortKey === "hp") {
                                const ah = a.hp ?? -Infinity;
                                const bh = b.hp ?? -Infinity;
                                return sortDesc ? bh - ah : ah - bh;
                            }
                            if (sortKey === "name") {
                                const an = (a.name || "").toString();
                                const bn = (b.name || "").toString();
                                return sortDesc ? bn.localeCompare(an) : an.localeCompare(bn);
                            }
                            if (sortKey === "distance") {
                                const ad = a.distance ?? Infinity;
                                const bd = b.distance ?? Infinity;
                                return sortDesc ? bd - ad : ad - bd;
                            }
                            return 0;
                        })
                        .map((m) => {
                            const displayName = `${t(`monsters.${m.monster_id}`, m?.name ?? "Unknown")}`;
                            const pct = m.max_hp && m.hp ? Math.max(0, Math.min(1, (m.hp / m.max_hp))) : null;
                            const hpPercent = pct !== null ? pct * 100 : 0;
                            const hpColor = hpPercent > 50 ? "#1db954" : hpPercent > 25 ? "#f39c12" : "#e74c3c";
                            const distanceText = m.distance !== null && m.distance !== undefined
                                ? `${m.distance.toFixed(1)}m`
                                : "-";
                            const direction = m.direction ?? "-";

                            let spawnInfo = m.monster_id && TRACKED_MONSTER_IDS.has(String(m.monster_id))
                                ? getNextSpawnTime(String(m.monster_id))
                                : null;

                            let dynamicRespawnTime: number | null = null;
                            if (!spawnInfo && m.monster_id) {
                                const monsterId = String(m.monster_id);
                                if (monsterRespawnTracker.hasRespawnData(monsterId)) {
                                    dynamicRespawnTime = monsterRespawnTracker.getEstimatedRespawnTime(m.id, monsterId);
                                }
                            }

                            return (
                                <tr key={m.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                    <td className="p-2">{displayName}</td>
                                    <td className="p-2 text-center min-w-[160px]">
                                        {pct === null ? (
                                            "-"
                                        ) : (
                                            <div className="hp-bar !h-5" style={{ width: "140px", margin: "0 auto" }}>
                                                <div
                                                    className="hp-fill"
                                                    style={{
                                                        width: `${hpPercent}%`,
                                                        background: hpColor,
                                                    }}
                                                ></div>
                                                <span className="hp-text">
                                                    {formatStat(m.hp || 0)}/{formatStat(m.max_hp || 0)}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 text-center text-xs font-bold" style={{ color: "#3498db" }}>
                                        {direction}
                                    </td>
                                    <td className="p-2 text-right text-xs font-mono">{distanceText}</td>
                                    <td className="p-2 text-center text-xs" style={{
                                        color: spawnInfo && spawnInfo.secondsUntil < 300 ? "#e74c3c" :
                                            spawnInfo && spawnInfo.secondsUntil < 900 ? "#f39c12" :
                                            dynamicRespawnTime !== null && dynamicRespawnTime < 60 ? "#e74c3c" :
                                            dynamicRespawnTime !== null && dynamicRespawnTime < 180 ? "#f39c12" : "#2ecc71",
                                        fontWeight: 600
                                    }}>
                                        {spawnInfo ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                <div>{spawnInfo.time}</div>
                                                <div style={{ fontSize: "10px", opacity: 0.8 }}>
                                                    ({formatTimeUntilSpawn(spawnInfo.secondsUntil)})
                                                </div>
                                            </div>
                                        ) : dynamicRespawnTime !== null ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                <div style={{ fontSize: "10px", opacity: 0.9 }}>~{formatTimeUntilSpawn(dynamicRespawnTime)}</div>
                                            </div>
                                        ) : "-"}
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
            {Object.keys(monsters).length === 0 && <div style={{ marginTop: 8 }}>{t("ui.messages.noMonstersFound")}</div>}
        </div>
    );
}
