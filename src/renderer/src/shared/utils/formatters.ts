/**
 * Utility functions for formatting and display
 *
 * All functions handle edge cases (NaN, Infinity, negative values) gracefully.
 * Numbers are formatted with K/M/G/T suffixes for readability.
 */

/**
 * Format a numeric stat with appropriate suffix (K/M/G/T)
 * @param value - Numeric value to format
 * @returns Formatted string (e.g., "1.5M", "320k", "45")
 * @example
 * formatStat(1500000) // "1.5M"
 * formatStat(42000) // "42.0k"
 * formatStat(123) // "123"
 */
export function formatStat(value: number): string {
    // Handle invalid inputs
    if (!Number.isFinite(value)) {
        return "0";
    }

    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (absValue >= 1000000000000) {
        return sign + (absValue / 1000000000000).toFixed(1) + "T";
    }
    if (absValue >= 1000000000) {
        return sign + (absValue / 1000000000).toFixed(1) + "G";
    }
    if (absValue >= 1000000) {
        return sign + (absValue / 1000000).toFixed(1) + "M";
    }
    if (absValue >= 1000) {
        return sign + (absValue / 1000).toFixed(1) + "k";
    }
    return value.toFixed(0);
}

/**
 * Format a percentage value
 * @param value - Percentage value (0-100)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number): string {
    if (!Number.isFinite(value)) {
        return "0%";
    }

    const clampedValue = Math.max(0, Math.min(100, value));

    if (clampedValue >= 100) return "100%";
    if (clampedValue < 0.01 && clampedValue > 0) return "<0.01%";
    return clampedValue.toFixed(2) + "%";
}

/**
 * Format DPS (Damage Per Second) value
 * @param value - DPS value
 * @returns Formatted DPS string with "/s" suffix
 */
export function formatDPS(value: number): string {
    return formatStat(value) + "/s";
}

/**
 * Format HP display with current/max and percentage
 * @param current - Current HP
 * @param max - Maximum HP
 * @returns Formatted HP string (e.g., "1.2k/2.5k (48%)")
 */
export function formatHP(current: number, max: number): string {
    if (!Number.isFinite(current) || !Number.isFinite(max)) {
        return "0/0 (0%)";
    }

    const safeCurrent = Math.max(0, current);
    const safeMax = Math.max(0, max);
    const percent =
        safeMax > 0 ? ((safeCurrent / safeMax) * 100).toFixed(0) : "0";

    return `${formatStat(safeCurrent)}/${formatStat(safeMax)} (${percent}%)`;
}

/**
 * Format critical hit rate as percentage
 * @param value - Crit rate value (0-100)
 * @returns Formatted crit rate string
 */
export function formatCritRate(value: number): string {
    if (!Number.isFinite(value)) {
        return "0%";
    }

    const clampedValue = Math.max(0, Math.min(100, value));
    return clampedValue.toFixed(1) + "%";
}

/**
 * Get color for a specific role type
 * @param role - Role type ('dps', 'tank', or 'healer')
 * @returns Hex color code
 */
export function getRoleColor(role: "dps" | "tank" | "healer"): string {
    switch (role) {
        case "dps":
            return "#ff4444";
        case "tank":
            return "#4444ff";
        case "healer":
            return "#44ff44";
        default:
            return "#ffffff";
    }
}

/**
 * Get color for HP bar based on HP percentage
 * @param currentHp - Current HP value
 * @param maxHp - Maximum HP value
 * @returns Hex color code (green -> yellow -> orange -> red)
 */
export function getHPColor(currentHp: number, maxHp: number): string {
    if (!Number.isFinite(currentHp) || !Number.isFinite(maxHp) || maxHp <= 0) {
        return "#4ade80"; // default to green for invalid input
    }

    const percent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

    if (percent > 75) return "#4ade80"; // green
    if (percent > 50) return "#fbbf24"; // yellow
    if (percent > 25) return "#fb923c"; // orange
    return "#ef4444"; // red
}

/**
 * Create a debounced function that delays execution
 * @param func - Function to debounce
 * @param wait - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Create a throttled function that limits execution frequency
 * @param func - Function to throttle
 * @param limit - Minimum time between executions in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Format a duration in milliseconds to human-readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration (e.g., "2h 15m", "45s")
 */
export function formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) {
        return "0s";
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Format a Unix timestamp to localized date/time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string or "Invalid Date" on error
 */
export function formatDate(timestamp: number): string {
    if (!Number.isFinite(timestamp) || timestamp < 0) {
        return "Invalid Date";
    }

    try {
        const date = new Date(timestamp);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return "Invalid Date";
        }

        return date.toLocaleString();
    } catch (error) {
        return "Invalid Date";
    }
}
