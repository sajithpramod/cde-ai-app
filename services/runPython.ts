// Basic Python script runner without security validations
// Note: For production use, consider using pythonScriptService.ts instead
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('pythonService');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PythonScriptResult {
    success: boolean;
    outputPath: string | null;
    stdout: string;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Execute a Python script
 * @param scriptName - Python script filename
 * @param args - Arguments to pass to the script
 * @param checkOutputPath - Optional path to check for output file existence
 * @returns Promise with result object
 */
export function runPythonScript(
    scriptName: string,
    args: string[] = [],
    checkOutputPath: string | null = null
): Promise<PythonScriptResult> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../scripts/python', scriptName);
        const pyArgs = ['-u', scriptPath, ...args];

        log.debug('[SPAWNING]', pyArgs);

        const py: ChildProcess = spawn('python3', pyArgs);

        py.stdout?.pipe(process.stdout);
        py.stderr?.pipe(process.stderr);

        let stderr = '';

        py.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        py.on('error', (err: Error) => {
            reject(new Error(`Failed to start Python: ${err.message}`));
        });

        py.on('close', (code: number | null) => {
            log.debug('[PYTHON EXIT CODE]', code);

            if (code !== 0) {
                return reject(new Error(stderr || `Python exited with code ${code}`));
            }

            let stdout = '';
            py.stdout?.on('data', (data: Buffer) => {
                process.stdout.write(data);
                stdout += data.toString();
            });

            resolve({
                success: true,
                outputPath: checkOutputPath || null,
                stdout

            });
        });
    });
}

// Export for backward compatibility
export default { runPythonScript };
