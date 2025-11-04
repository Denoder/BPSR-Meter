/**
 * Type definitions for History Window
 */

export interface HistorySummary {
    startTime: number;
    endTime: number;
    duration: number;
    userCount: number;
    version: string;
    topDamage?: {
        uid: number;
        name: string;
        total: number;
    };
}

export interface HistoryUserStats {
    realtime_dps: number;
    realtime_dps_max: number;
    total_dps: number;
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
    realtime_hps: number;
    realtime_hps_max: number;
    total_hps: number;
    total_healing: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        hpLessen: number;
        total: number;
    };
    taken_damage: number;
    profession: string;
    name: string;
    fightPoint: number;
    hp?: number;
    max_hp?: number;
    dead_count: number;
}

export interface HistoryUserData {
    [uid: string]: HistoryUserStats;
}

export interface HistorySkillData {
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

export interface HistoryPlayerSkills {
    uid: number;
    name: string;
    profession: string;
    skills: {
        [skillId: string]: HistorySkillData;
    };
    attr: Record<string, any>;
}

export interface HistoryListItem {
    timestamp: string;
    summary?: HistorySummary;
}
