import { useState, useEffect, useCallback } from "react";
import { loadTranslations, t, translateSkill, translateProfession, translateMonsterName } from "../utils/translations";
import { fetchSettings, changeLanguage as changeLanguageAPI } from "../api";

export interface UseTranslationsReturn {
    currentLanguage: string;
    t: (key: string, fallback?: string | null) => string;
    translateSkill: (
        skillId: number | string,
        fallback?: string | null,
    ) => string;
    translateProfession: (profession: string) => string;
    changeLanguage: (lang: string) => Promise<boolean>;
    translateMonsterName: (
        monsterId: number | string,
        fallback?: string | null,
    ) => string;
    isLoaded: boolean;
}

export function useTranslations(): UseTranslationsReturn {
    const [currentLanguage, setCurrentLanguage] = useState<string>("en");
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    useEffect(() => {
        const initTranslations = async () => {
            try {
                const settings = await fetchSettings();
                const targetLang = settings.language || "en";
                const translationLoaded = await loadTranslations(targetLang);

                if (!translationLoaded) {
                    console.warn(
                        "Failed to load translations, falling back to English",
                    );
                    await loadTranslations("en");
                    setCurrentLanguage("en");
                } else {
                    setCurrentLanguage(targetLang);
                }

                setIsLoaded(true);
            } catch (error) {
                console.error("Failed to initialize translations:", error);
                await loadTranslations("en");
                setCurrentLanguage("en");
                setIsLoaded(true);
            }
        };

        initTranslations();
    }, []);

    const changeLanguage = useCallback(
        async (lang: string): Promise<boolean> => {
            try {
                const success = await changeLanguageAPI(lang);
                if (success) {
                    await loadTranslations(lang);
                    setCurrentLanguage(lang);
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Failed to change language:", error);
                return false;
            }
        },
        [],
    );

    return {
        currentLanguage,
        t,
        translateSkill,
        translateProfession,
        changeLanguage,
        translateMonsterName,
        isLoaded,
    };
}