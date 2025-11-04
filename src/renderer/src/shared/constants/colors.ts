/**
 * Color constants for the BPSR Meter UI
 *
 * This module defines color schemes for various UI elements including:
 * - Position-based background colors (damage bars)
 * - Role-based colors (DPS, Tank, Healer)
 * - Theme colors (matching CSS variables)
 */

/**
 * Position background colors for player bars
 * Gradient from warm (red) for top ranks to cool (cyan) for lower ranks
 * Creates visual hierarchy in the damage meter
 */
export const positionBackgroundColors: string[] = [
    "rgba(180, 50, 60, 0.35)", // Rank 1 - Highest damage (warm red)
    "rgba(170, 60, 70, 0.32)", // Rank 2
    "rgba(160, 70, 80, 0.29)", // Rank 3
    "rgba(150, 80, 90, 0.26)", // Rank 4
    "rgba(140, 90, 100, 0.23)", // Rank 5
    "rgba(120, 100, 110, 0.20)", // Rank 6
    "rgba(100, 110, 120, 0.17)", // Rank 7
    "rgba(80, 120, 130, 0.14)", // Rank 8
    "rgba(70, 130, 140, 0.11)", // Rank 9
    "rgba(60, 140, 150, 0.08)", // Rank 10 - Lower damage (cool cyan)
];

/**
 * Get background color for a player based on their position/rank
 * @param index - Zero-based position index (0 = rank 1)
 * @returns RGBA color string
 */
export function getPositionBackgroundColor(index: number): string {
    // Validate index
    if (!Number.isFinite(index) || index < 0) {
        return positionBackgroundColors[0];
    }

    // Clamp to valid range, use last color for positions beyond 10
    const clampedIndex = Math.min(index, positionBackgroundColors.length - 1);
    return positionBackgroundColors[clampedIndex];
}

// Role colors - used for visual distinction
export const roleColors = {
    dps: "#ff4444",
    tank: "#4444ff",
    healer: "#44ff44",
} as const;

// Theme colors (from CSS variables)
export const themeColors = {
    bgDark: "rgba(15, 20, 30, 0.42)",
    bgDarker: "rgba(10, 15, 22, 0.45)",
    bgLight: "rgba(25, 32, 45, 0.38)",
    accentPrimary: "#4a9eff",
    textPrimary: "#ffffff",
    textSecondary: "#b4bcc9",
    textMuted: "#6c7a89",
    border: "rgba(255, 255, 255, 0.08)",
    borderHover: "rgba(74, 158, 255, 0.3)",
} as const;
