import React, { useEffect, useState } from "react";
import { WindowHeader } from "@shared/components/WindowHeader";
import { useWindowControls } from "@shared/hooks/useWindowControls";
import { useWindowResize } from "@shared/hooks/useWindowResize";
import { useTranslations } from "@shared/hooks/useTranslations";
import { useSocket } from "@shared/hooks/useSocket";
import { electron, UpdateInfo } from "@shared/utils/electron";
import { getItem, setItem } from "@shared/utils/localStorage";
import ResizeHandle from "@shared/components/ResizeHandle";

export default function UpdateApp(): React.JSX.Element {
    useSocket();
    const { t } = useTranslations();
    const { handleDragStart, zoomIn, zoomOut, isLocked, handleClose } =
        useWindowControls({
            baseWidth: 500,
            baseHeight: 650,
            windowType: "update",
        });

    const { handleResizeStart } = useWindowResize("update");

    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        const unsubscribe = electron.onUpdateInfo((info: UpdateInfo) => {
            setUpdateInfo(info);
        });

        const unsubscribeProgress = electron.onDownloadProgress(
            (percent: number) => {
                setDownloadProgress(percent);
                setIsDownloading(true);
            },
        );

        const unsubscribeStatus = electron.onUpdateStatus((status: string) => {
            setStatusMessage(status);
        });

        const unsubscribeError = electron.onUpdateError((error: string) => {
            alert(`Update failed: ${error}`);
        });

        return () => {
            unsubscribe();
            unsubscribeProgress();
            unsubscribeStatus();
            unsubscribeError();
        };
    }, []);

    useEffect(() => {
        const disableTransparency = getItem("disableTransparency") === "true";
        document.body.style.backgroundColor = disableTransparency
            ? "#000"
            : "transparent";

        const transparencyAmount = getItem("transparencyAmount");
        const amount = transparencyAmount
            ? parseInt(transparencyAmount, 10)
            : 70;
        const opacity = amount / 100;
        document.documentElement.style.setProperty(
            "--transparency-amount",
            opacity.toString(),
        );

        const listener = electron.onTransparencySettingChanged(
            (isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled
                    ? "#000"
                    : "transparent";
            },
        );
        return listener;
    }, []);

    useEffect(() => {
        const unsubscribe = electron.onTransparencyAmountChanged(
            (amount: number) => {
                const opacity = amount / 100;
                document.documentElement.style.setProperty(
                    "--transparency-amount",
                    opacity.toString(),
                );
                setItem("transparencyAmount", amount.toString());
            },
        );
        return unsubscribe;
    }, []);

    useEffect(() => {
        const clickthroughEnabled = getItem("clickthroughEnabled") === "true";
        if (clickthroughEnabled) {
            electron.setIgnoreMouseEvents(true, { forward: true });
        }

        const unsubscribe = electron.onClickthroughChanged(
            (enabled: boolean) => {
                electron.setIgnoreMouseEvents(enabled, { forward: true });
                setItem("clickthroughEnabled", enabled.toString());
            },
        );
        return unsubscribe;
    }, []);

    const handleInstall = () => {
        electron.startDownload();
    };

    if (!updateInfo) {
        return (
            <div className="update-window">
                <WindowHeader
                    title={t("ui.titles.update")}
                    onClose={handleClose}
                    onDragStart={handleDragStart}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    isLocked={isLocked}
                    t={t}
                />
                <div className="content-area">
                    <div className="loading-container p-4 flex flex-col items-center justify-center">
                        <p className="text-(--text-secondary)">
                            {t("ui.messages.loadingUpdateInfo")}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="update-window">
            <ResizeHandle handleResizeStart={handleResizeStart} />

            <WindowHeader
                title={
                    updateInfo.available
                        ? t("ui.titles.updateAvailable")
                        : t("ui.titles.alreadyUpToDate")
                }
                onClose={handleClose}
                onDragStart={handleDragStart}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                isLocked={isLocked}
                t={t}
            />

            <div className="update-window-container p-4 flex flex-col gap-4">
                {/* Reinstall warning */}
                {updateInfo.canReinstall && (
                    <div className="p-4 mb-2 text-sm text-(--text-secondary) bg-(--bg-warning) border border-(--border-warning) rounded-(--radius)">
                        {t("ui.update.reinstallWarning")}
                    </div>
                )}

                {/* Version comparison */}
                <div className="flex justify-between p-6 bg-(--bg-light) border border-(--border) rounded-(--radius)">
                    <div className="text-center flex-1">
                        <div className="text-[11px] text-[var(--text-muted)] mb-[5px] uppercase tracking-[0.5px] font-semibold">
                            {t("ui.update.currentVersion")}
                        </div>
                        <div className="text-[18px] font-[700] text-[var(--text-primary)]">
                            {updateInfo.currentVersion}
                        </div>
                    </div>

                    <div className="flex items-center justify-center text-[20px] text-[var(--accent-primary)] py-0 px-[15px]">
                        →
                    </div>

                    <div className="text-center flex-1">
                        <div className="text-[11px] text-[var(--text-muted)] mb-[5px] uppercase tracking-[0.5px] font-semibold">
                            {t("ui.update.latestVersion")}
                        </div>
                        <div className="text-[18px] font-[700] text-[var(--text-primary)]">
                            {updateInfo.latestVersion}
                        </div>
                    </div>
                </div>

                {/* Release notes */}
                <div>
                    <div
                        className={`text-(--text-muted) mb-2 uppercase tracking-[0.5px] font-semibold`}
                    >
                        {t("ui.update.releaseNotes")}
                    </div>
                    <div
                        className={`bg-(--bg-light) border border-(--border) p-4 rounded-(--radius) max-h-[200px] overflow-y-auto text-(--text-secondary) text-sm leading-[1.6] release-notes`}
                        dangerouslySetInnerHTML={{
                            __html:
                                updateInfo.releaseNotes ||
                                t("ui.messages.noReleaseNotes"),
                        }}
                    />
                </div>

                {/* Download progress */}
                {isDownloading && (
                    <>
                        <div className="text-(--text-secondary) text-center">
                            {statusMessage ||
                                t("ui.messages.downloadingUpdate")}
                        </div>
                        <div className="bg-(--bg-light) border-(--border) rounded-(3px) overflow-hidden w-full h-6">
                            <div
                                className="h-full bg-(--accent-primary) transition-[width] duration-300 ease-in-out"
                                style={{
                                    width: `${downloadProgress}%`,
                                }}
                            />
                        </div>
                        <div className="text-center text-(--text-muted) text-sm">
                            {downloadProgress}%
                        </div>
                    </>
                )}

                {/* Action buttons */}
                <div className="flex gap-4 mb-4">
                    <button
                        className={`control-button p-4 flex-1 !text-sm ${isDownloading ? "opacity-50" : "opacity-100"}`}
                        onClick={handleClose}
                        disabled={isDownloading}
                    >
                        {updateInfo.canReinstall
                            ? t("ui.buttons.cancel")
                            : t("ui.buttons.remindLater")}
                    </button>
                    <button
                        className={`control-button p-4 flex-1 !text-sm ${isDownloading ? "opacity-50" : "opacity-100"} !bg-(--accent-primary) !border-(--accent-primary) !text-white`}
                        onClick={handleInstall}
                        disabled={isDownloading}
                    >
                        {updateInfo.canReinstall
                            ? t("ui.buttons.reinstall")
                            : t("ui.buttons.downloadInstall")}
                    </button>
                </div>
            </div>
        </div>
    );
}
