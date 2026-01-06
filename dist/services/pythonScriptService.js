"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPythonScript = runPythonScript;
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('pythonScriptService');
const ALLOWED_PYTHON_SCRIPTS = [
    'Python1.py',
    'Python2.py',
    'Python3.py',
    'AboveMarket/main4.py',
    'AboveMarket/bubble_chart_v6.py',
];
const PYTHON_SCRIPT_TIMEOUT = parseInt(process.env.PYTHON_SCRIPT_TIMEOUT || '600000', 10);
function sanitizeArgument(arg) {
    let argStr;
    if (typeof arg !== 'string') {
        argStr = String(arg);
    }
    else {
        argStr = arg;
    }
    const sanitized = argStr.replace(/[;|&$`<>()]/g, '');
    const dangerousPatterns = ['&&', '||', ';', '|', '$', '`'];
    for (const pattern of dangerousPatterns) {
        if (sanitized.includes(pattern)) {
            throw new Error(`Dangerous pattern detected in argument: ${pattern}`);
        }
    }
    return sanitized;
}
function isAllowedScript(scriptName) {
    return ALLOWED_PYTHON_SCRIPTS.includes(scriptName);
}
function runPythonScript(scriptName, args = [], checkOutputPath = null) {
    return new Promise((resolve, reject) => {
        if (!isAllowedScript(scriptName)) {
            log.error(`[Security] Attempt to execute non-whitelisted Python script: ${scriptName}`);
            return reject({
                success: false,
                error: 'Invalid script name'
            });
        }
        let sanitizedArgs;
        try {
            sanitizedArgs = args.map(arg => sanitizeArgument(arg));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error(`[Security] Argument sanitization failed: ${errorMessage}`);
            return reject({
                success: false,
                error: 'Invalid arguments provided'
            });
        }
        const scriptPath = path.join(__dirname, '../scripts/python', scriptName);
        const pyArgs = ['-u', scriptPath, ...sanitizedArgs];
        log.debug('[Python running]', scriptName, `(${sanitizedArgs.length} args)`);
        const py = (0, child_process_1.spawn)('python3', pyArgs);
        const timeout = setTimeout(() => {
            log.error(`[Security] Python script timeout after ${PYTHON_SCRIPT_TIMEOUT}ms: ${scriptName}`);
            py.kill('SIGTERM');
            reject({
                success: false,
                error: 'Script execution timeout'
            });
        }, PYTHON_SCRIPT_TIMEOUT);
        let stdout = '';
        let stderr = '';
        py.stdout?.on('data', (data) => {
            process.stdout.write(data);
            stdout += data.toString();
        });
        py.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        py.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                return reject({
                    success: false,
                    code: code || undefined,
                    error: stderr.trim() || "Unknown Python error",
                });
            }
            if (checkOutputPath && !fs.existsSync(checkOutputPath)) {
                return reject(new Error(`Expected output file not found: ${checkOutputPath}`));
            }
            resolve({
                success: true,
                stdout,
                outputPath: checkOutputPath || null
            });
        });
    });
}
exports.default = { runPythonScript };
//# sourceMappingURL=pythonScriptService.js.map