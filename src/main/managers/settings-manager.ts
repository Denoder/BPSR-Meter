import fs from "fs/promises";
import { WindowType, WindowSize, WindowPosition } from "../constants";
import type { GlobalSettings } from "../../types";

export class SettingsManager {
    settingsPath: string;

    constructor(settingsPath: string) {
        this.settingsPath = settingsPath;
    }

    async getSettings(): Promise<GlobalSettings> {
        try {
            const data = await fs.readFile(this.settingsPath, "utf8");
            return JSON.parse(data);
        } catch {
            return {} as GlobalSettings;
        }
    }

    async updateSettings(updates: GlobalSettings): Promise<GlobalSettings> {
        const current = await this.getSettings();
        const merged = { ...current, ...updates };
        await fs.writeFile(this.settingsPath, JSON.stringify(merged, null, 4));
        return merged;
    }

    async getWindowSizes(
        defaultSizes: Record<WindowType, WindowSize>,
    ): Promise<Record<WindowType, WindowSize>> {
        try {
            const settings = await this.getSettings();
            if (settings.windowSizes) {
                Object.entries(settings.windowSizes).forEach(([type, size]) => {
                    if (type in defaultSizes) {
                        defaultSizes[type as WindowType] = size as WindowSize;
                    }
                });
                return settings.windowSizes as Record<WindowType, WindowSize>;
            }
        } catch {}
        return defaultSizes;
    }

    async getWindowPositions(
        defaultPositions: Record<WindowType, WindowPosition>,
    ): Promise<Record<WindowType, WindowPosition>> {
        try {
            const settings = await this.getSettings();
            if (settings.windowPositions) {
                Object.entries(settings.windowPositions).forEach(
                    ([type, pos]) => {
                        if (type in defaultPositions) {
                            defaultPositions[type as WindowType] =
                                pos as WindowPosition;
                        }
                    },
                );
                return settings.windowPositions as Record<
                    WindowType,
                    WindowPosition
                >;
            }
        } catch {}
        return defaultPositions;
    }

    async saveWindowSize(
        windowType: WindowType,
        size: WindowSize,
    ): Promise<void> {
        try {
            const settings = await this.getSettings();
            settings.windowSizes = {
                ...settings.windowSizes,
                [windowType]: size,
            };
            await this.updateSettings(settings);
        } catch (error) {
            throw new Error(`Error saving window size: ${error}`);
        }
    }

    async saveWindowPosition(
        windowType: WindowType,
        pos: { x: number; y: number },
    ): Promise<void> {
        try {
            const settings = await this.getSettings();
            settings.windowPositions = {
                ...settings.windowPositions,
                [windowType]: pos,
            };
            await this.updateSettings(settings);
        } catch (error) {
            throw new Error(`Error saving window position: ${error}`);
        }
    }
}
