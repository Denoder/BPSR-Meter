import { useState, useEffect, useCallback, useRef } from "react";

export interface UseElectronIntegrationOptions {
    baseWidth?: number;
    baseHeight?: number;
}

export interface UseElectronIntegrationReturn {
    isLocked: boolean;
    scale: number;
    isDragging: boolean;
    isScrolling: boolean;
    toggleLock: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    handleDragStart: (e: React.MouseEvent) => void;
    handleMouseOver: (e: React.MouseEvent) => void;
    handleMouseOut: (e: React.MouseEvent) => void;
    handleMouseLeave: () => void;
    handleWheel: (e: React.WheelEvent) => void;
}

export function useElectronIntegration(
    options: UseElectronIntegrationOptions = {},
): UseElectronIntegrationReturn {
    const { baseWidth = 650, baseHeight = 700 } = options;

    const [isLocked, setIsLocked] = useState<boolean>(false);
    const [scale, setScale] = useState<number>(1);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isScrolling, setIsScrolling] = useState<boolean>(false);

    const currentMouseEventsStateRef = useRef<boolean>(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
                if (savedSizes && savedSizes.main && savedSizes.main.scale) {
                    const savedScale = savedSizes.main.scale;
                    setScale(savedScale);
                    document.documentElement.style.setProperty(
                        "--scale",
                        savedScale.toString(),
                    );
                    console.log(`Loaded saved scale: ${savedScale}`);
                }
            } catch (error) {
                console.warn("Failed to load saved window scale:", error);
            }
        };

        loadSavedScale();
    }, []);

    // Setup lock state listener
    useEffect(() => {
        if (!window.electronAPI) return;

        window.electronAPI.setIgnoreMouseEvents(false);
        currentMouseEventsStateRef.current = false;
        console.log("Initial state: Mouse events ENABLED (UI is interactive)");

        window.electronAPI.onLockStateChanged((locked: boolean) => {
            setIsLocked(locked);
            updateClickThroughState(locked, currentMouseEventsStateRef);
        });
    }, []);

    const toggleLock = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.toggleLockState();
        }
    }, []);

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
                "main",
                scaledWidth,
                scaledHeight,
                clampedScale,
            );

            setTimeout(() => {
                window.electronAPI.saveWindowSize(
                    "main",
                    scaledWidth,
                    scaledHeight,
                    clampedScale,
                );
            }, 100);
        },
        [baseWidth, baseHeight],
    );

    const zoomIn = useCallback(() => {
        if (isLocked) return;
        applyScale(scale + 0.1);
    }, [scale, isLocked, applyScale]);

    const zoomOut = useCallback(() => {
        if (isLocked) return;
        applyScale(scale - 0.1);
    }, [scale, isLocked, applyScale]);

    const handleDragStart = useCallback(
        async (e: React.MouseEvent) => {
            if (isLocked || !window.electronAPI) return;

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

            enableMouseEvents(currentMouseEventsStateRef);
            e.preventDefault();
        },
        [isLocked],
    );

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (
                !isDragging ||
                isLocked ||
                !window.electronAPI ||
                !dragStateRef.current
            )
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

                setTimeout(() => {
                    if (!isDragging) {
                        disableMouseEvents(
                            currentMouseEventsStateRef,
                            isScrolling,
                        );
                    }
                }, 100);
            }
        };

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isLocked, isScrolling]);

    const handleMouseOver = useCallback(
        (e: React.MouseEvent) => {
            if (!window.electronAPI) return;

            let shouldEnableEvents = false;

            if (isLocked) {
                const essentialSelectors = [
                    ".controls",
                    ".control-button",
                    ".sync-button",
                    ".advanced-lite-btn",
                    "#player-bars-container",
                    ".skills-container",
                    ".modal",
                    ".add-to-registry-btn",
                ];
                shouldEnableEvents = essentialSelectors.some(
                    (selector) => (e.target as Element).closest(selector) !== null,
                );
            } else {
                const allSelectors = [
                    ".controls",
                    ".drag-indicator",
                    "#player-bars-container",
                    ".skills-container",
                    ".modal",
                    ".add-to-registry-btn",
                ];
                shouldEnableEvents = allSelectors.some(
                    (selector) =>
                        (e.target as Element).closest(selector) !== null,
                );
            }

            if (shouldEnableEvents) {
                enableMouseEvents(currentMouseEventsStateRef);
            }
        },
        [isLocked],
    );

    const handleMouseOut = useCallback(
        (e: React.MouseEvent) => {
            setTimeout(() => {
                let shouldKeepEvents = false;
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const elementUnderMouse = document.elementFromPoint(
                    mouseX,
                    mouseY,
                );

                if (elementUnderMouse) {
                    if (isLocked) {
                        const essentialSelectors = [
                            ".controls",
                            ".control-button",
                            ".sync-button",
                            ".advanced-lite-btn",
                            "#player-bars-container",
                            ".skills-container",
                            ".modal",
                        ];
                        shouldKeepEvents = essentialSelectors.some(
                            (selector) => elementUnderMouse.closest(selector) !== null,
                        );
                    } else {
                        const allSelectors = [
                            ".controls",
                            ".drag-indicator",
                            "#player-bars-container",
                            ".skills-container",
                            ".modal",
                        ];
                        shouldKeepEvents = allSelectors.some(
                            (selector) => elementUnderMouse.closest(selector) !== null,
                        );
                    }
                }

                if (!shouldKeepEvents) {
                    disableMouseEvents(currentMouseEventsStateRef, isScrolling);
                }
            }, 50);
        },
        [isLocked, isScrolling],
    );

    const handleMouseLeave = useCallback(() => {
        disableMouseEvents(currentMouseEventsStateRef, isScrolling);
    }, [isScrolling]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const scrollableElements = [
            ".skills-container",
            ".dps-meter-container",
        ];
        const scrollableElement = scrollableElements.find(
            (selector) => (e.target as Element).closest(selector) !== null,
        );

        if (scrollableElement) {
            setIsScrolling(true);
            enableMouseEvents(currentMouseEventsStateRef);

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                console.log("Scrolling ended");
            }, 150);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    return {
        isLocked,
        scale,
        isDragging,
        isScrolling,
        toggleLock,
        zoomIn,
        zoomOut,
        handleDragStart,
        handleMouseOver,
        handleMouseOut,
        handleMouseLeave,
        handleWheel,
    };
}

function updateClickThroughState(
    locked: boolean,
    mouseEventsStateRef: React.MutableRefObject<boolean>,
): void {
    if (!window.electronAPI) return;

    if (locked) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
        mouseEventsStateRef.current = true;
        console.log("Locked mode: click-through ENABLED");
    } else {
        window.electronAPI.setIgnoreMouseEvents(false);
        mouseEventsStateRef.current = false;
        console.log("Unlocked mode: Mouse events ENABLED (fully interactive)");
    }
}

function enableMouseEvents(
    mouseEventsStateRef: React.MutableRefObject<boolean>,
): void {
    if (window.electronAPI && mouseEventsStateRef.current) {
        window.electronAPI.setIgnoreMouseEvents(false);
        mouseEventsStateRef.current = false;
        console.log("Mouse events ENABLED");
    }
}

function disableMouseEvents(
    mouseEventsStateRef: React.MutableRefObject<boolean>,
    isScrolling: boolean,
): void {
    if (isScrolling) {
        console.log("Mouse events NOT disabled (user is scrolling)");
        return;
    }

    if (window.electronAPI && !mouseEventsStateRef.current) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
        mouseEventsStateRef.current = true;
        console.log("Mouse events DISABLED (click-through)");
    }
}
