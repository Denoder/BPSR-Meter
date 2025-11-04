import React, { useState, useEffect, memo } from "react";
import { useTranslations } from "../../shared/hooks/useTranslations";

export interface CombatTimerProps {
    startTime: number;
    isPaused: boolean;
    hasDamage: boolean;
}

function CombatTimerComponent({ startTime, isPaused }: CombatTimerProps): React.JSX.Element {
    const [elapsed, setElapsed] = useState<number>(0);
    const { t } = useTranslations();

    useEffect(() => {
        if (isPaused || !startTime) {
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const elapsedMs = now - startTime;
            setElapsed(elapsedMs);
        };

        updateTimer();

        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [startTime, isPaused]);

    const formatTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
        <div
            className="combat-timer"
            style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "0 8px",
                fontSize: "11px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
            }}
            title={t("ui.controls.combatDuration", "Combat Duration")}
        >
            <i className="fa-solid fa-clock" style={{ fontSize: "10px" }}></i>
            <span>{formatTime(elapsed)}</span>
        </div>
    );
}

export const CombatTimer = memo(CombatTimerComponent);
