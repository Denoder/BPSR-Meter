import React from "react";

export interface HistoryHeaderProps {
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    t: (key: string, fallback?: string | null) => string;
}

export function HistoryHeader({
    onClose,
    onDragStart,
    onZoomIn,
    onZoomOut,
    t,
}: HistoryHeaderProps): React.JSX.Element {
    return (
        <div className="controls gap-1 !rounded-bl-none !rounded-br-none">
            {/* Drag Indicator */}
            <div
                id="drag-indicator"
                className="drag-indicator"
                onMouseDown={onDragStart}
                style={{ cursor: "grab" }}
            >
                <i className="fa-solid fa-grip-vertical"></i>
            </div>

            {/* Window Title */}
            <span
                style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                }}
                >
                {t("ui.controls.combatHistory")}
            </span>

            {/* Spacer */}
            <div style={{ flex: 1 }}></div>

            {/* Zoom Controls */}
            <button
                id="history-zoom-out-btn"
                className="control-button"
                onClick={onZoomOut}
                title={t("ui.buttons.zoomOut")}
            >
                <i className="fa-solid fa-minus"></i>
            </button>
            <button
                id="history-zoom-in-btn"
                className="control-button"
                onClick={onZoomIn}
                title={t("ui.buttons.zoomIn")}
            >
                <i className="fa-solid fa-plus"></i>
            </button>

            {/* Close Button */}
            <button
                id="close-button"
                className="control-button"
                onClick={onClose}
                title={t("ui.buttons.close")}
            >
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
}
