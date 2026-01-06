import { Request, Response, NextFunction } from 'express';
export declare function authorize(allowedRoles?: string[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function authorizeOwner(getResourceOwnerId: (req: Request) => Promise<number | undefined>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function authorizeAny(middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=authorize.d.ts.map