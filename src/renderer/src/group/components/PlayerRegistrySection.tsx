import React, { useState } from "react";
import type { PlayerRegistry } from "../../shared/types";

export interface PlayerRegistrySectionProps {
    playerRegistry: PlayerRegistry;
    onSavePlayer: (uid: string, name: string) => Promise<void>;
    onDeletePlayer: (uid: string) => Promise<void>;
    t: (key: string, fallback?: string | null) => string;
}

export function PlayerRegistrySection({
    playerRegistry,
    onSavePlayer,
    onDeletePlayer,
    t,
}: PlayerRegistrySectionProps): React.JSX.Element {
    const [uid, setUid] = useState<string>("");
    const [name, setName] = useState<string>("");

    const handleSave = async () => {
        const trimmedUid = uid.trim();
        const trimmedName = name.trim();

        if (!trimmedUid || !trimmedName) {
            alert(t("ui.messages.enterUidName","Please enter both UID and Name"));
            return;
        }

        await onSavePlayer(trimmedUid, trimmedName);

        // Clear inputs on success
        setUid("");
        setName("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        }
    };

    const registryEntries = Object.entries(playerRegistry);

    return (
        <div className="group-section">
            <h4>{t("ui.titles.playerRegistry","Player Registry")}</h4>

            {/* Registry Controls - Add New Player */}
            <div className="registry-controls">
                <input
                    id="registry-uid-input"
                    type="text"
                    placeholder={t("ui.placeholders.playerUid","Player UID")}
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    onKeyPress={handleKeyPress}
                    style={{
                        flex: 1,
                        padding: "6px 8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "11px",
                    }}
                />
                <input
                    id="registry-name-input"
                    type="text"
                    placeholder={t("ui.placeholders.playerName","Player Name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    style={{
                        flex: 1,
                        padding: "6px 8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "11px",
                    }}
                />
                <button
                    id="registry-save-btn"
                    onClick={handleSave}
                    style={{
                        padding: "6px 12px",
                        background: "rgba(74, 158, 255, 0.2)",
                        border: "1px solid var(--accent-primary)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--accent-primary)",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all var(--transition)",
                    }}
                >
                    {t("ui.buttons.save","Save")}
                </button>
            </div>

            {/* Registry List */}
            <div id="registry-list" className="group-members-list" style={{ marginTop: "var(--gap-md)" }}>
                {registryEntries.length === 0 ? (
                    <div className="empty-state">{t("ui.messages.noSavedPlayers","No saved players")}</div>
                ) : (
                    registryEntries.map(([uuid, data]) => (
                        <div key={uuid} className="group-member-item">
                            <div className="player-info">
                                <span className="player-name">{data.name}</span>
                                <span className="player-uid">
                                    ({uuid.slice(0, 8)}...)
                                </span>
                            </div>
                            <button
                                className="btn-remove"
                                onClick={() => onDeletePlayer(uuid)}
                                title={t("ui.buttons.deleteFromRegistry","Delete from registry")}
                            >
                                {t("ui.buttons.delete","Delete")}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
