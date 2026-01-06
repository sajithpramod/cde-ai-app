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
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('pythonService');
function runPythonScript(scriptName, args = [], checkOutputPath = null) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../scripts/python', scriptName);
        const pyArgs = ['-u', scriptPath, ...args];
        log.debug('[SPAWNING]', pyArgs);
        const py = (0, child_process_1.spawn)('python3', pyArgs);
        py.stdout?.pipe(process.stdout);
        py.stderr?.pipe(process.stderr);
        let stderr = '';
        py.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        py.on('error', (err) => {
            reject(new Error(`Failed to start Python: ${err.message}`));
        });
        py.on('close', (code) => {
            log.debug('[PYTHON EXIT CODE]', code);
            if (code !== 0) {
                return reject(new Error(stderr || `Python exited with code ${code}`));
            }
            let stdout = '';
            py.stdout?.on('data', (data) => {
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
exports.default = { runPythonScript };
//# sourceMappingURL=runPython.js.map