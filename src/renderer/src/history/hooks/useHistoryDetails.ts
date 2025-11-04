import { useState, useCallback } from "react";
import type {
    HistorySummary,
    HistoryUserData,
    HistoryPlayerSkills,
} from "../types";

export interface UseHistoryDetailsReturn {
    selectedTimestamp: string | null;
    summary: HistorySummary | null;
    userData: HistoryUserData | null;
    selectedPlayerSkills: HistoryPlayerSkills | null;
    isLoadingDetails: boolean;
    isLoadingSkills: boolean;
    detailsError: string | null;
    loadDetails: (timestamp: string) => Promise<void>;
    loadPlayerSkills: (timestamp: string, uid: string) => Promise<void>;
    closeSkillModal: () => void;
}

export function useHistoryDetails(): UseHistoryDetailsReturn {
    const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(
        null,
    );
    const [summary, setSummary] = useState<HistorySummary | null>(null);
    const [userData, setUserData] = useState<HistoryUserData | null>(null);
    const [selectedPlayerSkills, setSelectedPlayerSkills] =
        useState<HistoryPlayerSkills | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
    const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    const loadDetails = useCallback(async (timestamp: string) => {
        setIsLoadingDetails(true);
        setDetailsError(null);
        setSelectedTimestamp(timestamp);

        try {
            const [summaryRes, dataRes] = await Promise.all([
                fetch(`/api/history/${timestamp}/summary`),
                fetch(`/api/history/${timestamp}/data`),
            ]);

            const summaryData = await summaryRes.json();
            const userDataRes = await dataRes.json();

            if (summaryData.code !== 0 || userDataRes.code !== 0) {
                throw new Error("Failed to load history data");
            }

            setSummary(summaryData.data);
            setUserData(userDataRes.user);
            setIsLoadingDetails(false);
        } catch (err) {
            console.error("Failed to load history details:", err);
            setDetailsError("Failed to load combat details");
            setIsLoadingDetails(false);
        }
    }, []);

    const loadPlayerSkills = useCallback(
        async (timestamp: string, uid: string) => {
            setIsLoadingSkills(true);

            try {
                const response = await fetch(
                    `/api/history/${timestamp}/skill/${uid}`,
                );
                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error("Failed to load skill data");
                }

                setSelectedPlayerSkills(result.data);
                setIsLoadingSkills(false);
            } catch (err) {
                console.error("Failed to load player skills:", err);
                setSelectedPlayerSkills(null);
                setIsLoadingSkills(false);
            }
        },
        [],
    );

    const closeSkillModal = useCallback(() => {
        setSelectedPlayerSkills(null);
    }, []);

    return {
        selectedTimestamp,
        summary,
        userData,
        selectedPlayerSkills,
        isLoadingDetails,
        isLoadingSkills,
        detailsError,
        loadDetails,
        loadPlayerSkills,
        closeSkillModal,
    };
}
