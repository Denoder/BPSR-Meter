import { useState, useCallback } from "react";
import type { HistoryListItem, HistorySummary } from "../types";

export interface UseHistoryListReturn {
    historyItems: HistoryListItem[];
    isLoading: boolean;
    error: string | null;
    refreshHistoryList: () => Promise<void>;
}

export function useHistoryList(): UseHistoryListReturn {
    const [historyItems, setHistoryItems] = useState<HistoryListItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadHistoryList = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/history/list");
            const result = await response.json();

            if (result.code !== 0 || !result.data || result.data.length === 0) {
                setHistoryItems([]);
                setIsLoading(false);
                return;
            }

            // Sort by timestamp descending (newest first)
            const timestamps = result.data.sort(
                (a: string, b: string) => parseInt(b) - parseInt(a),
            );

            // Load summaries for each timestamp
            const items: HistoryListItem[] = [];

            for (const timestamp of timestamps) {
                try {
                    const summaryRes = await fetch(
                        `/api/history/${timestamp}/summary`,
                    );
                    const summaryData = await summaryRes.json();

                    items.push({
                        timestamp,
                        summary:
                            summaryData.code === 0
                                ? summaryData.data
                                : undefined,
                    });
                } catch (err) {
                    console.warn(
                        `Failed to load summary for ${timestamp}:`,
                        err,
                    );
                    items.push({ timestamp });
                }
            }

            setHistoryItems(items);
            setIsLoading(false);
        } catch (err) {
            console.error("Failed to load history list:", err);
            setError("Failed to load history");
            setIsLoading(false);
        }
    }, []);

    return {
        historyItems,
        isLoading,
        error,
        refreshHistoryList: loadHistoryList,
    };
}
