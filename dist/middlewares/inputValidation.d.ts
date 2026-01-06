import { Request, Response, NextFunction } from 'express';
import { ValidationResult, ValidationSchema } from '../types';
export declare const validate: (schema: ValidationSchema, data: Record<string, unknown>) => ValidationResult;
export declare const forecastSchema: ValidationSchema;
export declare const filePathSchema: ValidationSchema;
export declare const reportNameSchema: ValidationSchema;
export declare const marketSchema: ValidationSchema;
export declare const marketTypeSchema: ValidationSchema;
export declare const regionSchema: ValidationSchema;
export declare const finalCategoryResultSchema: ValidationSchema;
export declare const fileDownloadSchema: ValidationSchema;
interface ValidateRequestOptions {
    statusCode?: number;
}
export declare const validateRequest: (schema: ValidationSchema, source?: "body" | "query" | "params", options?: ValidateRequestOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeString: (input: unknown) => unknown;
export declare const sanitizeInputs: (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=inputValidation.d.ts.map