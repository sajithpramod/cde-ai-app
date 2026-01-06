import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            uploadDuration?: number;
            validatedFilePath?: string;
            validatedFieldName?: string;
            fileName?: string;
            fieldName?: string;
            dataType?: string;
        }
    }
}
export declare const validateAndStoreDynamic: () => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validateAndStoreDynamic.d.ts.map