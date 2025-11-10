import { useEffect, useRef, useState } from "react";
import { setItem, getItem } from "@shared/utils/localStorage";
import { electron } from "@shared/utils/electron";

type ResizeDirection =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

type WindowType =
    | "main"
    | "group"
    | "history"
    | "device"
    | "settings"
    | "monsters"
    | "update";

export function useWindowResize(windowType: WindowType) {
    const [isResizing, setIsResizing] = useState(false);
    const resizeStateRef = useRef<{
        direction: ResizeDirection;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
        startWindowX: number;
        startWindowY: number;
    } | null>(null);

    const handleResizeStart = (
        e: React.PointerEvent<HTMLDivElement>,
        direction: ResizeDirection,
    ) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsResizing(true);

        electron.setIgnoreMouseEvents(false);

        const startX = e.screenX;
        const startY = e.screenY;

        electron
            .getWindowPosition()
            .then(
                (position: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }) => {
                    resizeStateRef.current = {
                        direction,
                        startX,
                        startY,
                        startWidth: position.width,
                        startHeight: position.height,
                        startWindowX: position.x,
                        startWindowY: position.y,
                    };
                },
            );
    };

    useEffect(() => {
        let animationFrameId: number | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !resizeStateRef.current) return;

            e.preventDefault();

            if (animationFrameId !== null) {
                return;
            }

            animationFrameId = requestAnimationFrame(() => {
                animationFrameId = null;

                if (!resizeStateRef.current) return;

                const {
                    direction,
                    startX,
                    startY,
                    startWidth,
                    startHeight,
                    startWindowX,
                    startWindowY,
                } = resizeStateRef.current;
                const deltaX = e.screenX - startX;
                const deltaY = e.screenY - startY;

                const minWidth = 400;
                const minHeight = 30;

                let newWidth = startWidth;
                let newHeight = startHeight;
                let newX = startWindowX;
                let newY = startWindowY;

                switch (direction) {
                    case "right":
                        newWidth = Math.max(startWidth + deltaX, minWidth);
                        break;
                    case "left":
                        newWidth = Math.max(startWidth - deltaX, minWidth);
                        if (startWidth - deltaX >= minWidth) {
                            newX = startWindowX + deltaX;
                        } else {
                            newX = startWindowX + (startWidth - minWidth);
                        }
                        break;
                    case "bottom":
                        newHeight = Math.max(startHeight + deltaY, minHeight);
                        break;
                    case "top":
                        newHeight = Math.max(startHeight - deltaY, minHeight);
                        if (startHeight - deltaY >= minHeight) {
                            newY = startWindowY + deltaY;
                        } else {
                            newY = startWindowY + (startHeight - minHeight);
                        }
                        break;
                    case "bottom-right":
                        newWidth = Math.max(startWidth + deltaX, minWidth);
                        newHeight = Math.max(startHeight + deltaY, minHeight);
                        break;
                    case "bottom-left":
                        newWidth = Math.max(startWidth - deltaX, minWidth);
                        newHeight = Math.max(startHeight + deltaY, minHeight);
                        if (startWidth - deltaX >= minWidth) {
                            newX = startWindowX + deltaX;
                        } else {
                            newX = startWindowX + (startWidth - minWidth);
                        }
                        break;
                    case "top-right":
                        newWidth = Math.max(startWidth + deltaX, minWidth);
                        newHeight = Math.max(startHeight - deltaY, minHeight);
                        if (startHeight - deltaY >= minHeight) {
                            newY = startWindowY + deltaY;
                        } else {
                            newY = startWindowY + (startHeight - minHeight);
                        }
                        break;
                    case "top-left":
                        newWidth = Math.max(startWidth - deltaX, minWidth);
                        newHeight = Math.max(startHeight - deltaY, minHeight);
                        if (startWidth - deltaX >= minWidth) {
                            newX = startWindowX + deltaX;
                        } else {
                            newX = startWindowX + (startWidth - minWidth);
                        }
                        if (startHeight - deltaY >= minHeight) {
                            newY = startWindowY + deltaY;
                        } else {
                            newY = startWindowY + (startHeight - minHeight);
                        }
                        break;
                }

                if (direction.includes("left") || direction.includes("top")) {
                    electron.setWindowPosition(
                        windowType,
                        Math.round(newX),
                        Math.round(newY),
                    );
                }

                electron.resizeWindow(
                    windowType,
                    Math.round(newWidth),
                    Math.round(newHeight),
                );

                setItem(`${windowType}.width`, Math.ceil(newWidth));
                setItem(`${windowType}.height`, Math.ceil(newHeight));
            });
        };

        const handleMouseUp = () => {
            if (isResizing) {
                electron.saveWindowSize(
                    windowType,
                    Number(getItem(`${windowType}.width`)),
                    Number(getItem(`${windowType}.height`)),
                    Number(getItem(`${windowType}.scale`, 1)),
                );
                setIsResizing(false);
                resizeStateRef.current = null;
            }
        };

        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove, true);
            window.addEventListener("mouseup", handleMouseUp, true);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove, true);
            window.removeEventListener("mouseup", handleMouseUp, true);
        };
    }, [isResizing]);

    return {
        isResizing,
        handleResizeStart,
    };
}
