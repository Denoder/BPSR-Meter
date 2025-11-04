import React from "react";
import { PlayerBar } from "./PlayerBar";
import type { PlayerUser } from "../hooks/useDataFetching";

export interface PlayerListProps {
    players: PlayerUser[];
    localUid: number | null;
    onAddToRegistry: (uid: string, name: string) => void;
    getPlayerName: (uid: string, currentName: string) => string;
    translateProfession: (profession: string) => string;
    t: (key: string, fallback?: string | null) => string;
    visibleColumns?: Record<string, boolean>;
}

export function PlayerList({
    players,
    localUid,
    onAddToRegistry,
    getPlayerName,
    translateProfession,
    t,
    visibleColumns,
}: PlayerListProps): React.JSX.Element {
    return (
        <div id="player-bars-container">
            <div className="dps-meter-container">
                {players.map((player, index) => {
                    const isLocalPlayer =
                        localUid !== null && player.uid === localUid;

                    return (
                        <PlayerBar
                            key={player.uid}
                            player={player}
                            position={index + 1}
                            isLocalPlayer={isLocalPlayer}
                            localUid={localUid}
                            onAddToRegistry={onAddToRegistry}
                            getPlayerName={getPlayerName}
                            translateProfession={translateProfession}
                            t={t}
                            visibleColumns={visibleColumns}
                        />
                    );
                })}
            </div>
        </div>
    );
}
