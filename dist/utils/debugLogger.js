"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createModuleLogger = createModuleLogger;
exports.debug = debug;
exports.trace = trace;
exports.entering = entering;
exports.exiting = exiting;
exports.divider = divider;
exports.startTimer = startTimer;
exports.measureTime = measureTime;
exports.logRequest = logRequest;
exports.logResponse = logResponse;
exports.debugIf = debugIf;
exports.debugOnce = debugOnce;
exports.info = info;
exports.warn = warn;
exports.error = error;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    trace: 6
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    http: 'magenta',
    verbose: 'blue',
    debug: 'green',
    trace: 'gray'
};
winston_1.default.addColors(colors);
const customFormat = winston_1.default.format.printf((info) => {
    const { timestamp, level, message, module, function: func, line, ...meta } = info;
    let location = '';
    if (module || func || line) {
        const parts = [];
        if (module)
            parts.push(module);
        if (func)
            parts.push(func);
        if (line)
            parts.push(`L${line}`);
        location = parts.length > 0 ? ` [${parts.join(':')}]` : '';
    }
    let msg = `${timestamp} ${level}${location}: ${message}`;
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
        const cleanMeta = Object.keys(meta)
            .filter(key => !['timestamp', 'level', 'message', 'splat', Symbol.for('level')].includes(key))
            .reduce((obj, key) => {
            obj[key] = meta[key];
            return obj;
        }, {});
        if (Object.keys(cleanMeta).length > 0) {
            msg += '\n  ' + util_1.default.inspect(cleanMeta, {
                colors: true,
                depth: 4,
                breakLength: 80,
                compact: false
            });
        }
    }
    return msg;
});
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize({ all: true }), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat);
const debugLogger = winston_1.default.createLogger({
    levels,
    level: process.env.DEBUG_LEVEL || process.env.LOG_LEVEL || 'debug',
    format: fileFormat,
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../logs/debug.log'),
            level: 'debug',
            maxsize: 10485760,
            maxFiles: 5,
            tailable: true
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../logs/verbose.log'),
            level: 'verbose',
            maxsize: 5242880,
            maxFiles: 3
        })
    ],
    exitOnError: false
});
const consoleLevel = process.env.NODE_ENV === 'production'
    ? (process.env.CONSOLE_LOG_LEVEL || 'info')
    : (process.env.DEBUG_LEVEL || 'debug');
debugLogger.add(new winston_1.default.transports.Console({
    format: consoleFormat,
    level: consoleLevel,
    silent: process.env.DISABLE_CONSOLE_LOG === 'true'
}));
function getCallerInfo() {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    try {
        const err = new Error();
        Error.prepareStackTrace = (_, stack) => stack;
        const stack = err.stack;
        const caller = stack[2];
        if (caller) {
            const fileName = caller.getFileName();
            const functionName = caller.getFunctionName();
            const lineNumber = caller.getLineNumber();
            return {
                module: fileName ? path_1.default.basename(fileName, path_1.default.extname(fileName)) : 'unknown',
                function: functionName || 'anonymous',
                line: lineNumber || 0
            };
        }
    }
    catch (e) {
        console.error('error in debugger', e.message);
    }
    finally {
        Error.prepareStackTrace = originalPrepareStackTrace;
    }
    return { module: 'unknown', function: 'unknown', line: 0 };
}
function createModuleLogger(moduleName) {
    return {
        trace: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('trace', message, { module: moduleName, ...meta });
        },
        debug: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('debug', message, { module: moduleName, ...meta });
        },
        verbose: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('verbose', message, { module: moduleName, ...meta });
        },
        http: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('http', message, { module: moduleName, ...meta });
        },
        info: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('info', message, { module: moduleName, ...meta });
        },
        warn: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('warn', message, { module: moduleName, ...meta });
        },
        error: (message, ...args) => {
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('error', message, { module: moduleName, ...meta });
        },
        object: (label, obj) => {
            debugLogger.log('debug', label, { module: moduleName, object: obj });
        },
        auto: (message, ...args) => {
            const caller = getCallerInfo();
            const meta = args.length > 0 ? { data: args } : {};
            debugLogger.log('debug', message, { ...caller, ...meta });
        }
    };
}
function debug(message, ...args) {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('debug', message, { ...caller, ...meta });
}
function trace(message, ...args) {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('trace', message, { ...caller, ...meta });
}
function entering(functionName, ...args) {
    const caller = getCallerInfo();
    const params = args.length > 0 ? { parameters: args } : {};
    debugLogger.log('trace', `→ Entering ${functionName}`, { ...caller, ...params });
}
function exiting(functionName, returnValue) {
    const caller = getCallerInfo();
    const meta = returnValue !== undefined ? { returnValue } : {};
    debugLogger.log('trace', `← Exiting ${functionName}`, { ...caller, ...meta });
}
function divider(label = '') {
    const line = '='.repeat(80);
    debugLogger.log('debug', label ? `${line} ${label} ${line}` : line);
}
class PerfTimerClass {
    constructor(label) {
        this.label = label;
        this.startTime = process.hrtime.bigint();
        this.caller = getCallerInfo();
    }
    end() {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - this.startTime) / 1e6;
        debugLogger.log('verbose', `⏱️  ${this.label} took ${duration.toFixed(2)}ms`, this.caller);
        return duration;
    }
}
function startTimer(label) {
    return new PerfTimerClass(label);
}
async function measureTime(label, fn) {
    const timer = startTimer(label);
    try {
        const result = await fn();
        timer.end();
        return result;
    }
    catch (error) {
        timer.end();
        throw error;
    }
}
function logRequest(req, additionalInfo = {}) {
    debugLogger.log('http', `${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.session?.user?.id,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        body: req.body && Object.keys(req.body).length > 0 ? '[BODY PRESENT]' : undefined,
        ...additionalInfo
    });
}
function logResponse(req, res, additionalInfo = {}) {
    debugLogger.log('http', `${req.method} ${req.path} → ${res.statusCode}`, {
        ip: req.ip,
        duration: res.responseTime ? `${res.responseTime}ms` : undefined,
        ...additionalInfo
    });
}
function debugIf(condition, message, ...args) {
    if (condition) {
        debug(message, ...args);
    }
}
const debugOnceCache = new Set();
function debugOnce(key, message, ...args) {
    if (!debugOnceCache.has(key)) {
        debugOnceCache.add(key);
        debug(message, ...args);
    }
}
function info(msg, ...args) {
    debug(msg, ...args);
}
function warn(msg, ...args) {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('warn', msg, { ...caller, ...meta });
}
function error(msg, ...args) {
    const caller = getCallerInfo();
    const meta = args.length > 0 ? { data: args } : {};
    debugLogger.log('error', msg, { ...caller, ...meta });
}
exports.logger = debugLogger;
//# sourceMappingURL=debugLogger.js.map