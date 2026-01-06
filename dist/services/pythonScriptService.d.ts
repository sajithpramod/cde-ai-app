export interface PythonScriptResult {
    success: boolean;
    stdout?: string;
    outputPath?: string | null;
    code?: number;
    error?: string;
}
export declare function runPythonScript(scriptName: string, args?: (string | number)[], checkOutputPath?: string | null): Promise<PythonScriptResult>;
declare const _default: {
    runPythonScript: typeof runPythonScript;
};
export default _default;
//# sourceMappingURL=pythonScriptService.d.ts.map