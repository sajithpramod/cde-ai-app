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
exports.runRScript = runRScript;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('rScriptService');
const ALLOWED_R_SCRIPTS = [
    '03_forecast_timeframe.R',
    '04_Dataprep.R',
    'clean_foresight_data.R',
    'ensemble_automated.R',
    '03_forecast_timeframe_BGS.R',
    '04_Dataprep_BGS.R',
    'clean_foresight_data_BGS.R',
    'ensemble_automated_BGS.R',
    'Interactive_Mekko_chart.R',
    'AboveMarket/BGS/04_Dataprep_BGS.R',
    'AboveMarket/Adhoc/04_Dataprep.R',
    'AboveMarket/BGS-Adhoc Stitch.R',
    'AboveMarket/update_ensemble.R',
    'AboveMarket/Default Alternate Results Stitch.R',
    'BGS/03_forecast_timeframe_BGS.R',
    'BGS/04_Dataprep_BGS.R'
];
const R_SCRIPT_TIMEOUT = parseInt(process.env.R_SCRIPT_TIMEOUT || '7200000', 10);
function sanitizeArgument(arg) {
    let argStr;
    if (typeof arg !== 'string') {
        argStr = String(arg);
    }
    else {
        argStr = arg;
    }
    const dangerousPatterns = ['&&', '||', ';', '|', '$', '`'];
    for (const pattern of dangerousPatterns) {
        if (argStr.includes(pattern)) {
            throw new Error(`Dangerous pattern detected in argument: ${pattern}`);
        }
    }
    const sanitized = argStr.replace(/[;|`<>()]/g, '');
    return sanitized;
}
function isAllowedScript(scriptName) {
    return ALLOWED_R_SCRIPTS.includes(scriptName);
}
function runRScript(scriptName, args = [], io) {
    return new Promise((resolve) => {
        if (!isAllowedScript(scriptName)) {
            log.error(`[Security] Attempt to execute non-whitelisted R script: ${scriptName}`);
            return resolve({
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
            return resolve({
                success: false,
                error: 'Invalid arguments provided'
            });
        }
        const rScriptPath = path.join(__dirname, '../scripts/Rscripts', scriptName);
        const RscriptArgs = [rScriptPath, ...sanitizedArgs];
        log.debug('[Rscript running]', scriptName, RscriptArgs);
        const r = (0, child_process_1.spawn)('Rscript', RscriptArgs);
        const timeout = setTimeout(() => {
            log.error(`[Security] R script timeout after ${R_SCRIPT_TIMEOUT}ms: ${scriptName}`);
            r.kill('SIGTERM');
            resolve({
                success: false,
                error: 'Script execution timeout'
            });
        }, R_SCRIPT_TIMEOUT);
        let stdout = '';
        let stderr = '';
        r.stdout?.on('data', (data) => {
            const msg = data.toString();
            stdout += msg;
            io?.emit?.('r-progress', msg);
        });
        r.stderr?.on('data', (data) => {
            const err = data.toString();
            stderr += err;
            io?.emit?.('r-error', err);
        });
        r.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                return resolve({
                    success: false,
                    error: stderr || 'R script failed',
                });
            }
            return resolve({
                success: true,
                output: stdout.trim(),
                from: 'stdout',
            });
        });
    });
}
exports.default = { runRScript };
//# sourceMappingURL=rScriptService.js.map