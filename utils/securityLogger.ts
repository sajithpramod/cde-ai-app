// Security Logger using Winston
import winston from 'winston';
import path from 'path';
import { Request } from 'express';
import { AuthLogDetails, SecurityViolationDetails, FileOperationDetails } from '../types';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    security: 3,
    audit: 4,
    debug: 5
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    security: 'magenta',
    audit: 'cyan',
    debug: 'white'
};

winston.addColors(colors);

// Create log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create logger instance
export const logger = winston.createLogger({
    levels,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Security events log file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/security.log'),
            level: 'security',
            maxsize: 5242880,
            maxFiles: 10
        }),
        // Audit log file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/audit.log'),
            level: 'audit',
            maxsize: 5242880,
            maxFiles: 10
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Add console transport for container logs
// In production, log to console with 'warn' level by default (for security events in container logs)
// In development, log everything
const consoleLevel = process.env.NODE_ENV === 'production'
    ? (process.env.CONSOLE_LOG_LEVEL || 'warn')
    : 'debug';

logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: consoleLevel,
    // Optionally disable console in production if DISABLE_CONSOLE_LOG is set
    silent: process.env.DISABLE_CONSOLE_LOG === 'true'
}));

// Security-specific logging functions

/**
 * Log authentication events
 */
export function logAuth(event: string, details: AuthLogDetails, req: Request | null = null): void {
    logger.log('audit', 'Authentication Event', {
        event,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        userAgent: req?.get('user-agent') || 'unknown',
        email: details.email || 'unknown',
        success: details.success,
        reason: details.reason || null
    });
}

/**
 * Log authorization failures
 */
export function logAuthzFailure(userId: number | string, action: string, resource: string, req: Request | null = null): void {
    logger.log('security', 'Authorization Failure', {
        event: 'authorization_denied',
        timestamp: new Date().toISOString(),
        userId,
        action,
        resource,
        ip: req?.ip || 'unknown',
        path: req?.path || 'unknown',
        method: req?.method || 'unknown'
    });
}

/**
 * Log security violations
 */
export function logSecurityViolation(type: string, details: SecurityViolationDetails, req: Request | null = null): void {
    logger.log('security', 'Security Violation', {
        event: 'security_violation',
        type,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        path: req?.path || 'unknown',
        userAgent: req?.get ? req.get('user-agent') : 'unknown',
        userId: req?.session?.user?.id || null,
        ...details
    });
}

/**
 * Log file operations
 */
export function logFileOperation(operation: string, details: FileOperationDetails, req: Request | null = null): void {
    logger.log('audit', 'File Operation', {
        event: 'file_operation',
        operation,
        timestamp: new Date().toISOString(),
        userId: req?.session?.user?.id || null,
        ip: req?.ip || 'unknown',
        ...details
    });
}

/**
 * Log script executions
 */
export function logScriptExecution(
    scriptType: string,
    scriptName: string,
    status: string,
    details: Record<string, any> = {},
    req: Request | null = null
): void {
    logger.log('audit', 'Script Execution', {
        event: 'script_execution',
        scriptType,
        scriptName,
        status,
        timestamp: new Date().toISOString(),
        userId: req?.session?.user?.id || null,
        ip: req?.ip || 'unknown',
        ...details
    });
}

/**
 * Log rate limit violations
 */
export function logRateLimit(req: Request, endpoint: string): void {
    logger.log('security', 'Rate Limit Exceeded', {
        event: 'rate_limit_exceeded',
        endpoint,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userId: req.session?.user?.id || null,
        userAgent: req.get('user-agent') || 'unknown'
    });
}

/**
 * Log data access
 */
export function logDataAccess(resource: string, action: string, userId: number | string, details: Record<string, any> = {}): void {
    logger.log('audit', 'Data Access', {
        event: 'data_access',
        resource,
        action,
        userId,
        timestamp: new Date().toISOString(),
        ...details
    });
}

/**
 * Log input validation failures
 */
export function logValidationFailure(field: string, reason: string, req: Request | null = null): void {
    logger.log('security', 'Input Validation Failure', {
        event: 'validation_failure',
        field,
        reason,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        path: req?.path || 'unknown'
    });
}

/**
 * Log configuration changes
 */
export function logConfigChange(setting: string, oldValue: unknown, newValue: unknown, userId: number | string): void {
    logger.log('audit', 'Configuration Change', {
        event: 'config_change',
        setting,
        oldValue: oldValue ? '[REDACTED]' : null,
        newValue: newValue ? '[REDACTED]' : null,
        userId,
        timestamp: new Date().toISOString()
    });
}

/**
 * Log application errors
 */
export function logError(error: Error, context: Record<string, any> = {}, req: Request | null = null): void {
    logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        path: req?.path || 'unknown',
        userId: req?.session?.user?.id || null,
        ...context
    });
}
