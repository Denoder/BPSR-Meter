import React, { useEffect, useState } from "react";
import type { ApiResponse } from "../shared/types";
import { translateForLang } from "../shared/utils/translations";
import { useTranslations } from "../shared/hooks/useTranslations";
import { useWindowControls, useSocket } from "../shared/hooks";
import MonstersHeader from "./MonstersHeader";
import SortDropdown from "./SortDropdown";

interface MonsterEntry {
    name?: string | null;
    hp?: number | null;
    max_hp?: number | null;
    monster_id?: number | null;
    last_seen?: number | null;
}

export default function MonstersApp(): React.JSX.Element {
    const [monsters, setMonsters] = useState<Record<string, MonsterEntry>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<"id" | "name" | "hp">("hp");
    const [sortDesc, setSortDesc] = useState<boolean>(true);
    const [zhNames, setZhNames] = useState<Record<number, string>>({});

    const { scale, zoomIn, zoomOut, handleDragStart, handleClose, isDragging } = useWindowControls({
        baseWidth: 560,
        baseHeight: 420,
        windowType: "monsters",
    });

    const { t } = useTranslations();
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
        let mounted = true;

        const unsubscribe = on("monsterData", (data: ApiResponse) => {
            if (!mounted) return;

            try {
                // @ts-ignore
                if (data && data.enemy) {
                    // @ts-ignore
                    const incoming: Record<string, MonsterEntry> = data.enemy || {};

                    const filtered = Object.fromEntries(
                        Object.entries(incoming).filter(([_id, entry]) => {
                            if (!entry) return false;
                            const hp = entry.hp;
                            if (typeof hp !== "number") return true;
                            return hp >= 0;
                        }),
                    ) as Record<string, MonsterEntry>;
                    setMonsters(filtered);

                    (async () => {
                        try {
                            const missingIds = new Set<number>();
                            for (const [id, entry] of Object.entries(filtered)) {
                                const mid = (entry as any).monster_id;
                                const hasName = entry && entry.name && entry.name !== "Unknown";
                                if (!hasName && mid) missingIds.add(Number(mid));
                            }
                            if (missingIds.size === 0) return;

                            const newZh: Record<number, string> = {};
                            for (const mid of missingIds) {
                                const key = `monsters.${mid}`;
                                const zh = await translateForLang("zh", key, null);
                                if (zh) newZh[mid] = zh;
                            }
                            if (Object.keys(newZh).length > 0) {
                                setZhNames((s) => ({ ...s, ...newZh }));
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
            // Only resize if not currently dragging
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
            <MonstersHeader onClose={handleClose} onDragStart={handleDragStart} onZoomIn={zoomIn} onZoomOut={zoomOut} />
            {isLoading ? (
                <div>Loading...</div>
            ) : error ? (
                <div style={{ color: "#f88" }}>Error: {error}</div>
            ) : (
                <div className="monsters-container">
                    <div className="flex justify-between items-center mb-2 gap-2">
                        <div className="text-sm font-semibold">Monsters ({Object.keys(monsters).length})</div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs">Sort:</label>
                            <div className="min-w-[140px]">
                                <SortDropdown value={sortKey} onChange={(v) => setSortKey(v as any)} />
                            </div>
                            <button onClick={() => setSortDesc((s) => !s)} className="p-1">{sortDesc ? "Desc" : "Asc"}</button>
                        </div>
                    </div>

                    <table className="monsters-table w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-1">ID</th>
                                <th className="text-left p-1">Name</th>
                                <th className="text-right p-1">HP</th>
                                <th className="text-right p-1">Max HP</th>
                                <th className="text-right p-1">HP %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(monsters)
                                .map(([id, m]) => ({ id, ...m }))
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
                                    // id
                                    const ai = Number(a.id);
                                    const bi = Number(b.id);
                                    return sortDesc ? bi - ai : ai - bi;
                                })
                                .map((m) => {
                                    const displayName = `${t(`monsters.${m.monster_id}`, m?.name ?? "Unknown")} (${m.monster_id})`;
                                    const pct = m.max_hp && m.hp ? Math.max(0, Math.min(1, (m.hp / m.max_hp))) : null;
                                    return (
                                        <tr key={m.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                            <td className="p-2">{m.id}</td>
                                            <td className="p-2">{displayName}</td>
                                            <td className="p-2 text-right">{m?.hp ?? "-"}</td>
                                            <td className="p-2 text-right">{m?.max_hp ?? "-"}</td>
                                            <td className="p-2 text-right min-w-[160px]">
                                                {pct === null ? (
                                                    "-"
                                                ) : (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", height: 10, borderRadius: 6, overflow: "hidden" }}>
                                                            <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: pct > 0.6 ? "#2ecc71" : pct > 0.3 ? "#f1c40f" : "#e74c3c" }} />
                                                        </div>
                                                        <div style={{ minWidth: 48, textAlign: "right", fontSize: 12 }}>{Math.round(pct * 100)}%</div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                    {Object.keys(monsters).length === 0 && <div style={{ marginTop: 8 }}>No monsters found.</div>}
                </div>
            )}
        </div>
    );
}
