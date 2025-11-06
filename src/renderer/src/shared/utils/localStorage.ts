/**
 * Get an item from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - Optional default value if key doesn't exist or parsing fails
 * @returns The parsed value or defaultValue
 */
export function getItem<T = string>(key: string, defaultValue?: T): T | null {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue ?? null;
        }
        return item as T;
    } catch (err) {
        console.warn(`Failed to get localStorage item '${key}':`, err);
        return defaultValue ?? null;
    }
}

/**
 * Get a boolean value from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - Optional default value if key doesn't exist
 * @returns The boolean value or defaultValue
 */
export function getBoolean(key: string, defaultValue?: boolean): boolean {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue ?? false;
        }
        return item === "true";
    } catch (err) {
        console.warn(`Failed to get localStorage boolean '${key}':`, err);
        return defaultValue ?? false;
    }
}

/**
 * Get a number value from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - Optional default value if key doesn't exist or parsing fails
 * @returns The number value or defaultValue
 */
export function getNumber(key: string, defaultValue?: number): number | null {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue ?? null;
        }
        const parsed = parseInt(item, 10);
        return isNaN(parsed) ? (defaultValue ?? null) : parsed;
    } catch (err) {
        console.warn(`Failed to get localStorage number '${key}':`, err);
        return defaultValue ?? null;
    }
}

/**
 * Get a JSON object from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - Optional default value if key doesn't exist or parsing fails
 * @returns The parsed JSON object or defaultValue
 */
export function getJSON<T = any>(key: string, defaultValue?: T): T | null {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue ?? null;
        }
        return JSON.parse(item) as T;
    } catch (err) {
        console.warn(`Failed to get localStorage JSON '${key}':`, err);
        return defaultValue ?? null;
    }
}

/**
 * Set an item in localStorage
 * @param key - The key to set
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function setItem(key: string, value: string | number | boolean): boolean {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch (err) {
        console.warn(`Failed to set localStorage item '${key}':`, err);
        return false;
    }
}

/**
 * Set a JSON object in localStorage
 * @param key - The key to set
 * @param value - The object to store
 * @returns true if successful, false otherwise
 */
export function setJSON(key: string, value: any): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.warn(`Failed to set localStorage JSON '${key}':`, err);
        return false;
    }
}

/**
 * Remove an item from localStorage
 * @param key - The key to remove
 * @returns true if successful, false otherwise
 */
export function removeItem(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (err) {
        console.warn(`Failed to remove localStorage item '${key}':`, err);
        return false;
    }
}

/**
 * Clear all items from localStorage
 * @returns true if successful, false otherwise
 */
export function clear(): boolean {
    try {
        localStorage.clear();
        return true;
    } catch (err) {
        console.warn("Failed to clear localStorage:", err);
        return false;
    }
}
