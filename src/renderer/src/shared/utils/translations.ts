/**
 * Translation system for multi-language support
 *
 * This module handles loading and accessing translations for skills, professions, and UI elements.
 * Supports English (en) and Chinese (zh) languages.
 *
 * @example
 * ```typescript
 * // Load translations
 * await loadTranslations('en');
 *
 * // Translate UI text
 * const text = t('ui.stats.dps', 'DPS');
 *
 * // Translate skill name
 * const skillName = translateSkill('1241', 'Unknown Skill');
 *
 * // Translate profession
 * const profName = translateProfession('冰魔导师');
 * ```
 */

import type { Translations, ApiResponse } from "../types";

let currentLanguage: string = "en";
let translations: Translations = {};

/**
 * Load translations for a specific language
 * @param lang - Language code ('en' or 'zh')
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function loadTranslations(lang: string): Promise<boolean> {
    if (!lang || typeof lang !== "string") {
        console.error("Invalid language code provided to loadTranslations");
        return false;
    }

    try {
        const response = await fetch(`/api/translations/${lang}`);

        if (!response.ok) {
            console.error(
                "Translation response not ok:",
                response.status,
                response.statusText,
            );
            return false;
        }

        const result: ApiResponse<Translations> = await response.json();

        if (result.code === 0 && result.data) {
            translations = result.data;
            currentLanguage = lang;
            console.log("Successfully loaded translations for language:", lang);
            console.log(
                "Loaded skills:",
                Object.keys(translations.skills || {}).length,
                "translations",
            );
            return true;
        } else {
            console.error("Translation API returned error:", result);
            return false;
        }
    } catch (error) {
        console.error("Failed to load translations:", error);
        return false;
    }
}

/**
 * Translate a UI text key using dot notation
 * @param key - Translation key in dot notation (e.g., 'ui.stats.dps')
 * @param fallback - Fallback text if translation not found
 * @returns Translated text or fallback or key
 */
export function t(key: string, fallback: string | null = null): string {
    if (!key || typeof key !== "string") {
        return fallback || "";
    }

    const keys = key.split(".");
    let value: any = translations;

    for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
            value = value[k];
        } else {
            return fallback || key;
        }
    }

    return value || fallback || key;
}

/**
 * Translate a skill ID to its localized name
 * @param skillId - Skill ID (number or string)
 * @param fallback - Fallback name if translation not found
 * @returns Translated skill name or fallback
 */
export function translateSkill(
    skillId: number | string,
    fallback: string | null = null,
): string {
    if (skillId === null || skillId === undefined) {
        return fallback || "Unknown";
    }

    const skillIdStr = String(skillId);

    if (!translations.skills) {
        return fallback || skillIdStr;
    }

    return translations.skills[skillIdStr] || fallback || skillIdStr;
}

export function translateMonsterName(
    monsterId: number | string,
    fallback: string | null = null,
): string {
    if (monsterId === null || monsterId === undefined) {
        return fallback || "Unknown";
    }

    const monsterIdStr = String(monsterId);

    console.log(translations);

    if (!translations.monsters) {
        return fallback || monsterIdStr;
    }

    return translations.monsters[monsterIdStr] || fallback || monsterIdStr;
}

/**
 * Translate a profession name from Chinese to localized name
 * @param profession - Chinese profession name
 * @returns Translated profession name or original if not found
 */
export function translateProfession(profession: string): string {
    if (!profession || typeof profession !== "string") {
        return "Unknown";
    }

    return translations.professions?.[profession] || profession;
}

/**
 * Get the currently active language code
 * @returns Current language code ('en' or 'zh')
 */
export function getCurrentLanguage(): string {
    return currentLanguage;
}

/**
 * Get the complete translations object
 * @returns Full translations object
 */
export function getTranslations(): Translations {
    return translations;
}

const otherTranslationsCache: Record<string, Translations | null> = {};

export async function loadTranslationsFor(lang: string): Promise<Translations | null> {
    if (!lang || typeof lang !== "string") return null;

    if (otherTranslationsCache[lang]) return otherTranslationsCache[lang];

    try {
        const response = await fetch(`/api/translations/${lang}`);
        if (!response.ok) return null;
        const result: ApiResponse<Translations> = await response.json();
        if (result.code === 0 && result.data) {
            otherTranslationsCache[lang] = result.data;
            return result.data;
        }
    } catch (e) {
        console.error("Failed to load translations for", lang, e);
    }
    otherTranslationsCache[lang] = null;
    return null;
}

export async function translateForLang(lang: string, key: string, fallback: string | null = null): Promise<string | null> {
    if (!lang || !key) return fallback;
    const tr = await loadTranslationsFor(lang);
    if (!tr) return fallback;

    const keys = key.split('.');
    let value: any = tr;
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return fallback;
        }
    }
    return value || fallback;
}

const isDevelopment = process.env.NODE_ENV === "development";

if (isDevelopment && typeof window !== "undefined") {
    (window as any).translationsDebug = {
        testTranslations: () => {
            console.log("Current language:", currentLanguage);
            console.log("Translations object:", translations);
            console.log(
                "Sample skill translation for 1241:",
                translateSkill("1241", "fallback"),
            );
            console.log(
                "Sample UI translation for ui.controls.skills:",
                t("ui.controls.skills", "fallback"),
            );
        },
        forceLoadTranslations: async (lang: string) => {
            console.log("Force loading translations for:", lang);
            const success = await loadTranslations(lang);
            console.log("Load success:", success);
            if (success) {
                console.log("Translation loaded successfully");
            }
        },
        getCurrentState: () => ({
            currentLanguage,
            skillCount: Object.keys(translations.skills || {}).length,
            professionCount: Object.keys(translations.professions || {}).length,
        }),
    };
}
