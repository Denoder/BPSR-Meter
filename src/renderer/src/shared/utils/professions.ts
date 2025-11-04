/**
 * Profession mapping and role information
 *
 * This module maps Chinese profession names to English names, icons, and roles.
 * It supports both main professions and sub-professions (specializations).
 *
 * @example
 * ```typescript
 * const prof = getProfessionInfo('冰魔导师');
 * console.log(prof.name); // "Frost Mage"
 * console.log(prof.icon); // "Frost Mage.png"
 * console.log(prof.role); // "dps"
 * ```
 */

import type { ProfessionMap, ProfessionInfo } from "../types";

export const professionMap: ProfessionMap = {
    // Classes
    雷影剑士: { name: "Stormblade", icon: "Stormblade.png", role: "dps" },
    冰魔导师: { name: "Frost Mage", icon: "Frost Mage.png", role: "dps" },
    "涤罪恶火·战斧": { name: "Fire Axe", icon: "Fire Axe.png", role: "dps" },
    青岚骑士: { name: "Wind Knight", icon: "Wind Knight.png", role: "tank" },
    森语者: { name: "Verdant Oracle", icon: "Verdant Oracle.png", role: "dps" },
    "雷霆一闪·手炮": { name: "Gunner", icon: "desconocido.png", role: "dps" },
    巨刃守护者: {
        name: "Heavy Guardian",
        icon: "baluarte_ferreo.png",
        role: "tank",
    },
    "暗灵祈舞·仪刀/仪仗": {
        name: "Spirit Dancer",
        icon: "desconocido.png",
        role: "dps",
    },
    神射手: { name: "Marksman", icon: "arco_halcon.png", role: "dps" },
    神盾骑士: { name: "Shield Knight", icon: "guardian.png", role: "tank" },
    灵魂乐手: { name: "Soul Musician", icon: "sonido_feroz.png", role: "dps" },

    // Specializations
    居合: { name: "Iaido Slash", icon: "Stormblade.png", role: "dps" },
    月刃: { name: "MoonStrike", icon: "MoonStrike.png", role: "dps" },
    冰矛: { name: "Icicle", icon: "lanza_hielo.png", role: "dps" },
    射线: { name: "Frostbeam", icon: "Frost Mage.png", role: "dps" },
    防盾: { name: "Vanguard", icon: "guardian.png", role: "tank" },
    岩盾: { name: "Skyward", icon: "Fire Axe.png", role: "tank" },
    惩戒: { name: "Smite", icon: "castigo.png", role: "dps" },
    愈合: { name: "Lifebind", icon: "Verdant Oracle.png", role: "healer" },
    格挡: { name: "Block", icon: "guardian.png", role: "tank" },
    狼弓: { name: "Wildpack", icon: "arco_lobo.png", role: "dps" },
    鹰弓: { name: "Falconry", icon: "arco_halcon.png", role: "dps" },
    光盾: { name: "Shield", icon: "egida_luz.png", role: "tank" },
    协奏: { name: "Concerto", icon: "Concierto.png", role: "dps" },
    狂音: { name: "Dissonance", icon: "sonido_feroz.png", role: "dps" },
    空枪: { name: "Empty Gun", icon: "francotirador.png", role: "dps" },
    重装: { name: "Heavy Armor", icon: "Wind Knight.png", role: "dps" },
};

export const defaultProfession: ProfessionInfo = {
    name: "Unknown",
    icon: "desconocido.png",
    role: "dps",
};

/**
 * Get complete profession information (name, icon, role)
 * @param profession - Chinese profession name or specialization
 * @returns ProfessionInfo object with name, icon, and role
 */
export function getProfessionInfo(profession: string): ProfessionInfo {
    if (!profession || typeof profession !== "string") {
        return defaultProfession;
    }

    return professionMap[profession] || defaultProfession;
}

/**
 * Get profession icon filename
 * @param profession - Chinese profession name or specialization
 * @returns Icon filename (e.g., "Frost Mage.png")
 */
export function getProfessionIcon(profession: string): string {
    return getProfessionInfo(profession).icon;
}

/**
 * Get profession role classification
 * @param profession - Chinese profession name or specialization
 * @returns Role type: 'dps', 'tank', or 'healer'
 */
export function getProfessionRole(
    profession: string,
): "dps" | "tank" | "healer" {
    return getProfessionInfo(profession).role;
}
