import { useState, useEffect, useCallback, useRef } from "react";

export interface UseWindowControlsOptions {
    baseWidth: number;
    baseHeight: number;
    windowType: "main" | "group" | "history" | "device" | "settings" | "monsters";
}

export interface UseWindowControlsReturn {
    scale: number;
    isDragging: boolean;
    zoomIn: () => void;
    zoomOut: () => void;
    handleDragStart: (e: React.MouseEvent) => void;
    handleClose: () => void;
}

export function useWindowControls(
    options: UseWindowControlsOptions,
): UseWindowControlsReturn {
    const { baseWidth, baseHeight, windowType } = options;

    const [scale, setScale] = useState<number>(1);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const dragStateRef = useRef<{
        startX: number;
        startY: number;
        startWindowX: number;
        startWindowY: number;
    } | null>(null);

    useEffect(() => {
        const loadSavedScale = async () => {
            if (!window.electronAPI) return;

            try {
                const savedSizes =
                    await window.electronAPI.getSavedWindowSizes();
                const savedScale = savedSizes[windowType]?.scale;

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
            if (!window.electronAPI) return;

            const clampedScale = Math.max(0.6, Math.min(1.8, newScale));
            setScale(clampedScale);

            document.documentElement.style.setProperty(
                "--scale",
                clampedScale.toString(),
            );

            const scaledWidth = Math.floor(baseWidth * clampedScale);
            const scaledHeight = Math.floor(baseHeight * clampedScale);

            window.electronAPI.resizeWindowToContent(
                windowType,
                scaledWidth,
                scaledHeight,
                clampedScale,
            );

            setTimeout(() => {
                window.electronAPI.saveWindowSize(
                    windowType,
                    scaledWidth,
                    scaledHeight,
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
        if (!window.electronAPI) return;

        setIsDragging(true);

        const startX = e.screenX;
        const startY = e.screenY;
        const position = await window.electronAPI.getWindowPosition();

        dragStateRef.current = {
            startX,
            startY,
            startWindowX: position.x,
            startWindowY: position.y,
        };

        e.preventDefault();
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !window.electronAPI || !dragStateRef.current)
                return;

            const deltaX = e.screenX - dragStateRef.current.startX;
            const deltaY = e.screenY - dragStateRef.current.startY;
            const newX = dragStateRef.current.startWindowX + deltaX;
            const newY = dragStateRef.current.startWindowY + deltaY;

            window.electronAPI.setWindowPosition(newX, newY);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                dragStateRef.current = null;
                console.log("Drag ended");
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging || !window.electronAPI || !dragStateRef.current)
                return;

            const deltaX = e.screenX - dragStateRef.current.startX;
            const deltaY = e.screenY - dragStateRef.current.startY;
            const newX = dragStateRef.current.startWindowX + deltaX;
            const newY = dragStateRef.current.startWindowY + deltaY;

            window.electronAPI.setWindowPosition(newX, newY);
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (isDragging) {
                setIsDragging(false);
                dragStateRef.current = null;
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

    // Handle window close
    const handleClose = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.closeWindow();
        }
    }, []);

    return {
        scale,
        isDragging,
        zoomIn,
        zoomOut,
        handleDragStart,
        handleClose,
    };
}
