/**
 * Shared utility functions for BPSR Meter
 */

export {
    formatStat,
    formatPercent,
    formatDPS,
    formatHP,
    formatCritRate,
    getRoleColor,
    getHPColor,
    debounce,
    throttle,
    formatDuration,
    formatDate,
} from "./formatters";

export {
    professionMap,
    defaultProfession,
    getProfessionInfo,
    getProfessionIcon,
    getProfessionRole,
} from "./professions";

export {
    loadTranslations,
    t,
    translateSkill,
    translateProfession,
    getCurrentLanguage,
    getTranslations,
} from "./translations";
