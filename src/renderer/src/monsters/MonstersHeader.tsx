import React from "react";

export interface MonstersHeaderProps {
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    t?: (key: string, fallback?: string | null) => string;
}

export function MonstersHeader({ onClose, onDragStart, onZoomIn, onZoomOut, t }: MonstersHeaderProps): React.JSX.Element {
    return (
        <div className="group-header">
            <div id="monsters-drag-indicator" className="drag-indicator pointer-events-auto" onMouseDown={onDragStart} style={{ cursor: "move" }}>
                <i className="fa-solid fa-grip-vertical"></i>
            </div>

            <span className="group-title">Monsters</span>

            <div style={{ flex: 1 }} />

            <button id="monsters-zoom-out-btn" className="control-button" onClick={onZoomOut} title={t ? t("ui.buttons.zoomOut") : "Zoom out"}>
                <i className="fa-solid fa-minus"></i>
            </button>
            <button id="monsters-zoom-in-btn" className="control-button" onClick={onZoomIn} title={t ? t("ui.buttons.zoomIn") : "Zoom in"}>
                <i className="fa-solid fa-plus"></i>
            </button>

            <button id="monsters-close-button" className="control-button" onClick={onClose} title={t ? t("ui.buttons.close") : "Close"}>
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
}

export default MonstersHeader;
