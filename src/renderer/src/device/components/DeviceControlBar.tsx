import React from "react";
import { DragIndicator } from "../../main/components/DragIndicator";

export interface DeviceControlBarProps {
    isLocked?: boolean;
    onDragStart?: (e: React.MouseEvent) => void;
    onClose?: () => void;
    title?: string;
}

export function DeviceControlBar({ isLocked = false, onDragStart, onClose, title }: DeviceControlBarProps): React.JSX.Element {
    return (
        <div className="controls" style={{ marginBottom: 8 }}>
            <DragIndicator onDragStart={onDragStart ? onDragStart : (e) => {}} isLocked={!!isLocked} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flex: 1 }}>
                <div className="title">{title || 'Device'}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <button className="control-button close-button" onClick={onClose} title="Close">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
    );
}

export default DeviceControlBar;
