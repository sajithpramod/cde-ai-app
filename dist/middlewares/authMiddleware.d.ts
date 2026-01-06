import { Request, Response, NextFunction } from 'express';
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireAuthAPI(req: Request, res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function isAuthenticated(req: Request): boolean;
export declare function getCurrentUser(req: Request): Express.User | null;
export declare function getUserId(req: Request): number | undefined | null;
export default requireAuth;
export declare const ensureAuthenticated: typeof requireAuth;
//# sourceMappingURL=authMiddleware.d.ts.map