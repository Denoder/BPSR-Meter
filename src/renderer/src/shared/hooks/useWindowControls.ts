import { useState, useEffect, useCallback, useRef } from "react";
import { setItem } from "@shared/utils/localStorage";
import { electron } from "@shared/utils/electron";

export interface UseWindowControlsOptions {
    baseWidth: number;
    baseHeight: number;
    windowType:
        | "main"
        | "group"
        | "history"
        | "device"
        | "settings"
        | "monsters"
        | "update";
}

export interface UseWindowControlsReturn {
    isLocked: boolean;
    scale: number;
    isDragging: boolean;
    toggleLock: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    handleDragStart: (e: React.MouseEvent) => void;
    handleMouseOver: (e: React.MouseEvent) => void;
    handleMouseOut: (e: React.MouseEvent) => void;
    handleClose: () => void;
}

export function useWindowControls(
    options: UseWindowControlsOptions,
): UseWindowControlsReturn {
    const { baseWidth, baseHeight, windowType } = options;

    const [isLocked, setIsLocked] = useState<boolean>(false);
    const [scale, setScale] = useState<number>(1);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const currentMouseEventsStateRef = useRef<boolean>(false);
    const dragStateRef = useRef<{
        startX: number;
        startY: number;
        startWindowX: number;
        startWindowY: number;
    } | null>(null);

    useEffect(() => {
        const loadSavedScale = async () => {
            try {
                const savedSizes = await electron.getSavedWindowSize();
                const savedScale = savedSizes?.[windowType]?.scale;

                if (savedScale) {
                    setScale(savedScale);
                    document.documentElement.style.setProperty(
                        "--scale",
                        savedScale.toString(),
                    );
                    console.log(
                        `Loaded saved ${windowType} window scale: ${savedScale}`,
                    );
                }
            } catch (error) {
                console.warn(
                    `Failed to load saved ${windowType} window scale:`,
                    error,
                );
            }
        };

        loadSavedScale();
    }, [windowType]);

    const applyScale = useCallback(
        (newScale: number) => {
            const clampedScale = Math.max(0.6, Math.min(1.8, newScale));
            setScale(clampedScale);

            document.documentElement.style.setProperty(
                "--scale",
                clampedScale.toString(),
            );

            setTimeout(() => {
                setItem(`${windowType}.scale`, clampedScale);
                electron.saveWindowSize(
                    windowType,
                    undefined,
                    undefined,
                    clampedScale,
                );
            }, 100);
        },
        [baseWidth, baseHeight, windowType],
    );

    // Zoom controls
    const zoomIn = useCallback(() => {
        applyScale(scale + 0.1);
    }, [scale, applyScale]);

    const zoomOut = useCallback(() => {
        applyScale(scale - 0.1);
    }, [scale, applyScale]);

    const handleDragStart = useCallback(async (e: React.MouseEvent) => {
        setIsDragging(true);

        const startX = e.screenX;
        const startY = e.screenY;
        const position = await electron.getWindowPosition();

        dragStateRef.current = {
            startX,
            startY,
            startWindowX: position.x,
            startWindowY: position.y,
        };

        e.preventDefault();
    }, []);

    // Setup lock state listener
    useEffect(() => {
        electron.setIgnoreMouseEvents(false);
        currentMouseEventsStateRef.current = false;

        electron.onLockStateChanged((locked: boolean) => {
            setIsLocked(locked);
            updateClickThroughState(locked, currentMouseEventsStateRef);
        });
    }, []);

    const toggleLock = () => electron.toggleLockState();

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStateRef.current) return;

            const deltaX = e.screenX - dragStateRef.current.startX;
            const deltaY = e.screenY - dragStateRef.current.startY;
            const newX = dragStateRef.current.startWindowX + deltaX;
            const newY = dragStateRef.current.startWindowY + deltaY;

            electron.setWindowPosition(windowType, newX, newY);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                dragStateRef.current = null;
                console.log("Drag ended");
                handleDragEndPersist();
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging || !dragStateRef.current) return;

            const deltaX = e.screenX - dragStateRef.current.startX;
            const deltaY = e.screenY - dragStateRef.current.startY;
            const newX = dragStateRef.current.startWindowX + deltaX;
            const newY = dragStateRef.current.startWindowY + deltaY;

            electron.setWindowPosition(windowType, newX, newY);
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (isDragging) {
                setIsDragging(false);
                dragStateRef.current = null;
                handleDragEndPersist();
            }
        };

        const handleDragEndPersist = async () => {
            try {
                const pos = await electron.getWindowPosition();
                if (
                    pos &&
                    typeof pos.x === "number" &&
                    typeof pos.y === "number"
                ) {
                    electron.saveWindowPosition?.(windowType, pos.x, pos.y);
                }
            } catch (err) {
                console.warn("Failed to persist window position:", err);
            }
        };

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [isDragging]);

    const handleMouseOver = useCallback(
        (e: React.MouseEvent) => {
            if (!isLocked) return;

            const isLockButton =
                (e.target as Element).closest("#lock-button") !== null;

            if (isLockButton) {
                enableMouseEvents(currentMouseEventsStateRef);
            }
        },
        [isLocked],
    );

    const handleMouseOut = useCallback(
        (e: React.MouseEvent) => {
            if (!isLocked) return;

            const relatedTarget = e.relatedTarget as Element | null;
            const isLeavingLockButton =
                relatedTarget?.closest("#lock-button") === null;

            if (isLeavingLockButton) {
                setTimeout(() => {
                    disableMouseEvents(currentMouseEventsStateRef);
                }, 50);
            }
        },
        [isLocked],
    );

    const handleClose = useCallback(() => {
        electron.closeWindow();
    }, []);

    return {
        isLocked,
        scale,
        isDragging,
        toggleLock,
        zoomIn,
        zoomOut,
        handleDragStart,
        handleClose,
        handleMouseOver,
        handleMouseOut,
    };
}

function updateClickThroughState(
    locked: boolean,
    mouseEventsStateRef: React.RefObject<boolean>,
): void {
    if (locked) {
        electron.setIgnoreMouseEvents(true, { forward: true });
        mouseEventsStateRef.current = true;
        console.log("Locked mode: click-through ENABLED");
    } else {
        electron.setIgnoreMouseEvents(false);
        mouseEventsStateRef.current = false;
        console.log("Unlocked mode: Mouse events ENABLED (fully interactive)");
    }
}

function enableMouseEvents(
    mouseEventsStateRef: React.RefObject<boolean>,
): void {
    if (mouseEventsStateRef.current) {
        electron.setIgnoreMouseEvents(false);
        mouseEventsStateRef.current = false;
        console.log("Mouse events ENABLED");
    }
}

function disableMouseEvents(
    mouseEventsStateRef: React.RefObject<boolean>,
): void {
    if (!mouseEventsStateRef.current) {
        electron.setIgnoreMouseEvents(true, { forward: true });
        mouseEventsStateRef.current = true;
        console.log("Mouse events DISABLED (click-through)");
    }
}
