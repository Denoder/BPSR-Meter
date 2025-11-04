import React from "react";

export interface ClearGroupButtonProps {
    onClearGroup: () => void;
    disabled?: boolean;
    t?: (key: string, fallback?: string | null) => string;
}

export function ClearGroupButton({
    onClearGroup,
    disabled = false,
    t = (k: string, f?: string | null) => (f || k),
}: ClearGroupButtonProps): React.JSX.Element {
    const handleClick = () => {
        if (
            window.confirm(
                t("ui.messages.confirmClearGroup"),
            )
        ) {
            onClearGroup();
        }
    };

    return (
        <div className="group-actions">
            <button
                id="clear-group-btn"
                className="btn-clear-group"
                onClick={handleClick}
                disabled={disabled}
                style={{
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                }}
            >
                <i
                    className="fa-solid fa-trash-can"
                    style={{ marginRight: "6px" }}
                ></i>
                {t("ui.buttons.clearGroup")}
            </button>
        </div>
    );
}
