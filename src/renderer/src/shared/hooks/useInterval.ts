import { useEffect, useRef } from "react";

/**
 * Custom hook for setting up an interval that persists across re-renders
 * Uses refs to avoid recreating the interval on every render
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Delay in milliseconds, or null to pause the interval
 */
export function useInterval(callback: () => void, delay: number | null): void {
    const savedCallback = useRef<() => void>(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) {
            return;
        }

        const id = setInterval(() => {
            savedCallback.current();
        }, delay);

        return () => {
            clearInterval(id);
        };
    }, [delay]);
}
