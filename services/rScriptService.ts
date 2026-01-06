// R script handler with security enhancements
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('rScriptService');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface RScriptResult {
    success: boolean;
    output?: string;
    from?: string;
    error?: string;
}

export interface SocketIO {
    emit?: (event: string, data: any) => void;
}

// ============================================
// CONSTANTS
// ============================================

// Security: Whitelist of allowed R scripts
const ALLOWED_R_SCRIPTS: readonly string[] = [
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
] as const;

// Security: Timeout for R script execution (2 hours default for long-running processes)
// Default: 7200000ms = 2 hours (increased from 1 hour to handle large file processing)
const R_SCRIPT_TIMEOUT: number = parseInt(process.env.R_SCRIPT_TIMEOUT || '7200000', 10);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize and validate argument to prevent command injection
 * @param arg - Argument to sanitize
 * @returns Sanitized argument
 */
function sanitizeArgument(arg: string | number): string {
    let argStr: string;

    if (typeof arg !== 'string') {
        argStr = String(arg);
    } else {
        argStr = arg;
    }

    // First check for dangerous shell operators before removing single characters
    const dangerousPatterns: string[] = ['&&', '||', ';', '|', '$', '`'];
    for (const pattern of dangerousPatterns) {
        if (argStr.includes(pattern)) {
            throw new Error(`Dangerous pattern detected in argument: ${pattern}`);
        }
    }

    // Remove dangerous characters that could be used for command injection
    // Allow &: needed for "FP&A" market type
    // Remove: semicolons, pipes, backticks, less than, greater than, parentheses
    // Keep: & (for FP&A), $, but dangerous patterns are already blocked above
    const sanitized = argStr.replace(/[;|`<>()]/g, '');

    return sanitized;
}

/**
 * Validate that script name is in whitelist
 * @param scriptName - Name of R script to execute
 */
function isAllowedScript(scriptName: string): boolean {
    return (ALLOWED_R_SCRIPTS as readonly string[]).includes(scriptName);
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Execute an R script and return JSON data if Excel is generated
 * @param scriptName - R script filename
 * @param args - Arguments to pass to the script
 * @param io - Socket.IO instance (optional)
 * @returns Promise with result object
 */
export function runRScript(
    scriptName: string,
    args: (string | number)[] = [],
    io?: SocketIO
): Promise<RScriptResult> {
    return new Promise((resolve) => {
        // Security: Validate script name is in whitelist
        if (!isAllowedScript(scriptName)) {
            log.error(`[Security] Attempt to execute non-whitelisted R script: ${scriptName}`);
            return resolve({
                success: false,
                error: 'Invalid script name'
            });
        }

        // Security: Sanitize all arguments
        let sanitizedArgs: string[];
        try {
            sanitizedArgs = args.map(arg => sanitizeArgument(arg));
        } catch (error) {
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

        const r: ChildProcess = spawn('Rscript', RscriptArgs);

        // Security: Set timeout to prevent long-running scripts
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

        r.stdout?.on('data', (data: Buffer) => {
            const msg = data.toString();
            stdout += msg;
            io?.emit?.('r-progress', msg); // socket optional
        });

        r.stderr?.on('data', (data: Buffer) => {
            const err = data.toString();
            stderr += err;
            io?.emit?.('r-error', err);
        });

        r.on('close', (code: number | null) => {
            // Clear timeout
            clearTimeout(timeout);

            if (code !== 0) {
                return resolve({
                    success: false,
                    error: stderr || 'R script failed',
                });
            }

            // Fallback: just return stdout if no file is found
            return resolve({
                success: true,
                output: stdout.trim(),
                from: 'stdout',
            });
        });
    });
}

// Export for backward compatibility
export default { runRScript };
