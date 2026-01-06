/**
 * Socket.IO custom type augmentations
 * Extends Socket.IO types with custom properties and event handlers
 */

import { User } from './index';
import { IncomingMessage } from 'http';

declare module 'socket.io' {
    interface Socket {
        // Custom socket properties
        request: IncomingMessage & {
            session?: {
                user?: User;
                id?: string;
            };
        };
    }

    // Server-to-client events
    interface ServerToClientEvents {
        progress: (data: {
            step: number;
            message: string;
            data?: unknown;
        }) => void;
        error: (data: {
            message: string;
            code?: string;
        }) => void;
        complete: (data: {
            message: string;
            result?: unknown;
        }) => void;
    }

    // Client-to-server events
    interface ClientToServerEvents {
        disconnect: () => void;
        error: (error: Error) => void;
    }

    // Inter-server events
    interface InterServerEvents {
        ping: () => void;
    }

    // Socket data
    interface SocketData {
        userId?: number;
        userName?: string;
    }
}

export {};
