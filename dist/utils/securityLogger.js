"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logAuth = logAuth;
exports.logAuthzFailure = logAuthzFailure;
exports.logSecurityViolation = logSecurityViolation;
exports.logFileOperation = logFileOperation;
exports.logScriptExecution = logScriptExecution;
exports.logRateLimit = logRateLimit;
exports.logDataAccess = logDataAccess;
exports.logValidationFailure = logValidationFailure;
exports.logConfigChange = logConfigChange;
exports.logError = logError;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    security: 3,
    audit: 4,
    debug: 5
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    security: 'magenta',
    audit: 'cyan',
    debug: 'white'
};
winston_1.default.addColors(colors);
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
}));
exports.logger = winston_1.default.createLogger({
    levels,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../logs/security.log'),
            level: 'security',
            maxsize: 5242880,
            maxFiles: 10
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../logs/audit.log'),
            level: 'audit',
            maxsize: 5242880,
            maxFiles: 10
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});
const consoleLevel = process.env.NODE_ENV === 'production'
    ? (process.env.CONSOLE_LOG_LEVEL || 'warn')
    : 'debug';
exports.logger.add(new winston_1.default.transports.Console({
    format: consoleFormat,
    level: consoleLevel,
    silent: process.env.DISABLE_CONSOLE_LOG === 'true'
}));
function logAuth(event, details, req = null) {
    exports.logger.log('audit', 'Authentication Event', {
        event,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        userAgent: req?.get('user-agent') || 'unknown',
        email: details.email || 'unknown',
        success: details.success,
        reason: details.reason || null
    });
}
function logAuthzFailure(userId, action, resource, req = null) {
    exports.logger.log('security', 'Authorization Failure', {
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
function logSecurityViolation(type, details, req = null) {
    exports.logger.log('security', 'Security Violation', {
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
function logFileOperation(operation, details, req = null) {
    exports.logger.log('audit', 'File Operation', {
        event: 'file_operation',
        operation,
        timestamp: new Date().toISOString(),
        userId: req?.session?.user?.id || null,
        ip: req?.ip || 'unknown',
        ...details
    });
}
function logScriptExecution(scriptType, scriptName, status, details = {}, req = null) {
    exports.logger.log('audit', 'Script Execution', {
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
function logRateLimit(req, endpoint) {
    exports.logger.log('security', 'Rate Limit Exceeded', {
        event: 'rate_limit_exceeded',
        endpoint,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userId: req.session?.user?.id || null,
        userAgent: req.get('user-agent') || 'unknown'
    });
}
function logDataAccess(resource, action, userId, details = {}) {
    exports.logger.log('audit', 'Data Access', {
        event: 'data_access',
        resource,
        action,
        userId,
        timestamp: new Date().toISOString(),
        ...details
    });
}
function logValidationFailure(field, reason, req = null) {
    exports.logger.log('security', 'Input Validation Failure', {
        event: 'validation_failure',
        field,
        reason,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        path: req?.path || 'unknown'
    });
}
function logConfigChange(setting, oldValue, newValue, userId) {
    exports.logger.log('audit', 'Configuration Change', {
        event: 'config_change',
        setting,
        oldValue: oldValue ? '[REDACTED]' : null,
        newValue: newValue ? '[REDACTED]' : null,
        userId,
        timestamp: new Date().toISOString()
    });
}
function logError(error, context = {}, req = null) {
    exports.logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ip: req?.ip || 'unknown',
        path: req?.path || 'unknown',
        userId: req?.session?.user?.id || null,
        ...context
    });
}
//# sourceMappingURL=securityLogger.js.map