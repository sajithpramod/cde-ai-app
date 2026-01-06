import { Knex } from 'knex';
import { Request } from 'express';
export interface UploadedFile {
    field: string;
    file_name: string;
    path: string;
}
export interface CountrySelection {
    countryMultiSelect?: string[];
    countryNames?: string[];
    marketNames?: string[];
}
export interface FormData {
    dataType?: string;
    selectedPriceTier?: string[];
    exchangeRate?: number | string;
    marketSelect?: string;
    typeOfModel?: string;
    fromCurrency?: string;
    toCurrency?: string;
    subClusterSelect?: string[];
    forcastDuration?: string | number;
    validatedFilePath?: string;
    marketsForGrowth?: string[];
    [key: string]: any;
}
export interface SaveForecastProgressData {
    dataType?: string;
    fieldName?: string;
    fileName?: string;
    validatedFilePath?: string;
    countryMultiSelect?: string[];
    countryNames?: string[];
    marketNames?: string[];
    selectedPriceTier?: string[];
    exchangeRate?: number | string;
    marketSelect?: string;
    typeOfModel?: string;
    fromCurrency?: string;
    toCurrency?: string;
    subClusterSelect?: string[];
    forcastDuration?: string | number;
    marketsForGrowth?: string[];
}
export declare function saveForecastProgress(db: Knex, req: Request, data: SaveForecastProgressData): Promise<void>;
declare const _default: {
    saveForecastProgress: typeof saveForecastProgress;
};
export default _default;
//# sourceMappingURL=forecastProgress.d.ts.map