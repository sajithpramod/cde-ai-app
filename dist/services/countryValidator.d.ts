import { TemplateType } from './templateValidator';
export declare function getCountryColumnForFileType(fileType: string): string | null;
export declare function getMappedColumnForFileType(fileType: string): string | null;
export declare function determineFileType(dataType: string, fieldName: string): TemplateType | null;
export declare function getExpectedCountriesForValidation(fileType: string, _dataType: string, selectedCountries: string[], _selectionType: string): Promise<string[]>;
declare const _default: {
    getCountryColumnForFileType: typeof getCountryColumnForFileType;
    getMappedColumnForFileType: typeof getMappedColumnForFileType;
    determineFileType: typeof determineFileType;
    getExpectedCountriesForValidation: typeof getExpectedCountriesForValidation;
};
export default _default;
//# sourceMappingURL=countryValidator.d.ts.map