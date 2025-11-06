import { useState, useEffect, useCallback } from "react";
import { loadTranslations, t, translateSkill, translateProfession, translateMonsterName } from "../utils/translations";
import { fetchSettings, changeLanguage as changeLanguageAPI } from "../api";
import { getSocket } from "./useSocket";

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
            let cachedLang = "en";
            try {
                const stored = localStorage.getItem("appLanguage");
                if (stored && (stored === "en" || stored === "zh")) {
                    cachedLang = stored;
                }
            } catch (error) {
                console.warn("Failed to read language from localStorage:", error);
            }

            await loadTranslations(cachedLang);
            setCurrentLanguage(cachedLang);
            setIsLoaded(true);
            
            try {
                let settings = null;
                let retries = 0;
                const maxRetries = 10;

                while (!settings && retries < maxRetries) {
                    try {
                        settings = await fetchSettings();
                        if (settings) break;
                    } catch (error) {
                        console.log(`Waiting for socket connection... (attempt ${retries + 1}/${maxRetries})`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                    retries++;
                }

                const targetLang = settings?.language || "en";

                try {
                    localStorage.setItem("appLanguage", targetLang);
                } catch (error) {
                    console.warn("Failed to save language to localStorage:", error);
                }

                if (targetLang !== cachedLang) {
                    console.log(`Loading translations for language: ${targetLang}`);
                    const translationLoaded = await loadTranslations(targetLang);

                    if (translationLoaded) {
                        setCurrentLanguage(targetLang);
                        setIsLoaded(false);
                        setTimeout(() => setIsLoaded(true), 0);
                    } else {
                        console.warn("Failed to load target language, keeping current language");
                    }
                }
            } catch (error) {
                console.error("Failed to fetch language settings:", error);
                // Already have cached language loaded, so just continue
            }
        };

        initTranslations();
    }, []);

    useEffect(() => {
        const handleLanguageChange = async (data: { language: string }) => {
            console.log("Language changed by another window:", data.language);
            const translationLoaded = await loadTranslations(data.language);
            if (translationLoaded) {
                setCurrentLanguage(data.language);
                try {
                    localStorage.setItem("appLanguage", data.language);
                } catch (error) {
                    console.warn("Failed to save language to localStorage:", error);
                }
                setIsLoaded(false);
                setTimeout(() => setIsLoaded(true), 0);
            }
        };

        const socket = getSocket();
        if (socket) {
            socket.on("languageChanged", handleLanguageChange);
        }

        return () => {
            const currentSocket = getSocket();
            if (currentSocket) {
                currentSocket.off("languageChanged", handleLanguageChange);
            }
        };
    }, []);

    const changeLanguage = useCallback(
        async (lang: string): Promise<boolean> => {
            try {
                const success = await changeLanguageAPI(lang);
                if (success) {
                    await loadTranslations(lang);
                    setCurrentLanguage(lang);
                    try {
                        localStorage.setItem("appLanguage", lang);
                    } catch (error) {
                        console.warn("Failed to save language to localStorage:", error);
                    }
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