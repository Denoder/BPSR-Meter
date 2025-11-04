import React from "react";
import {
    formatDuration,
    formatDate,
    formatStat,
} from "../../shared/utils/formatters";
import type { HistoryListItem } from "../types";

export interface HistoryListProps {
    historyItems: HistoryListItem[];
    isLoading: boolean;
    selectedTimestamp: string | null;
    onSelectItem: (timestamp: string) => void;
    onDeleteItem: (timestamp: string) => void;
}

export function HistoryList({
    historyItems,
    isLoading,
    selectedTimestamp,
    onSelectItem,
    onDeleteItem,
}: HistoryListProps): React.JSX.Element {
    if (isLoading) {
        return (
            <div className="history-list">
                <div className="loading-indicator">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Loading history...
                </div>
            </div>
        );
    }

    if (historyItems.length === 0) {
        return (
            <div className="history-list">
                <div className="empty-state">
                    <i
                        className="fa-solid fa-clock-rotate-left"
                        style={{
                            fontSize: "32px",
                            opacity: 0.3,
                            marginBottom: "12px",
                        }}
                    ></i>
                    <p>No combat history found</p>
                    <p
                        style={{
                            fontSize: "11px",
                            opacity: 0.6,
                            marginTop: "8px",
                        }}
                    >
                        Enable history saving to record combat sessions
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="history-list">
            {historyItems.map(({ timestamp, summary }) => {
                const date = formatDate(parseInt(timestamp));
                const duration = summary
                    ? formatDuration(summary.duration)
                    : "Unknown";
                const userCount = summary?.userCount || 0;
                const topDmg = summary?.topDamage
                    ? formatStat(summary.topDamage.total)
                    : "-";
                const isActive = selectedTimestamp === timestamp;

                return (
                    <div
                        key={timestamp}
                        className={`history-item ${isActive ? "active" : ""}`}
                        style={{ cursor: "pointer" }}
                    >
                        <div 
                            className="history-item-content"
                            onClick={() => onSelectItem(timestamp)}
                        >
                            <div className="history-item-header">
                                <i className="fa-solid fa-clock"></i>
                                <span className="history-date">{date}</span>
                            </div>
                            <div className="history-item-stats">
                                <div className="history-stat">
                                    <i className="fa-solid fa-hourglass-half"></i>
                                    <span>{duration}</span>
                                </div>
                                <div className="history-stat">
                                    <i className="fa-solid fa-users"></i>
                                    <span>{userCount} players</span>
                                </div>
                                <div className="history-stat">
                                    <i className="fa-solid fa-burst"></i>
                                    <span>{topDmg}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            className="history-item-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete log from ${date}?`)) {
                                    onDeleteItem(timestamp);
                                }
                            }}
                            title="Delete log"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
