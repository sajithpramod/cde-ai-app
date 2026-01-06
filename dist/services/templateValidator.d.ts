export type TemplateType = 'ForesightFile' | 'CPSdataFile' | ' ategoryRSVFile' | 'TBSNSVFile' | 'CCFbackdataFile' | 'Nielsen' | 'IWSRData';
export interface ValidationResult {
    valid: boolean;
    missing: string[];
}
export interface CountryValidationResult {
    success: boolean;
    missingCountries?: string[];
}
export declare function validateTemplate(filePath: string, originalName: string, type: TemplateType): Promise<ValidationResult>;
export declare function validateCountriesInExcel(filePath: string, expectedCountries: string[]): Promise<CountryValidationResult>;
declare const _default: {
    validateTemplate: typeof validateTemplate;
    validateCountriesInExcel: typeof validateCountriesInExcel;
};
export default _default;
//# sourceMappingURL=templateValidator.d.ts.map