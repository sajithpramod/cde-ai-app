import { Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { User } from '../types';
declare module 'express-session' {
    interface SessionData {
        user?: User;
        userUploadFolerPath?: string;
        forcastDuration?: string;
        staticMappingFile?: string;
        staticTBAMapping?: string;
    }
}
declare const _default: (io: SocketIOServer) => Router;
export = _default;
//# sourceMappingURL=upload.d.ts.map