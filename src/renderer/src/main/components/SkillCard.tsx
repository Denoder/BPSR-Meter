import React, { useState, memo } from "react";
import { formatStat } from "../../shared/utils/formatters";
import type { SkillData } from "../hooks/useDataFetching";

export interface SkillCardProps {
    skillId: string;
    skill: SkillData;
    uid: string;
    startTime: number;
    t: (key: string, fallback?: string | null) => string;
    translateSkill: (
        skillId: number | string,
        fallback?: string | null,
    ) => string;
}

function SkillCardComponent({
    skillId,
    skill,
    uid,
    startTime,
    t,
    translateSkill,
}: SkillCardProps): React.JSX.Element {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    // Calculate skill DPS
    const duration = (Date.now() - startTime) / 1000;
    const skillDPS = duration > 0 ? skill.totalDamage / duration : 0;
    const avgDamage = skill.totalCount > 0 ? skill.totalDamage / skill.totalCount : 0;

    // Translate skill name
    const translatedSkillName = translateSkill(skillId, skill.displayName);
    const skillTypeText = skill.type === "伤害" ? t("ui.skills.damage") : t("ui.skills.healing");
    const skillTypeClass = skill.type === "伤害" ? "damage" : "healing";

    // Calculate crit values
    const critDmg =
        (skill.damageBreakdown?.critical || 0) +
        (skill.damageBreakdown?.crit_lucky || 0);
    const critCount =
        (skill.countBreakdown?.critical || 0) +
        (skill.countBreakdown?.crit_lucky || 0);
    const avgCritDmg = critCount > 0 ? critDmg / critCount : 0;

    return (
        <div
            className={`skill-card ${isCollapsed ? "collapsed" : ""}`}
            data-skill-id={skillId}
            data-uid={uid}
        >
            <div
                className="skill-header"
                data-collapsible="skill"
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ cursor: "pointer" }}
            >
                <div
                    className="skill-header-left"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <svg
                        className="collapse-icon"
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        style={{
                            transform: isCollapsed
                                ? "rotate(-90deg)"
                                : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span className="skill-name">
                        {translatedSkillName} ({skillId})
                    </span>
                </div>
                <span className={`skill-type ${skillTypeClass}`}>
                    {skillTypeText}
                </span>
            </div>

            <div
                className="skill-stats"
                style={{ display: isCollapsed ? "none" : "grid" }}
            >
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.skills.total")}
                    </span>
                    <span className="skill-stat-value">
                        {formatStat(skill.totalDamage)}
                    </span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.stats.dps")}
                    </span>
                    <span className="skill-stat-value">
                        {formatStat(skillDPS)}
                    </span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.skills.count")}
                    </span>
                    <span className="skill-stat-value">{skill.totalCount}</span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.skills.avg")}
                    </span>
                    <span className="skill-stat-value">
                        {formatStat(avgDamage)}
                    </span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.stats.critPercent")}
                    </span>
                    <span className="skill-stat-value">
                        {Math.round(skill.critRate * 100)}%
                    </span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.stats.critDmg")}
                    </span>
                    <span className="skill-stat-value">
                        {formatStat(critDmg)}
                    </span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.stats.avgCritDmg")}
                    </span>
                    <span className="skill-stat-value">
                        {formatStat(avgCritDmg)}
                    </span>
                </div>
                <div className="skill-stat">
                    <span className="skill-stat-label">
                        {t("ui.stats.luckyPercent")}
                    </span>
                    <span className="skill-stat-value">
                        {Math.round(skill.luckyRate * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export const SkillCard = memo(SkillCardComponent, (prevProps, nextProps) => {
    return (
        prevProps.skillId === nextProps.skillId &&
        prevProps.skill.totalDamage === nextProps.skill.totalDamage &&
        prevProps.skill.totalCount === nextProps.skill.totalCount &&
        prevProps.startTime === nextProps.startTime
    );
});

SkillCard.displayName = "SkillCard";
