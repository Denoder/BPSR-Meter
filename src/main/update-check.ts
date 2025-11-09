import { app, BrowserWindow, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { exec } from "child_process";
import AdmZip from "adm-zip";

export interface UpdateInfo {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl?: string;
    releaseNotes?: string;
    error?: string;
    canReinstall?: boolean;
}

const GITHUB_REPO = "Denoder/BPSR-Meter";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

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

export async function checkForUpdates(
    currentVersion: string,
): Promise<UpdateInfo> {
    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "BPSR-Meter",
            },
        });

        if (!response.ok) {
            throw new Error(
                `GitHub API returned ${response.status}: ${response.statusText}`,
            );
        }

        const release = await response.json();
        const latestVersion = release.tag_name.replace(/^v/, "");
        const cleanCurrentVersion = currentVersion.replace(/^v/, "");

        const comparison = compareVersions(latestVersion, cleanCurrentVersion);
        const isNewer = comparison > 0;

        const asset = release.assets?.find(
            (a: any) =>
                a.name.endsWith(".zip") &&
                a.name.includes("windows-x64") &&
                !a.name.endsWith(".sha256"),
        );

        return {
            available: isNewer,
            currentVersion: cleanCurrentVersion,
            latestVersion: latestVersion,
            downloadUrl: asset?.browser_download_url || release.html_url,
            releaseNotes: release.body,
            canReinstall: comparison === 0,
        };
    } catch (error) {
        console.error("Failed to check for updates:", error);
        return {
            available: false,
            currentVersion,
            latestVersion: currentVersion,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Downloads a file from URL to destination path
 */
async function downloadFile(
    url: string,
    destPath: string,
    onProgress?: (percent: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);

        https
            .get(url, (response) => {
                if (
                    response.statusCode === 302 ||
                    response.statusCode === 301
                ) {
                    if (response.headers.location) {
                        file.close();
                        fs.unlinkSync(destPath);
                        downloadFile(
                            response.headers.location,
                            destPath,
                            onProgress,
                        )
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                }

                const totalBytes = parseInt(
                    response.headers["content-length"] || "0",
                    10,
                );
                let downloadedBytes = 0;

                response.on("data", (chunk) => {
                    downloadedBytes += chunk.length;
                    if (onProgress && totalBytes > 0) {
                        onProgress(
                            Math.round((downloadedBytes / totalBytes) * 100),
                        );
                    }
                });

                response.pipe(file);

                file.on("finish", () => {
                    file.close();
                    resolve();
                });
            })
            .on("error", (err) => {
                fs.unlink(destPath, () => reject(err));
            });

        file.on("error", (err) => {
            fs.unlink(destPath, () => reject(err));
        });
    });
}

/**
 * Extracts ZIP and finds the installer EXE
 */
async function extractAndFindInstaller(
    zipPath: string,
    extractPath: string,
): Promise<string | null> {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const files = fs.readdirSync(extractPath);
    const exeFile = files.find(
        (f) => f.endsWith(".exe") && f.includes("Setup"),
    );

    return exeFile ? path.join(extractPath, exeFile) : null;
}

let pendingUpdateInfo: UpdateInfo | null = null;

/**
 * Gets the update window (assumes it's created via createOrFocusWindow)
 */
function getUpdateWindow(): BrowserWindow | null {
    return (
        BrowserWindow.getAllWindows().find((w) => w.getTitle() === "Update") ||
        null
    );
}

/**
 * Downloads, extracts, and runs the installer with progress updates
 */
async function downloadAndInstall(
    downloadUrl: string,
    version: string,
): Promise<void> {
    const tempDir = path.join(app.getPath("temp"), "bpsr-meter-update");
    const updateWindow = getUpdateWindow();

    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    fs.mkdirSync(tempDir, { recursive: true });

    const zipPath = path.join(tempDir, `update-${version}.zip`);
    const extractPath = path.join(tempDir, "extracted");

    try {
        updateWindow?.webContents.send(
            "update-status",
            "Downloading update...",
        );
        await downloadFile(downloadUrl, zipPath, (percent) => {
            updateWindow?.webContents.send("download-progress", percent);
        });

        updateWindow?.webContents.send("update-status", "Extracting files...");
        updateWindow?.webContents.send("download-progress", 100);

        fs.mkdirSync(extractPath, { recursive: true });
        const installerPath = await extractAndFindInstaller(
            zipPath,
            extractPath,
        );

        if (!installerPath) {
            throw new Error(
                "Installer executable not found in the downloaded package",
            );
        }

        updateWindow?.webContents.send("update-status", "Ready to install");

        await new Promise((resolve) => setTimeout(resolve, 500));

        exec(`"${installerPath}"`, (error) => {
            if (error) {
                console.error("Failed to run installer:", error);
            }
        });

        setTimeout(() => {
            app.quit();
        }, 500);
    } catch (error) {
        console.error("Update installation failed:", error);
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        updateWindow?.webContents.send("update-error", errorMessage);

        // Clean up
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

ipcMain.on("start-download", async () => {
    if (pendingUpdateInfo?.downloadUrl && pendingUpdateInfo?.latestVersion) {
        await downloadAndInstall(
            pendingUpdateInfo.downloadUrl,
            pendingUpdateInfo.latestVersion,
        );
    }
});

export async function showUpdateDialog(updateInfo: UpdateInfo): Promise<void> {
    pendingUpdateInfo = updateInfo;

    ipcMain.emit("open-update-window");

    const isUpdateWindowOpen = setInterval(() => {
        const updateWindow = getUpdateWindow();
        if (!updateWindow.isDestroyed() && pendingUpdateInfo) {
            setTimeout(() => {
                updateWindow.webContents.send("update-info", pendingUpdateInfo);
            }, 1000);
            clearInterval(isUpdateWindowOpen);
        }
    }, 1000);
}

export async function checkForUpdatesSilent(
    currentVersion: string,
): Promise<UpdateInfo> {
    const updateInfo = await checkForUpdates(currentVersion);

    if (updateInfo.available) {
        await showUpdateDialog(updateInfo);
    }

    return updateInfo;
}

export async function checkForUpdatesManual(
    currentVersion: string,
): Promise<UpdateInfo> {
    const updateInfo = await checkForUpdates(currentVersion);
    await showUpdateDialog(updateInfo);

    return updateInfo;
}
