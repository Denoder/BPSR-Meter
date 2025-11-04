/**
 * Centralized Socket.IO connection hook
 * 
 * This hook manages a singleton Socket.IO connection for the entire application.
 * It provides methods to emit events and listen for responses.
 */

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_PORT = 8989;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Singleton socket instance
let socketInstance: Socket | null = null;

export interface SocketRequestOptions {
    event: string;
    data?: any;
    timeout?: number;
}

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Create socket instance if it doesn't exist
        if (!socketInstance) {
            socketInstance = io(SERVER_URL, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
            });

            socketInstance.on("connect", () => {
                console.log("Socket.IO connected to server");
            });

            socketInstance.on("disconnect", (reason) => {
                console.log("Socket.IO disconnected:", reason);
            });

            socketInstance.on("error", (error) => {
                console.error("Socket.IO error:", error);
            });
        }

        socketRef.current = socketInstance;

        return () => {};
    }, []);

    /**
     * Emit an event and wait for a response
     */
    const emitWithResponse = useCallback(
        <T = any>(options: SocketRequestOptions): Promise<T> => {
            return new Promise((resolve, reject) => {
                if (!socketRef.current || !socketRef.current.connected) {
                    reject(new Error("Socket not connected"));
                    return;
                }

                const timeout = options.timeout || 5000;
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Socket request timeout for event: ${options.event}`));
                }, timeout);

                socketRef.current.emit(
                    options.event,
                    options.data,
                    (response: T) => {
                        clearTimeout(timeoutId);
                        resolve(response);
                    }
                );
            });
        },
        []
    );

    /**
     * Emit an event without waiting for a response
     */
    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit(event, data);
        } else {
            console.warn(`Cannot emit ${event}: socket not connected`);
        }
    }, []);

    /**
     * Listen for an event
     */
    const on = useCallback((event: string, handler: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, handler);
            return () => {
                socketRef.current?.off(event, handler);
            };
        }
    }, []);

    /**
     * Remove event listener
     */
    const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
        if (socketRef.current) {
            socketRef.current.off(event, handler);
        }
    }, []);

    return {
        socket: socketRef.current,
        emit,
        emitWithResponse,
        on,
        off,
        isConnected: socketRef.current?.connected || false,
    };
}

/**
 * Get the singleton socket instance
 */
export function getSocket(): Socket | null {
    return socketInstance;
}

/**
 * Disconnect the socket (should only be called on app close)
 */
export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}
