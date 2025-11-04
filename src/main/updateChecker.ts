import { dialog } from "electron";
import { shell } from "electron";

export interface UpdateInfo {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl?: string;
    releaseNotes?: string;
    error?: string;
}

const GITHUB_REPO = "Denoder/BPSR-Meter";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compares two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const cleanV1 = v1.replace(/^v/, "");
    const cleanV2 = v2.replace(/^v/, "");

    const parts1 = cleanV1.split(".").map(Number);
    const parts2 = cleanV2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }

    return 0;
}

/**
 * Checks GitHub releases for updates
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "BPSR-Meter"
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
        }

        const release = await response.json();
        const latestVersion = release.tag_name.replace(/^v/, "");
        const cleanCurrentVersion = currentVersion.replace(/^v/, "");

        const isNewer = compareVersions(latestVersion, cleanCurrentVersion) > 0;

        const asset = release.assets?.find((a: any) => 
            a.name.endsWith(".zip") && 
            a.name.includes("windows-x64") && 
            !a.name.endsWith(".sha256")
        );

        return {
            available: isNewer,
            currentVersion: cleanCurrentVersion,
            latestVersion: latestVersion,
            downloadUrl: asset?.browser_download_url || release.html_url,
            releaseNotes: release.body
        };
    } catch (error) {
        console.error("Failed to check for updates:", error);
        return {
            available: false,
            currentVersion,
            latestVersion: currentVersion,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Shows an update dialog to the user
 */
export async function showUpdateDialog(updateInfo: UpdateInfo): Promise<void> {
    const { latestVersion, currentVersion, downloadUrl, releaseNotes } = updateInfo;

    const message = `A new version of BPSR Meter is available!\n\nCurrent version: ${currentVersion}\nLatest version: ${latestVersion}\n\n${releaseNotes ? `Release notes:\n${releaseNotes.substring(0, 300)}${releaseNotes.length > 300 ? "..." : ""}` : ""}`;

    const response = await dialog.showMessageBox({
        type: "info",
        title: "Update Available",
        message: "BPSR Meter Update",
        detail: message,
        buttons: ["Download Update", "Remind Me Later"],
        defaultId: 0,
        cancelId: 1
    });

    if (response.response === 0 && downloadUrl) {
        shell.openExternal(downloadUrl);
    }
}

/**
 * Checks for updates silently (no dialog if no update available)
 */
export async function checkForUpdatesSilent(currentVersion: string): Promise<UpdateInfo> {
    const updateInfo = await checkForUpdates(currentVersion);
    
    if (updateInfo.available) {
        await showUpdateDialog(updateInfo);
    }
    
    return updateInfo;
}
