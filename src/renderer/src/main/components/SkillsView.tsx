import React, { useState, memo, useMemo } from "react";
import { SkillCard } from "./SkillCard";
import { getProfessionInfo } from "../../shared/utils/professions";
import type { SkillsDataByUser } from "../hooks/useDataFetching";

export interface SkillsViewProps {
    skillsData: SkillsDataByUser;
    startTime: number;
    getPlayerName: (uid: string, currentName: string) => string;
    translateProfession: (profession: string) => string;
    translateSkill: (
        skillId: number | string,
        fallback?: string | null,
    ) => string;
    scope?: "solo" | "nearby";
    t: (key: string, fallback?: string | null) => string;
}

interface PlayerSkillSectionProps {
    uid: string;
    userData: {
        uid: number;
        name: string;
        profession: string;
        skills: any;
    };
    startTime: number;
    getPlayerName: (uid: string, currentName: string) => string;
    translateProfession: (profession: string) => string;
    translateSkill: (
        skillId: number | string,
        fallback?: string | null,
    ) => string;
    t: (key: string, fallback?: string | null) => string;
}

function PlayerSkillSection({
    uid,
    userData,
    startTime,
    getPlayerName,
    translateProfession,
    translateSkill,
    t,
}: PlayerSkillSectionProps): React.JSX.Element {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    // Parse profession
    const professionParts = (userData.profession || "Unknown").split("-");
    const mainProfessionKey = professionParts[0];
    const subProfessionKey = professionParts[1];

    // Get profession info - prefer sub-profession for icon if available
    const prof = subProfessionKey
        ? getProfessionInfo(subProfessionKey)
        : getProfessionInfo(mainProfessionKey);

    const translatedMainProf = translateProfession(mainProfessionKey);
    const translatedSubProf = subProfessionKey
        ? translateProfession(subProfessionKey)
        : null;
    let professionDisplay = translatedMainProf;
    if (translatedSubProf) {
        professionDisplay += ` - ${translatedSubProf}`;
    }

    const playerName = getPlayerName(uid, userData.name);

    // Sort skills by damage
    const sortedSkills = Object.entries(userData.skills).sort(
        (a: any, b: any) => (b[1].totalDamage || 0) - (a[1].totalDamage || 0),
    );

    // Filter out skills with no data
    const activeSkills = sortedSkills.filter(
        ([, skill]: [string, any]) =>
            skill.totalDamage > 0 || skill.totalCount > 0,
    );

    if (activeSkills.length === 0) return <></>;

    return (
        <div
            className={`player-skill-section ${isCollapsed ? "collapsed" : ""}`}
            data-uid={uid}
        >
            <div
                className="player-skill-header"
                data-collapsible="user"
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ cursor: "pointer" }}
            >
                <svg
                    className="collapse-icon"
                    width="12"
                    height="12"
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
                <img
                    className="class-icon"
                    src={`icons/${prof.icon}`}
                    alt={prof.name}
                />
                <span className="player-name">{playerName}</span>
                <span className="player-profession">{professionDisplay}</span>
            </div>

            <div
                className="skills-grid"
                style={{ display: isCollapsed ? "none" : "grid" }}
            >
                {activeSkills.map(([skillId, skill]: [string, any]) => (
                    <SkillCard
                        key={`${uid}-${skillId}`}
                        skillId={skillId}
                        skill={skill}
                        uid={uid}
                        startTime={startTime}
                        t={t}
                        translateSkill={translateSkill}
                    />
                ))}
            </div>
        </div>
    );
}

function SkillsViewComponent({
    skillsData,
    startTime,
    getPlayerName,
    translateProfession,
    translateSkill,
    scope = "nearby",
    t,
}: SkillsViewProps): React.JSX.Element {
    if (!skillsData || Object.keys(skillsData).length === 0) {
        return (
            <div className="skills-message">
                {t("ui.skills.noData")}
            </div>
        );
    }

    const [searchTerm, setSearchTerm] = useState<string>("");

    const filteredSkillsData: Record<string, any> = {};
    if (scope === "solo") {
        if (Object.keys(skillsData).length === 1) {
            Object.assign(filteredSkillsData, skillsData);
        } else {
            // Fallback: render all if we can't determine solo user here
            Object.assign(filteredSkillsData, skillsData);
        }
    } else {
        Object.assign(filteredSkillsData, skillsData);
    }

    const search = searchTerm.trim().toLowerCase();

    const sortedUsers = useMemo(() => {
        const entries = Object.entries(filteredSkillsData).filter(([uid, userData]: [string, any]) => {
            if (!search) return true;

            const uidMatch = uid.includes(search);
            const name = getPlayerName(uid, userData.name || "").toLowerCase();
            const nameMatch = name.includes(search);

            return uidMatch || nameMatch;
        });

        entries.sort((a: any, b: any) => {
            const aTotal = Object.values(a[1].skills || {}).reduce(
                (sum: number, skill: any) => sum + (skill.totalDamage || 0),
                0,
            ) as number;
            const bTotal = Object.values(b[1].skills || {}).reduce(
                (sum: number, skill: any) => sum + (skill.totalDamage || 0),
                0,
            ) as number;
            return bTotal - aTotal;
        });

        return entries;
    }, [filteredSkillsData, search, getPlayerName]);

    return (
        <div
            className="skills-container px-4 py-4"
            data-user-count={Object.keys(skillsData).length}
        >
            {scope === "nearby" && (
                <div className="skills-search w-full mb-4">
                    <input
                        type="search"
                        className="w-full px-2 py-1 border rounded"
                        placeholder={t("ui.skills.searchPlaceholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: "1px solid var(--border)", background: "var(--bg-dark)", color: "var(--text-primary)" }}
                    />
                </div>
            )}

            {sortedUsers.length === 0 ? (
                <div style={{ padding: 12 }}>{t("ui.skills.noMatch")}</div>
            ) : (
                sortedUsers.map(([uid, userData]: [string, any]) => {
                    if (!userData || !userData.skills) return null;

                    return (
                        <PlayerSkillSection
                            key={uid}
                            uid={uid}
                            userData={userData}
                            startTime={startTime}
                            getPlayerName={getPlayerName}
                            translateProfession={translateProfession}
                            translateSkill={translateSkill}
                            t={t}
                        />
                    );
                })
            )}
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export const SkillsView = memo(SkillsViewComponent, (prevProps, nextProps) => {
    // Re-render if skills data changes or start time changes
    const prevKeys = Object.keys(prevProps.skillsData || {});
    const nextKeys = Object.keys(nextProps.skillsData || {});

    if (prevKeys.length !== nextKeys.length) return false;
    if (prevProps.startTime !== nextProps.startTime) return false;

    // Check if any skill data changed
    for (const key of prevKeys) {
        if (!nextProps.skillsData[key]) return false;

        const prevSkills = prevProps.skillsData[key].skills;
        const nextSkills = nextProps.skillsData[key].skills;

        if (Object.keys(prevSkills).length !== Object.keys(nextSkills).length)
            return false;
    }

    return true;
});

SkillsView.displayName = "SkillsView";
