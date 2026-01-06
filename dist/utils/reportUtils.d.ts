import { Worksheet } from 'exceljs';
export declare function isValidName(name: string): boolean;
export declare function safeJoin(base: string, target: string): string;
export declare function isNumeric(value: unknown): boolean;
export declare function getRoleColor(role: string): string;
export declare function isStrictNumber(val: unknown): boolean;
interface FileItem {
    name: string;
    file: string;
}
export declare function getFileListForSection(section: string): FileItem[];
interface HeatMapStats {
    [header: string]: {
        min: number;
        max: number;
        mid: number;
    };
}
export declare function getHeatMapStats(headers: string[], rows: Record<string, any>[]): HeatMapStats;
export declare function applyHeatMapFormatting(sheet: Worksheet, stats: HeatMapStats): void;
export declare function addBarChartToSheet(sheet: Worksheet, rows: Record<string, any>[], headers: string[]): void;
export declare function formatHeader(header: string): string;
export {};
//# sourceMappingURL=reportUtils.d.ts.map