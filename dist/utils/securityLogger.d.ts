import winston from 'winston';
import { Request } from 'express';
import { AuthLogDetails, SecurityViolationDetails, FileOperationDetails } from '../types';
export declare const logger: winston.Logger;
export declare function logAuth(event: string, details: AuthLogDetails, req?: Request | null): void;
export declare function logAuthzFailure(userId: number | string, action: string, resource: string, req?: Request | null): void;
export declare function logSecurityViolation(type: string, details: SecurityViolationDetails, req?: Request | null): void;
export declare function logFileOperation(operation: string, details: FileOperationDetails, req?: Request | null): void;
export declare function logScriptExecution(scriptType: string, scriptName: string, status: string, details?: Record<string, any>, req?: Request | null): void;
export declare function logRateLimit(req: Request, endpoint: string): void;
export declare function logDataAccess(resource: string, action: string, userId: number | string, details?: Record<string, any>): void;
export declare function logValidationFailure(field: string, reason: string, req?: Request | null): void;
export declare function logConfigChange(setting: string, oldValue: unknown, newValue: unknown, userId: number | string): void;
export declare function logError(error: Error, context?: Record<string, any>, req?: Request | null): void;
//# sourceMappingURL=securityLogger.d.ts.map