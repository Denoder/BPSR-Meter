import React from "react";

export interface GroupToggleProps {
    enabled: boolean;
    memberCount: number;
    onToggle: () => void;
    t: (key: string, fallback?: string | null) => string;
}

export function GroupToggle({
    enabled,
    memberCount,
    onToggle,
    t
}: GroupToggleProps): React.JSX.Element {
    return (
        <div className="group-toggle">
            <label>
                <input
                    id="group-enabled-toggle"
                    type="checkbox"
                    checked={enabled}
                    onChange={onToggle}
                />
                <span>{t("ui.group.enableGroupFilter")}</span>
            </label>
            <div className="group-info">
                <p id="group-member-count">
                    {t("ui.group.currentGroupMembers")} <strong>{memberCount}</strong>
                </p>
            </div>
        </div>
    );
}
