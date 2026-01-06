import winston from 'winston';
import { Request, Response } from 'express';
export interface ModuleLogger {
    trace(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    verbose(message: string, ...args: unknown[]): void;
    http(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    object(label: string, obj: unknown): void;
    auto(message: string, ...args: unknown[]): void;
}
export declare function createModuleLogger(moduleName: string): ModuleLogger;
export declare function debug(message: string, ...args: unknown[]): void;
export declare function trace(message: string, ...args: unknown[]): void;
export declare function entering(functionName: string, ...args: unknown[]): void;
export declare function exiting(functionName: string, returnValue?: unknown): void;
export declare function divider(label?: string): void;
export interface PerfTimer {
    label: string;
    end(): number;
}
export declare function startTimer(label: string): PerfTimer;
export declare function measureTime<T>(label: string, fn: () => T | Promise<T>): Promise<T>;
export declare function logRequest(req: Request, additionalInfo?: Record<string, any>): void;
export declare function logResponse(req: Request, res: Response & {
    responseTime?: number;
}, additionalInfo?: Record<string, any>): void;
export declare function debugIf(condition: boolean, message: string, ...args: unknown[]): void;
export declare function debugOnce(key: string, message: string, ...args: unknown[]): void;
export declare function info(msg: string, ...args: unknown[]): void;
export declare function warn(msg: string, ...args: unknown[]): void;
export declare function error(msg: string, ...args: unknown[]): void;
export declare const logger: winston.Logger;
//# sourceMappingURL=debugLogger.d.ts.map