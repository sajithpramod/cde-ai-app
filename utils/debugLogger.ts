// Debug Logger - Replace console.log with structured debug logging
import winston from 'winston';
import path from 'path';
import util from 'util';
import { Request, Response } from 'express';

// Define debug log levels with more granularity
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    trace: 6
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    http: 'magenta',
    verbose: 'blue',
    debug: 'green',
    trace: 'gray'
};

winston.addColors(colors);

interface LogInfo {
    timestamp: string;
    level: string;
    message: string;
    module?: string;
    function?: string;
    line?: number;
    [key: string]: unknown;
}

// Custom format for better readability
const customFormat = winston.format.printf((info) => {
    const { timestamp, level, message, module, function: func, line, ...meta } = info as unknown as LogInfo;
    // Format location info if available
    let location = '';
    if (module || func || line) {
        const parts = [];
        if (module) parts.push(module);
        if (func) parts.push(func);
        if (line) parts.push(`L${line}`);
        location = parts.length > 0 ? ` [${parts.join(':')}]` : '';
    }

    // Format the message
    let msg = `${timestamp} ${level}${location}: ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
        // Filter out winston internals
        const cleanMeta = Object.keys(meta)
            .filter(key => !['timestamp', 'level', 'message', 'splat', Symbol.for('level')].includes(key))
            .reduce((obj: Record<string, unknown>, key: string) => {
                obj[key] = meta[key];
                return obj;
            }, {} as Record<string, unknown>);

        if (Object.keys(cleanMeta).length > 0) {
            msg += '\n  ' + util.inspect(cleanMeta, {
                colors: true,
                depth: 4,
                breakLength: 80,
                compact: false
            });
        }
    }

    return msg;
});

// File format (JSON for parsing)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Console format (human-readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
);

// Create the logger instance
const debugLogger = winston.createLogger({
    levels,
    level: process.env.DEBUG_LEVEL || process.env.LOG_LEVEL || 'debug',
    format: fileFormat,
    transports: [
        // Debug log file - all debug messages
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/debug.log'),
            level: 'debug',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        // Verbose log file - verbose and above
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/verbose.log'),
            level: 'verbose',
            maxsize: 5242880, // 5MB
            maxFiles: 3
        })
    ],
    // Don't exit on uncaught errors
    exitOnError: false
});

// Add console transport for container logs
// In production, log to console with 'info' level by default (for container logs)
// In development, log everything at 'debug' level
const consoleLevel = process.env.NODE_ENV === 'production'
    ? (process.env.CONSOLE_LOG_LEVEL || 'info')
    : (process.env.DEBUG_LEVEL || 'debug');

debugLogger.add(new winston.transports.Console({
    format: consoleFormat,
    level: consoleLevel,
    // Optionally disable console in production if DISABLE_CONSOLE_LOG is set
    silent: process.env.DISABLE_CONSOLE_LOG === 'true'
}));

interface CallerInfo {
    module: string;
    function: string;
    line: number;
}

interface CallSite {
    getFileName(): string | undefined;
    getFunctionName(): string | null;
    getLineNumber(): number | undefined;
}

/**
 * Helper to get caller information (file, function, line)
 */
function getCallerInfo(): CallerInfo {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    try {
        const err = new Error();
        Error.prepareStackTrace = (_, stack) => stack;
        const stack = err.stack as unknown as CallSite[];
        // Stack: [0] = this function, [1] = wrapper function, [2] = actual caller
        const caller = stack[2];

        if (caller) {
            const fileName = caller.getFileName();
            const functionName = caller.getFunctionName();
            const lineNumber = caller.getLineNumber();

            return {
                module: fileName ? path.basename(fileName, path.extname(fileName)) : 'unknown',
                function: functionName || 'anonymous',
                line: lineNumber || 0
            };
        }
    } catch (e) {
        console.error('error in debugger', (e as Error).message);
        // If stack trace fails, return unknown
    } finally {
        Error.prepareStackTrace = originalPrepareStackTrace;
    }

    return { module: 'unknown', function: 'unknown', line: 0 };
}

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

/**
 * Create a namespaced debug logger for a specific module
 * @param moduleName - Name of the module/file
 * @returns Logger instance with debug methods
 */
export function createModuleLogger(moduleName: string): ModuleLogger {
    return {
        trace: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('trace', message, { module: moduleName, ...meta });
        },
        debug: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('debug', message, { module: moduleName, ...meta });
        },
        verbose: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('verbose', message, { module: moduleName, ...meta });
        },
        http: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('http', message, { module: moduleName, ...meta });
        },
        info: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('info', message, { module: moduleName, ...meta });
        },
        warn: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('warn', message, { module: moduleName, ...meta });
        },
        error: (message: string, ...args: unknown[]) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('error', message, { module: moduleName, ...meta });
        },
        // Convenience method to log objects
        object: (label: string, obj: unknown) => {
            debugLogger.log('debug', label, { module: moduleName, object: obj });
        },
        // Log with automatic caller detection
        auto: (message: string, ...args: unknown[]) => {
            const caller = getCallerInfo();
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('debug', message, { ...caller, ...meta });
        }
    };
}

/**
 * Quick debug function - auto-detects caller location
 */
export function debug(message: string, ...args: unknown[]): void {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('debug', message, { ...caller, ...meta });
}

/**
 * Quick trace function - for very detailed debugging
 */
export function trace(message: string, ...args: unknown[]): void {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('trace', message, { ...caller, ...meta });
}

/**
 * Log function entry
 */
export function entering(functionName: string, ...args: unknown[]): void {
    const caller = getCallerInfo();
    const params = args.length > 0 ? { parameters: args } : {};
    debugLogger.log('trace', `→ Entering ${functionName}`, { ...caller, ...params });
}

/**
 * Log function exit
 */
export function exiting(functionName: string, returnValue?: unknown): void {
    const caller = getCallerInfo();
    const meta = returnValue !== undefined ? { returnValue } : {};
    debugLogger.log('trace', `← Exiting ${functionName}`, { ...caller, ...meta });
}

/**
 * Log a divider for visual separation in logs
 */
export function divider(label: string = ''): void {
    const line = '='.repeat(80);
    debugLogger.log('debug', label ? `${line} ${label} ${line}` : line);
}

export interface PerfTimer {
    label: string;
    end(): number;
}

/**
 * Performance timing helper
 */
class PerfTimerClass implements PerfTimer {
    label: string;
    private startTime: bigint;
    private caller: CallerInfo;

    constructor(label: string) {
        this.label = label;
        this.startTime = process.hrtime.bigint();
        this.caller = getCallerInfo();
    }

    end(): number {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - this.startTime) / 1e6; // Convert to milliseconds
        debugLogger.log('verbose', `⏱️  ${this.label} took ${duration.toFixed(2)}ms`, this.caller);
        return duration;
    }
}

/**
 * Start a performance timer
 */
export function startTimer(label: string): PerfTimer {
    return new PerfTimerClass(label);
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
    const timer = startTimer(label);
    try {
        const result = await fn();
        timer.end();
        return result;
    } catch (error) {
        timer.end();
        throw error;
    }
}

/**
 * Log HTTP request details
 */
export function logRequest(req: Request, additionalInfo: Record<string, any> = {}): void {
    debugLogger.log('http', `${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.session?.user?.id,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        body: req.body && Object.keys(req.body).length > 0 ? '[BODY PRESENT]' : undefined,
        ...additionalInfo
    });
}

/**
 * Log HTTP response details
 */
export function logResponse(req: Request, res: Response & { responseTime?: number }, additionalInfo: Record<string, any> = {}): void {
    debugLogger.log('http', `${req.method} ${req.path} → ${res.statusCode}`, {
        ip: req.ip,
        duration: res.responseTime ? `${res.responseTime}ms` : undefined,
        ...additionalInfo
    });
}

/**
 * Conditional debug - only logs if condition is true
 */
export function debugIf(condition: boolean, message: string, ...args: unknown[]): void {
    if (condition) {
        debug(message, ...args);
    }
}

/**
 * Debug once - only logs the first time it's called for a specific key
 */
const debugOnceCache = new Set<string>();
export function debugOnce(key: string, message: string, ...args: unknown[]): void {
    if (!debugOnceCache.has(key)) {
        debugOnceCache.add(key);
        debug(message, ...args);
    }
}

// Convenience exports (for direct usage)
export function info(msg: string, ...args: unknown[]): void {
    debug(msg, ...args);
}

export function warn(msg: string, ...args: unknown[]): void {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('warn', msg, { ...caller, ...meta });
}

export function error(msg: string, ...args: unknown[]): void {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('error', msg, { ...caller, ...meta });
}

// Export the base logger instance
export const logger = debugLogger;
