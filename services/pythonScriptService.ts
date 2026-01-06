// Python script handler with security enhancements
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('pythonScriptService');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PythonScriptResult {
    success: boolean;
    stdout?: string;
    outputPath?: string | null;
    code?: number;
    error?: string;
}

// ============================================
// CONSTANTS
// ============================================

// Security: Whitelist of allowed Python scripts
const ALLOWED_PYTHON_SCRIPTS: readonly string[] = [
    'Python1.py',
    'Python2.py',
    'Python3.py',
    'AboveMarket/main4.py',
    'AboveMarket/bubble_chart_v6.py',
] as const;

// Security: Timeout for Python script execution (10 minutes default)
const PYTHON_SCRIPT_TIMEOUT: number = parseInt(process.env.PYTHON_SCRIPT_TIMEOUT || '600000', 10);

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

    // Remove any characters that could be used for command injection
    const sanitized = argStr.replace(/[;|&$`<>()]/g, '');

    // Additional check: ensure no shell operators
    const dangerousPatterns: string[] = ['&&', '||', ';', '|', '$', '`'];
    for (const pattern of dangerousPatterns) {
        if (sanitized.includes(pattern)) {
            throw new Error(`Dangerous pattern detected in argument: ${pattern}`);
        }
    }

    return sanitized;
}

/**
 * Validate that script name is in whitelist
 * @param scriptName - Name of Python script to execute
 */
function isAllowedScript(scriptName: string): boolean {
    return (ALLOWED_PYTHON_SCRIPTS as readonly string[]).includes(scriptName);
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Execute a Python script with security validations
 * @param scriptName - Python script filename
 * @param args - Arguments to pass to the script
 * @param checkOutputPath - Optional path to check for output file existence
 * @returns Promise with result object
 */
export function runPythonScript(
    scriptName: string,
    args: (string | number)[] = [],
    checkOutputPath: string | null = null
): Promise<PythonScriptResult> {
    return new Promise((resolve, reject) => {
        // Security: Validate script name is in whitelist
        if (!isAllowedScript(scriptName)) {
            log.error(`[Security] Attempt to execute non-whitelisted Python script: ${scriptName}`);
            return reject({
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
            return reject({
                success: false,
                error: 'Invalid arguments provided'
            });
        }

        const scriptPath = path.join(__dirname, '../scripts/python', scriptName);

        // Build full argument list for spawn
        const pyArgs = ['-u', scriptPath, ...sanitizedArgs];
        log.debug('[Python running]', scriptName, `(${sanitizedArgs.length} args)`);

        const py: ChildProcess = spawn('python3', pyArgs);

        // Security: Set timeout to prevent long-running scripts
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

        py.stdout?.on('data', (data: Buffer) => {
            process.stdout.write(data);
            stdout += data.toString();
        });

        py.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        py.on('close', (code: number | null) => {
            // Clear timeout
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

// Export for backward compatibility
export default { runPythonScript };
