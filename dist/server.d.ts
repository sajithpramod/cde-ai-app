import { Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
declare global {
    namespace Express {
        interface Request {
            rateLimit?: {
                resetTime: number;
            };
        }
        interface Response {
            locals: {
                nonce: string;
                [key: string]: any;
            };
        }
    }
}
declare const app: Application;
declare const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { app, server, io };
//# sourceMappingURL=server.d.ts.map