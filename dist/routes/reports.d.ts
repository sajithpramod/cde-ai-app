import { Router } from 'express';
declare const router: Router;
declare module 'express-session' {
    interface SessionData {
        userUploadFolerPath?: string;
    }
}
export = router;
//# sourceMappingURL=reports.d.ts.map