export interface RScriptResult {
    success: boolean;
    output?: string;
    from?: string;
    error?: string;
}
export interface SocketIO {
    emit?: (event: string, data: any) => void;
}
export declare function runRScript(scriptName: string, args?: (string | number)[], io?: SocketIO): Promise<RScriptResult>;
declare const _default: {
    runRScript: typeof runRScript;
};
export default _default;
//# sourceMappingURL=rScriptService.d.ts.map