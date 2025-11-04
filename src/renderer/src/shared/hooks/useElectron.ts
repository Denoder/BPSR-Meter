import { useState, useEffect } from "react";

/**
 * Hook to access the Electron API exposed via preload script
 *
 * Provides access to Electron-specific functionality like window controls,
 * IPC communication, and system integration.
 *
 * @returns ElectronAPI instance or null if not in Electron environment
 *
 * @example
 * ```typescript
 * const electronAPI = useElectron();
 * if (electronAPI) {
 *   electronAPI.closeWindow();
 * }
 * ```
 */
export function useElectron() {
    if (typeof window === "undefined" || !window.electronAPI) {
        if (process.env.NODE_ENV === "development") {
            console.warn(
                "Electron API not available - running in browser mode?",
            );
        }
        return null;
    }
    return window.electronAPI;
}

/**
 * Hook to manage window lock state with Electron IPC
 *
 * The lock state controls whether the window can be moved and whether
 * it uses click-through mode (allowing clicks to pass through to apps below).
 *
 * @returns Object with isLocked state and toggleLock function
 *
 * @example
 * ```typescript
 * const { isLocked, toggleLock } = useElectronLock();
 * ```
 */
export function useElectronLock() {
    const [isLocked, setIsLocked] = useState<boolean>(false);
    const electronAPI = useElectron();

    useEffect(() => {
        if (!electronAPI) return;

        // Set up listener for lock state changes
        electronAPI.onLockStateChanged((locked: boolean) => {
            setIsLocked(locked);
        });
    }, [electronAPI]);

    const toggleLock = () => {
        if (electronAPI) {
            electronAPI.toggleLockState();
        }
    };

    return { isLocked, toggleLock };
}

/**
 * Hook to handle window dragging functionality
 *
 * Provides utilities for implementing window drag-to-move behavior.
 *
 * @returns Object with handleDragStart and handleDragMove functions
 *
 * @example
 * ```typescript
 * const { handleDragStart, handleDragMove } = useWindowDrag();
 *
 * // In drag indicator mousedown handler
 * const dragState = await handleDragStart(e.screenX, e.screenY);
 *
 * // In document mousemove handler
 * handleDragMove(dragState, e.screenX, e.screenY);
 * ```
 */
export function useWindowDrag() {
    const electronAPI = useElectron();

    const handleDragStart = async (startX: number, startY: number) => {
        if (!electronAPI) return null;

        const position = await electronAPI.getWindowPosition();
        return {
            startWindowX: position.x,
            startWindowY: position.y,
            startMouseX: startX,
            startMouseY: startY,
        };
    };

    const handleDragMove = (
        dragState: {
            startWindowX: number;
            startWindowY: number;
            startMouseX: number;
            startMouseY: number;
        } | null,
        currentX: number,
        currentY: number,
    ) => {
        if (!electronAPI || !dragState) return;

        const deltaX = currentX - dragState.startMouseX;
        const deltaY = currentY - dragState.startMouseY;
        const newX = dragState.startWindowX + deltaX;
        const newY = dragState.startWindowY + deltaY;

        electronAPI.setWindowPosition(newX, newY);
    };

    return { handleDragStart, handleDragMove };
}

/**
 * Hook to manage window zoom/scale functionality
 *
 * Handles window scaling with persistent settings and proper window resizing.
 * Scale range: 0.6x to 1.8x
 *
 * @param windowType - Type of window ('main', 'group', or 'history')
 * @param baseWidth - Base window width at 1.0 scale
 * @param baseHeight - Base window height at 1.0 scale
 * @returns Object with scale state and zoom control functions
 *
 * @example
 * ```typescript
 * const { scale, zoomIn, zoomOut } = useWindowZoom('main', 650, 700);
 * ```
 */
export function useWindowZoom(
    windowType: "main" | "group" | "history",
    baseWidth: number,
    baseHeight: number,
) {
    const [scale, setScale] = useState<number>(1);
    const electronAPI = useElectron();

    useEffect(() => {
        // Load saved scale on mount
        if (!electronAPI) return;

        electronAPI.getSavedWindowSizes().then((savedSizes) => {
            const savedScale = savedSizes[windowType]?.scale;
            if (savedScale) {
                setScale(savedScale);
                document.documentElement.style.setProperty(
                    "--scale",
                    savedScale.toString(),
                );
            }
        });
    }, [electronAPI, windowType]);

    const applyScale = (newScale: number) => {
        if (!electronAPI) return;

        const clampedScale = Math.max(0.6, Math.min(1.8, newScale));
        setScale(clampedScale);

        // Update CSS variable
        document.documentElement.style.setProperty(
            "--scale",
            clampedScale.toString(),
        );

        // Calculate scaled dimensions
        const scaledWidth = Math.floor(baseWidth * clampedScale);
        const scaledHeight = Math.floor(baseHeight * clampedScale);

        // Resize window
        electronAPI.resizeWindowToContent(
            windowType,
            scaledWidth,
            scaledHeight,
            clampedScale,
        );

        // Save settings
        setTimeout(() => {
            electronAPI.saveWindowSize(
                windowType,
                scaledWidth,
                scaledHeight,
                clampedScale,
            );
        }, 100);
    };

    const zoomIn = () => applyScale(scale + 0.1);
    const zoomOut = () => applyScale(scale - 0.1);

    return { scale, applyScale, zoomIn, zoomOut };
}
