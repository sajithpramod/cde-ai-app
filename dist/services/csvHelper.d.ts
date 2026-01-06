export interface CsvRow {
    [key: string]: string | number;
}
export interface PriceTierRow {
    [key: string]: string;
}
export type CsvType = 'web' | 'xl';
export declare function extractColumnsFromCsv(csvFilePath: string): Promise<string[]>;
export declare function parseCsvToJson(filePath: string, type?: CsvType): Promise<CsvRow[]>;
export declare function parsePriceTierCsv(csvFilePath: string): Promise<string[]>;
export declare function parseRenamePriceTierFilledCsv(csvFilePath: string): Promise<CsvRow[]>;
export declare function parseCsv(csvFilePath: string): Promise<CsvRow[]>;
declare const _default: {
    extractColumnsFromCsv: typeof extractColumnsFromCsv;
    parseCsvToJson: typeof parseCsvToJson;
    parsePriceTierCsv: typeof parsePriceTierCsv;
    parseRenamePriceTierFilledCsv: typeof parseRenamePriceTierFilledCsv;
    parseCsv: typeof parseCsv;
};
export default _default;
//# sourceMappingURL=csvHelper.d.ts.map