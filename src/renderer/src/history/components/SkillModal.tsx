import React from "react";
import { formatStat } from "../../shared/utils/formatters";
import type { HistoryPlayerSkills } from "../types";

export interface SkillModalProps {
    playerSkills: HistoryPlayerSkills | null;
    isLoading: boolean;
    onClose: () => void;
    getPlayerName: (uid: string, currentName: string) => string;
    translateSkill: (skillId: string, fallback: string) => string;
    t: (key: string, fallback?: string | null) => string;
}

export function SkillModal({
    playerSkills,
    isLoading,
    onClose,
    getPlayerName,
    translateSkill,
    t,
}: SkillModalProps): React.JSX.Element {
    const isOpen = playerSkills !== null || isLoading;

    if (!isOpen) {
        return <></>;
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            id="skill-modal"
            className="modal"
            style={{ display: isOpen ? "flex" : "none" }}
            onClick={handleBackdropClick}
        >
            <div className="modal-content">
                <div className="modal-header">
                    <h3 id="skill-modal-title">
                        {playerSkills
                            ? `${getPlayerName(String(playerSkills.uid), playerSkills.name)} - ${t("ui.titles.skillBreakdown","Skill Breakdown")}`
                            : t("ui.messages.loading","Loading...")}
                    </h3>
                    <button
                        id="close-skill-modal"
                        className="control-button"
                        onClick={onClose}
                        title={t("ui.buttons.close")}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div id="skill-modal-body" className="modal-body">
                    {isLoading ? (
                        <div className="loading-indicator">
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            {t("ui.messages.loadingSkills","Loading skills...")}
                        </div>
                    ) : playerSkills ? (
                        <div className="skill-list">
                            {Object.entries(playerSkills.skills)
                                .sort(
                                    (a: any, b: any) =>
                                        b[1].totalDamage - a[1].totalDamage,
                                )
                                .map(([skillId, skill]: [string, any]) => {
                                    const totalDamage = Object.values(
                                        playerSkills.skills,
                                    ).reduce(
                                        (sum: number, s: any) =>
                                            sum + s.totalDamage,
                                        0,
                                    );
                                    const percentage =
                                        totalDamage > 0
                                            ? (skill.totalDamage /
                                                  totalDamage) *
                                              100
                                            : 0;
                                    const critRate =
                                        skill.totalCount > 0
                                            ? (skill.critCount /
                                                  skill.totalCount) *
                                              100
                                            : 0;
                                    const luckyRate =
                                        skill.totalCount > 0
                                            ? (skill.luckyCount /
                                                  skill.totalCount) *
                                              100
                                            : 0;
                                    const translatedName = translateSkill(
                                        skillId,
                                        skill.displayName,
                                    );

                                    return (
                                        <div
                                            key={skillId}
                                            className="skill-item"
                                        >
                                            <div className="skill-header">
                                                <div className="skill-name">
                                                    {translatedName}
                                                </div>
                                                <div className="skill-damage">
                                                    {formatStat(
                                                        skill.totalDamage,
                                                    )}
                                                </div>
                                            </div>
                                            <div className="skill-details">
                                                <div className="skill-detail">
                                                    <span className="detail-label">
                                                        {t("ui.stats.percentDmg","Share")}
                                                    </span>
                                                    <span className="detail-value">
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="skill-detail">
                                                    <span className="detail-label">
                                                        {t("ui.skills.count","Hits")}
                                                    </span>
                                                    <span className="detail-value">
                                                        {skill.totalCount.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="skill-detail">
                                                    <span className="detail-label">
                                                        {t("ui.stats.critPercent","Crit")}
                                                    </span>
                                                    <span className="detail-value">
                                                        {critRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="skill-detail">
                                                    <span className="detail-label">
                                                        {t("ui.stats.luckyPercent","Lucky")}
                                                    </span>
                                                    <span className="detail-value">
                                                        {luckyRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="skill-progress">
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="empty-state error">
                            <i
                                className="fa-solid fa-exclamation-triangle"
                                style={{
                                    fontSize: "32px",
                                    color: "#ff6b7a",
                                    marginBottom: "12px",
                                }}
                            ></i>
                            <p>{t("ui.messages.failedToLoadSkills","Failed to load skill breakdown")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
