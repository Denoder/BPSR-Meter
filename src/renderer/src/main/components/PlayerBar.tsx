import React, { memo, useState } from "react";
import { formatStat } from "../../shared/utils/formatters";
import { getProfessionInfo } from "../../shared/utils/professions";
import { getPositionBackgroundColor } from "../../shared/constants/colors";
import type { PlayerUser } from "../hooks/useDataFetching";

export interface PlayerBarProps {
    player: PlayerUser;
    position: number;
    isLocalPlayer: boolean;
    localUid: number | null;
    onAddToRegistry: (uid: string, name: string) => void;
    getPlayerName: (uid: string, currentName: string) => string;
    translateProfession: (profession: string) => string;
    t: (key: string, fallback?: string | null) => string;
    visibleColumns?: Record<string, boolean>;
}

function PlayerBarComponent({
    player,
    position,
    isLocalPlayer,
    onAddToRegistry,
    getPlayerName,
    translateProfession,
    t,
    visibleColumns,
}: PlayerBarProps): React.JSX.Element {
    const professionParts = (player.profession || "-").split("-");
    const mainProfessionKey = professionParts[0];
    const subProfessionKey = professionParts[1];

    const prof = subProfessionKey
        ? getProfessionInfo(subProfessionKey)
        : getProfessionInfo(mainProfessionKey);

    const translatedMainProf = translateProfession(mainProfessionKey);
    const translatedSubProf = subProfessionKey
        ? translateProfession(subProfessionKey)
        : null;
    let professionName = translatedMainProf;
    if (translatedSubProf) {
        professionName += ` - ${translatedSubProf}`;
    }

    // Calculate stats
    const totalHits = player.total_count.total || 0;
    const crit =
        player.total_count.critical !== undefined && totalHits > 0
            ? Math.round((player.total_count.critical / totalHits) * 100)
            : 0;
    const lucky =
        player.total_count.lucky !== undefined && totalHits > 0
            ? Math.round((player.total_count.lucky / totalHits) * 100)
            : 0;
    const peak =
        player.realtime_dps_max !== undefined ? player.realtime_dps_max : 0;
    const dps = Number(player.total_dps) || 0;
    const totalHealing = player.total_healing
        ? Number(player.total_healing.total) || 0
        : 0;
    const name = getPlayerName(String(player.uid), player.name);
    const hpPercent = ((player.hp || 0) / (player.max_hp || 1)) * 100;
    const hpColor =
        hpPercent > 50 ? "#1db954" : hpPercent > 25 ? "#f39c12" : "#e74c3c";
    const bgColor = getPositionBackgroundColor(position - 1);

    let positionClasses = "player-position";
    if (position === 1) positionClasses += " rank-1";
    else if (position === 2) positionClasses += " rank-2";
    else if (position === 3) positionClasses += " rank-3";
    if (isLocalPlayer) positionClasses += " local-player";

    const [copied, setCopied] = useState(false);

    async function copySummary(e: React.MouseEvent) {
        e.stopPropagation();
        const totalDamage = (player.total_damage && player.total_damage.total) || 0;
        const dpsValue = Number(player.total_dps) || 0;
        const percent = Math.round(player.damagePercent || 0);

        const text = `${name}: ${formatStat(totalDamage)} (${formatStat(
            dpsValue,
        )}/${percent}%)`;

        try {
            if (navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
                await (navigator as any).clipboard.writeText(text);
            }

            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch (err) {
            // ignore clipboard errors
            console.error("Failed to copy summary:", err);
        }
    }

    // Calculate crit damage values
    const critDmg =
        (player.total_damage.critical || 0) +
        (player.total_damage.crit_lucky || 0);
    const critCount =
        player.total_count.critical + player.total_count.crit_lucky;
    const avgCritDmg = critCount > 0 ? critDmg / critCount : 0;

    return (
        <div
            className={`player-bar max-h-[45px] ${position === 1 ? "first-player" : ""}`}
            data-uid={player.uid}
            data-name={name}
            style={{
                ["--damage-percent" as string]: `${player.damagePercent}%`,
                ["--damage-bg-color" as string]: bgColor,
            }}
        >
            <div className="player-info player-info-dps">
                <div className="flex items-center gap-1">
                    <span className={positionClasses}>{position}</span>

                    <button
                        className="add-to-registry-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddToRegistry(String(player.uid), name);
                        }}
                        title={t("ui.buttons.addToRegistry", "Add to Player Registry")}
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>

                    <button
                        className="copy-summary-btn"
                        onClick={copySummary}
                        title={t("ui.actions.copySummary")}
                        aria-label={`${t("ui.actions.copySummary")} ${name}`}
                    >
                        <i className="fa-solid fa-copy"></i>
                        {copied && (
                            <span className="copy-feedback z-10">{t("ui.messages.copied")}</span>
                        )}
                    </button>
                </div>

                <img
                    className="class-icon"
                    src={`icons/${prof.icon}`}
                    alt={professionName}
                    title={professionName}
                />

                <div className="player-details">
                    <span className="player-name" title={name}>
                        <span>{name}</span>
                        <span
                            style={{
                                color: "var(--text-secondary)",
                                fontSize: "9px",
                                fontWeight: 400,
                            }}
                        >
                            {t("ui.stats.gs")}: {player.fightPoint}
                        </span>
                    </span>
                    <div className="hp-bar">
                        <div
                            className="hp-fill"
                            style={{
                                width: `${hpPercent}%`,
                                background: hpColor,
                            }}
                        ></div>
                        <span className="hp-text">
                            {formatStat(player.hp || 0)}/
                            {formatStat(player.max_hp || 0)}
                        </span>
                    </div>
                </div>

                <div className="player-stats-main gap-3">
                    {visibleColumns?.dps !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.dps")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(dps) ? dps.toLocaleString() : ""}>{formatStat(dps)}</span>
                        </div>
                    )}
                    {visibleColumns?.hps !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.hps")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(player.total_hps) ? Number(player.total_hps || 0).toLocaleString() : ""}>{formatStat(player.total_hps || 0)}</span>
                        </div>
                    )}
                    {visibleColumns?.totalDmg !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.totalDmg")}</span>
                            <span className="stat-value" data-tooltip={((player.total_damage && Number.isFinite(player.total_damage.total)) ? Number(player.total_damage.total).toLocaleString() : "")}>{formatStat((player.total_damage && player.total_damage.total) || 0)}</span>
                        </div>
                    )}
                    {visibleColumns?.dmgTaken !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.dmgTaken")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(player.taken_damage) ? Number((player.taken_damage || 0)).toLocaleString() : ""}>{formatStat(player.taken_damage || 0)}</span>
                        </div>
                    )}
                    {visibleColumns?.percentDmg !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.percentDmg")}</span>
                            <span className="stat-value" data-tooltip={typeof player.damagePercent === 'number' ? (player.damagePercent).toFixed(2) + '%' : ''}>{Math.round(player.damagePercent || 0)}%</span>
                        </div>
                    )}
                    {visibleColumns?.critPercent !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.critPercent")}</span>
                            <span className="stat-value" data-tooltip={(player.total_count && typeof player.total_count.critical === 'number') ? player.total_count.critical.toLocaleString() : ''}>{crit}%</span>
                        </div>
                    )}
                    {visibleColumns?.critDmg !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.critDmg")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(critDmg) ? Number(critDmg).toLocaleString() : ''}>{formatStat(critDmg)}</span>
                        </div>
                    )}
                    {visibleColumns?.avgCritDmg !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.avgCritDmg")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(avgCritDmg) ? Number(avgCritDmg).toLocaleString() : ''}>{formatStat(avgCritDmg)}</span>
                        </div>
                    )}
                    {visibleColumns?.luckyPercent !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.luckyPercent")}</span>
                            <span className="stat-value" data-tooltip={(player.total_count && typeof player.total_count.lucky === 'number') ? player.total_count.lucky.toLocaleString() : ''}>{lucky}%</span>
                        </div>
                    )}
                    {visibleColumns?.peakDps !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.peakDps")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(peak) ? Number(peak).toLocaleString() : ''}>{formatStat(peak)}</span>
                        </div>
                    )}
                    {visibleColumns?.totalHeal !== false && (
                        <div className="stat">
                            <span className="stat-label">{t("ui.stats.totalHeal")}</span>
                            <span className="stat-value" data-tooltip={Number.isFinite(totalHealing) ? Number(totalHealing).toLocaleString() : ''}>{formatStat(totalHealing)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export const PlayerBar = memo(PlayerBarComponent, (prevProps, nextProps) => {
    return (
        prevProps.player.uid === nextProps.player.uid &&
        prevProps.player.total_damage.total ===
        nextProps.player.total_damage.total &&
        prevProps.player.hp === nextProps.player.hp &&
        prevProps.player.total_dps === nextProps.player.total_dps &&
        prevProps.player.damagePercent === nextProps.player.damagePercent &&
        prevProps.position === nextProps.position &&
        prevProps.isLocalPlayer === nextProps.isLocalPlayer &&
        prevProps.player.name === nextProps.player.name
        && JSON.stringify(prevProps.visibleColumns) === JSON.stringify(nextProps.visibleColumns)
    );
});

PlayerBar.displayName = "PlayerBar";
