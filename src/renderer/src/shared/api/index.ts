/**
 * API communication layer
 *
 * This module provides centralized API calls to the backend server using Socket.IO.
 * All functions include proper error handling and type safety.
 */

import type {
    ApiResponse,
    PlayerData,
    Settings,
    ManualGroupState,
    PlayerRegistry,
} from "../types";
import { getSocket } from "../hooks/useSocket";

const isDevelopment = process.env.NODE_ENV === "development";

function logError(context: string, error: unknown): void {
    if (isDevelopment) {
        console.error(`[API Error - ${context}]:`, error);
    }
}

/**
 * Emit a Socket.IO event and wait for response
 */
function emitWithCallback<T = any>(event: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
        const socket = getSocket();
        if (!socket || !socket.connected) {
            reject(new Error("Socket not connected"));
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error(`Socket request timeout for event: ${event}`));
        }, 5000);

        if (data) {
            socket.emit(event, data, (response: T) => {
                clearTimeout(timeout);
                resolve(response);
            });
        } else {
            socket.emit(event, (response: T) => {
                clearTimeout(timeout);
                resolve(response);
            });
        }
    });
}

export async function fetchPlayerData(): Promise<PlayerData[]> {
    try {
        const result: ApiResponse<PlayerData[]> = await emitWithCallback("getPlayerData");

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("fetchPlayerData", `Invalid response code: ${result.code}`);
        return [];
    } catch (error) {
        logError("fetchPlayerData", error);
        return [];
    }
}

export async function fetchSettings(): Promise<Settings> {
    try {
        const result: ApiResponse<Settings> = await emitWithCallback("getSettings");

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("fetchSettings", `Invalid response code: ${result.code}`);
        return null;
    } catch (error) {
        logError("fetchSettings", error);
        return null;
    }
}

export async function resetStatistics(): Promise<boolean> {
    try {
        const result: ApiResponse = await emitWithCallback("resetStatistics");
        return result.code === 0;
    } catch (error) {
        logError("resetStatistics", error);
        return false;
    }
}

export async function changeLanguage(language: string): Promise<boolean> {
    if (!language || typeof language !== "string") {
        logError("changeLanguage", "Invalid language parameter");
        return false;
    }

    try {
        const result: ApiResponse = await emitWithCallback("changeLanguage", { language });
        return result.code === 0;
    } catch (error) {
        logError("changeLanguage", error);
        return false;
    }
}

export async function getManualGroup(): Promise<ManualGroupState | null> {
    try {
        const result: ApiResponse<ManualGroupState> = await emitWithCallback("getManualGroup");

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("getManualGroup", `Invalid response code: ${result.code}`);
        return null;
    } catch (error) {
        logError("getManualGroup", error);
        return null;
    }
}

export async function updateManualGroup(
    groupState: ManualGroupState,
): Promise<boolean> {
    if (
        !groupState ||
        typeof groupState.enabled !== "boolean" ||
        !Array.isArray(groupState.members)
    ) {
        logError("updateManualGroup", "Invalid groupState parameter");
        return false;
    }

    try {
        const result: ApiResponse = await emitWithCallback("updateManualGroup", groupState);
        return result.code === 0;
    } catch (error) {
        logError("updateManualGroup", error);
        return false;
    }
}

export async function clearManualGroup(): Promise<boolean> {
    try {
        const result: ApiResponse = await emitWithCallback("clearManualGroup");
        return result.code === 0;
    } catch (error) {
        logError("clearManualGroup", error);
        return false;
    }
}

export async function getPlayerRegistry(): Promise<PlayerRegistry> {
    try {
        const result: ApiResponse<PlayerRegistry> = await emitWithCallback("getPlayerRegistry");

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("getPlayerRegistry", `Invalid response code: ${result.code}`);
        return {};
    } catch (error) {
        logError("getPlayerRegistry", error);
        return {};
    }
}

export async function addToPlayerRegistry(
    uuid: string,
    name: string,
): Promise<boolean> {
    if (
        !uuid ||
        !name ||
        typeof uuid !== "string" ||
        typeof name !== "string"
    ) {
        logError("addToPlayerRegistry", "Invalid uuid or name parameter");
        return false;
    }

    try {
        const result: ApiResponse = await emitWithCallback("addToPlayerRegistry", { uuid, name });
        return result.code === 0;
    } catch (error) {
        logError("addToPlayerRegistry", error);
        return false;
    }
}
