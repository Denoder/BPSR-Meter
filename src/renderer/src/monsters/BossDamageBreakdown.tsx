import React, { useEffect, useState } from "react";
import { formatStat } from "@shared/utils/formatters";

function formatTTK(seconds: number): string {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }
}

interface SkillBreakdown {
    skillId: number;
    damage: number;
    percentage: number;
}

interface PlayerDamage {
    uid: number;
    name: string;
    damage: number;
    percentage: number;
    skills: SkillBreakdown[];
}

interface DamageBreakdown {
    monsterId: string;
    monsterName?: string;
    totalDamage: number;
    players: PlayerDamage[];
    ttk?: number | null;
}

interface BossDamageBreakdownProps {
    monsterId: string;
    monsterName: string;
    onClose: () => void;
    t: (key: string, fallback?: string) => string;
    translateSkill: (skillId: number) => string;
    preloadedBreakdown?: DamageBreakdown;
}

export default function BossDamageBreakdown({
    monsterId,
    monsterName,
    onClose,
    t,
    translateSkill,
    preloadedBreakdown,
}: BossDamageBreakdownProps): React.JSX.Element {
    const [breakdown, setBreakdown] = useState<DamageBreakdown | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedPlayers, setExpandedPlayers] = useState<Set<number>>(
        new Set(),
    );
    const [skillNames, setSkillNames] = useState<Record<number, string>>({});
    const [isSavingLog, setIsSavingLog] = useState(false);

    const saveLog = async () => {
        if (!breakdown) return;

        try {
            setIsSavingLog(true);
            const response = await fetch("/api/damage-logs/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monsterId,
                    monsterName,
                    breakdown,
                }),
            });

            if (response.ok) {
                alert("Damage log saved successfully!");
            }
        } catch (err) {
            console.error("Failed to save log:", err);
            alert("Failed to save damage log");
        } finally {
            setIsSavingLog(false);
        }
    };

    useEffect(() => {
        const fetchBreakdown = async () => {
            if (preloadedBreakdown) {
                setBreakdown(preloadedBreakdown);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const response = await fetch(
                    `/api/monster-damage/${monsterId}`,
                );
                const json = await response.json();

                if (json && json.code === 0 && json.data) {
                    setBreakdown(json.data);

                    const allSkillIds = new Set<number>();
                    json.data.players.forEach((player: PlayerDamage) => {
                        player.skills.forEach((skill) => {
                            allSkillIds.add(skill.skillId);
                        });
                    });

                    const names: Record<number, string> = {};
                    for (const skillId of allSkillIds) {
                        const skillName = translateSkill(skillId);
                        names[skillId] = skillName;
                    }
                    setSkillNames(names);
                } else {
                    setError("Failed to load damage breakdown");
                }
            } catch (err) {
                console.error("Error fetching monster damage breakdown:", err);
                setError(String(err));
            } finally {
                setIsLoading(false);
            }
        };

        fetchBreakdown();
    }, [monsterId]);

    const togglePlayer = (uid: number) => {
        setExpandedPlayers((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) {
                newSet.delete(uid);
            } else {
                newSet.add(uid);
            }
            return newSet;
        });
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "rgba(20, 20, 30, 0.95)",
                    borderRadius: "8px",
                    padding: "24px",
                    maxWidth: "800px",
                    width: "90%",
                    maxHeight: "80vh",
                    overflow: "auto",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#fff" }}>
                        {t("ui.messages.damageBreakdown", "Damage Breakdown")}:{" "}
                        {monsterName}
                    </h2>
                    <div style={{ display: "flex", gap: "8px" }}>
                        {/* Allow saving logs for any tracked monster (bosses or enabled monsters) */}
                        <button
                            onClick={saveLog}
                            disabled={isSavingLog}
                            style={{
                                background: isSavingLog
                                    ? "rgba(149, 165, 166, 0.2)"
                                    : "rgba(46, 204, 113, 0.2)",
                                border: `1px solid ${isSavingLog ? "rgba(149, 165, 166, 0.5)" : "rgba(46, 204, 113, 0.5)"}`,
                                color: isSavingLog ? "#95a5a6" : "#2ecc71",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                cursor: isSavingLog ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                fontWeight: 600,
                            }}
                        >
                            <i
                                className={`fa-solid ${isSavingLog ? "fa-spinner fa-spin" : "fa-save"}`}
                                style={{ marginRight: "6px" }}
                            ></i>
                            {isSavingLog ? "Saving..." : "Save Log"}
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: "rgba(231, 76, 60, 0.2)",
                                border: "1px solid rgba(231, 76, 60, 0.5)",
                                color: "#e74c3c",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px",
                            }}
                        >
                            {t("ui.buttons.close")}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "rgba(255, 255, 255, 0.6)",
                        }}
                    >
                        {t("ui.messages.loading")}
                    </div>
                ) : error ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "#e74c3c",
                        }}
                    >
                        {error}
                    </div>
                ) : breakdown ? (
                    <div>
                        <div
                            style={{
                                display: "flex",
                                gap: "16px",
                                marginBottom: "24px",
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    padding: "16px",
                                    background: "rgba(52, 152, 219, 0.1)",
                                    borderRadius: "4px",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "rgba(255, 255, 255, 0.7)",
                                        marginBottom: "8px",
                                    }}
                                >
                                    {t(
                                        "ui.messages.totalDamageDealt",
                                        "Total Damage Dealt",
                                    )}
                                </div>
                                <div
                                    style={{
                                        fontSize: "28px",
                                        fontWeight: "bold",
                                        color: "#3498db",
                                    }}
                                >
                                    {formatStat(breakdown.totalDamage)}
                                </div>
                            </div>

                            {breakdown.ttk !== null &&
                                breakdown.ttk !== undefined && (
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: "16px",
                                            background:
                                                "rgba(46, 204, 113, 0.1)",
                                            borderRadius: "4px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "14px",
                                                color: "rgba(255, 255, 255, 0.7)",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            {t("ui.messages.ttk", "TTK")}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "28px",
                                                fontWeight: "bold",
                                                color:
                                                    breakdown.ttk < 30
                                                        ? "#2ecc71"
                                                        : breakdown.ttk < 60
                                                          ? "#f39c12"
                                                          : "#e74c3c",
                                            }}
                                        >
                                            {formatTTK(breakdown.ttk)}
                                        </div>
                                    </div>
                                )}
                        </div>

                        {breakdown.players.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "40px",
                                    color: "rgba(255, 255, 255, 0.6)",
                                }}
                            >
                                {t(
                                    "ui.messages.noDamageData",
                                    "No damage data available",
                                )}
                            </div>
                        ) : (
                            <div>
                                <h3
                                    style={{
                                        fontSize: "16px",
                                        marginBottom: "12px",
                                        color: "rgba(255, 255, 255, 0.9)",
                                    }}
                                >
                                    {t(
                                        "ui.messages.topContributors",
                                        "Top Contributors",
                                    )}
                                </h3>
                                {breakdown.players.map((player, index) => (
                                    <div
                                        key={player.uid}
                                        style={{
                                            marginBottom: "8px",
                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                            borderRadius: "4px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: "12px",
                                                background: expandedPlayers.has(
                                                    player.uid,
                                                )
                                                    ? "rgba(255, 255, 255, 0.05)"
                                                    : "rgba(255, 255, 255, 0.02)",
                                                cursor: "pointer",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                            onClick={() =>
                                                togglePlayer(player.uid)
                                            }
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    flex: 1,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "24px",
                                                        height: "24px",
                                                        borderRadius: "50%",
                                                        background:
                                                            index === 0
                                                                ? "#f39c12"
                                                                : index === 1
                                                                  ? "#95a5a6"
                                                                  : index === 2
                                                                    ? "#cd7f32"
                                                                    : "rgba(255, 255, 255, 0.1)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        fontSize: "12px",
                                                        fontWeight: "bold",
                                                        color: "#fff",
                                                    }}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: "bold",
                                                            color: "#fff",
                                                        }}
                                                    >
                                                        {player.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "rgba(255, 255, 255, 0.6)",
                                                        }}
                                                    >
                                                        {formatStat(
                                                            player.damage,
                                                        )}{" "}
                                                        (
                                                        {player.percentage.toFixed(
                                                            1,
                                                        )}
                                                        %)
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        width: "100px",
                                                        height: "8px",
                                                        background:
                                                            "rgba(255, 255, 255, 0.1)",
                                                        borderRadius: "4px",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: `${player.percentage}%`,
                                                            height: "100%",
                                                            background: `linear-gradient(90deg, #3498db, #2ecc71)`,
                                                        }}
                                                    />
                                                </div>
                                                <i
                                                    className={`fa-solid fa-chevron-${expandedPlayers.has(player.uid) ? "up" : "down"}`}
                                                    style={{
                                                        color: "rgba(255, 255, 255, 0.5)",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {expandedPlayers.has(player.uid) &&
                                            player.skills.length > 0 && (
                                                <div
                                                    style={{
                                                        padding: "12px",
                                                        background:
                                                            "rgba(0, 0, 0, 0.2)",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "rgba(255, 255, 255, 0.7)",
                                                            marginBottom: "8px",
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        {t(
                                                            "ui.messages.skillBreakdown",
                                                            "Skill Breakdown",
                                                        )}
                                                    </div>
                                                    {player.skills.map(
                                                        (skill) => (
                                                            <div
                                                                key={
                                                                    skill.skillId
                                                                }
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    justifyContent:
                                                                        "space-between",
                                                                    alignItems:
                                                                        "center",
                                                                    padding:
                                                                        "6px 0",
                                                                    fontSize:
                                                                        "13px",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        color: "rgba(255, 255, 255, 0.8)",
                                                                    }}
                                                                >
                                                                    {skillNames[
                                                                        skill
                                                                            .skillId
                                                                    ] ||
                                                                        `Skill ${skill.skillId}`}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: "8px",
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            color: "#2ecc71",
                                                                            fontWeight:
                                                                                "bold",
                                                                        }}
                                                                    >
                                                                        {formatStat(
                                                                            skill.damage,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            color: "rgba(255, 255, 255, 0.5)",
                                                                            fontSize:
                                                                                "11px",
                                                                        }}
                                                                    >
                                                                        (
                                                                        {skill.percentage.toFixed(
                                                                            1,
                                                                        )}
                                                                        %)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
