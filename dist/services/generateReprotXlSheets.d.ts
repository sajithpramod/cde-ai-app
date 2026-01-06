import * as ExcelJS from 'exceljs';
export interface SectionItem {
    name: string;
    file: string;
}
export declare function generateSheets(sheet: ExcelJS.Worksheet, rootDir: string, sectionList: SectionItem[], countryName?: string): Promise<void>;
export declare function addBannerSheet(imageSheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook): Promise<void>;
declare const _default: {
    generateSheets: typeof generateSheets;
    addBannerSheet: typeof addBannerSheet;
};
export default _default;
//# sourceMappingURL=generateReprotXlSheets.d.ts.map