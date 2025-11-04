import React from "react";

export interface GroupHeaderProps {
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    t: (key: string, fallback?: string | null) => string;
}

export function GroupHeader({
    onClose,
    onDragStart,
    onZoomIn,
    onZoomOut,
    t,
}: GroupHeaderProps): React.JSX.Element {
    return (
        <div className="group-header">
            {/* Drag Indicator */}
            <div
                id="group-drag-indicator"
                className="drag-indicator pointer-events-auto"
                onMouseDown={onDragStart}
                style={{ cursor: "move" }}
            >
                <i className="fa-solid fa-grip-vertical"></i>
            </div>

            {/* Window Title */}
            <span className="group-title">{t("ui.titles.groupManagement")}</span>

            {/* Spacer */}
            <div style={{ flex: 1 }}></div>

            {/* Zoom Controls */}
            <button
                id="group-zoom-out-btn"
                className="control-button"
                onClick={onZoomOut}
                title={t("ui.buttons.zoomOut")}
            >
                <i className="fa-solid fa-minus"></i>
            </button>
            <button
                id="group-zoom-in-btn"
                className="control-button"
                onClick={onZoomIn}
                title={t("ui.buttons.zoomIn")}
            >
                <i className="fa-solid fa-plus"></i>
            </button>

            {/* Close Button */}
            <button
                id="group-close-button"
                className="control-button"
                onClick={onClose}
                title={t("ui.buttons.close")}
            >
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
}
