export interface PythonScriptResult {
    success: boolean;
    outputPath: string | null;
    stdout: string;
}
export declare function runPythonScript(scriptName: string, args?: string[], checkOutputPath?: string | null): Promise<PythonScriptResult>;
declare const _default: {
    runPythonScript: typeof runPythonScript;
};
export default _default;
//# sourceMappingURL=runPython.d.ts.map