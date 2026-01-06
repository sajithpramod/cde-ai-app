import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

import { createModuleLogger } from '../utils/debugLogger';
const log = createModuleLogger('templateValidator');

// ============================================
// TYPE DEFINITIONS
// ============================================

export type TemplateType =
    | 'ForesightFile'
    | 'CPSdataFile'
    | ' ategoryRSVFile'
    | 'TBSNSVFile'
    | 'CCFbackdataFile'
    | 'Nielsen'
    | 'IWSRData';

export interface ValidationResult {
    valid: boolean;
    missing: string[];
}

export interface CountryValidationResult {
    success: boolean;
    missingCountries?: string[];
}

interface HeaderAliasMap {
    [key: string]: string;
}

type TemplateHeadersMap = {
    [K in TemplateType]: string[];
};

// ============================================
// CONSTANTS
// ============================================

const TEMPLATE_HEADERS: TemplateHeadersMap = {
    ForesightFile: [
        'Country',
        'Theme Tag - Opportunities',
        'Theme Tag - Ways In',
        'Created Time',
        'Month Of Year',
        'Mentions (SUM)'
    ],
    CPSdataFile: [
        'Market',
        'Market Abbreviation',
        'Route to Market',
        'Time Period',
        'Macro Category',
        'Category',
        'Sub Category',
        'Brand/Trademark',
        'Brand/Variant',
        'Relax',
        'Relax_nr of serves',
        'Reward',
        'Reward_nr of serves',
        'Savour',
        'Savour_nr of serves',
        'Impress',
        'Impress_nr of serves',
        'Revel',
        'Revel_nr of serves',
        'Connect',
        'Connect_nr of serves'
    ],
     ategoryRSVFile: [
        'Country Name',
        '%PriceTier%',
        'Occasions to Relax',
        'Occasions to Reward',
        'Occasions to Savour',
        'Occasions to Revel',
        'Occasions to Connect',
        'Occasions to Impress',
        'Grand Total'
    ],
    TBSNSVFile: [
        'Country Name',
        '%PriceTier%',
        'Occasions to Relax',
        'Occasions to Reward',
        'Occasions to Savour',
        'Occasions to Revel',
        'Occasions to Connect',
        'Occasions to Impress',
        'Grand Total'
    ],
    CCFbackdataFile: [
        'Market',
        'Market abbrevation',
        'Route to Market',
        'Time Period',
        'Macro Category',
        'Category',
        'Sub Category',
        'Brand/Trademark',
        'Brand/Variant',
        'Relax',
        'Relax_nr of serves',
        'Reward',
        'Reward_nr of serves',
        'Savour',
        'Savour_nr of serves',
        'Impress',
        'Impress_nr of serves',
        'Revel',
        'Revel_nr of serves',
        'Connect',
        'Connect_nr of serves',
        'Sample Size'
    ],
    Nielsen:[
        'Country Name',
        'Brand Variant Name',
        'Brand Name',
        'Alcohol Type',
        'Sector',
        'Sub-Sector',
        'Price Tier',
        'Occasions to Reward',
        'Occasions to Connect',
        'Occasions to Savour',
        'Occasions to Revel',
        'Occasions to Impress',
        'Occasions to Relax',
        'Grand Total'

    ],
    IWSRData: [
        'Country Name',
        'Brand Variant Name',
        'Brand Name',
        'Alcohol Type',
        'Sector',
        'Sub-Sector',
        'Price Tier',
        'StrategyPriceTier1',
        '%PriceTier%',
        'Occasions to Relax',
        'Occasions to Reward',
        'Occasions to Savour',
        'Occasions to Impress',
        'Occasions to Revel',
        'Occasions to Connect',
        'Grand Total'

    ]
};
const OPTIONAL_HEADERS: string[] = ['sample size'];

const HEADER_ALIASES: HeaderAliasMap = {
    'market abbrevation': 'market abbreviation', // common typo
    'market abbreviation': 'market abbreviation'
    // you can add more aliases here if needed
};

const ALLOWED_EXTENSIONS: readonly string[] = ['.xlsx', '.xls'] as const;
const MAX_FILE_SIZE_BYTES: number = 40 * 1024 * 1024; // 40MB
const STREAM_THRESHOLD_BYTES: number = 10 * 1024 * 1024; // 10MB

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeHeader(h: string): string {
    const normalized = h.trim().toLowerCase();
    return HEADER_ALIASES[normalized] || normalized;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

export async function validateTemplate(
    filePath: string,
    originalName: string,
    type: TemplateType
): Promise<ValidationResult> {
    try {
        const ext = path.extname(originalName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, missing: ['Invalid file type'] };
        }

        const stats = fs.statSync(filePath);
        if (stats.size > MAX_FILE_SIZE_BYTES) {
            return { valid: false, missing: ['File too large'] };
        }

        let headers: string[] = [];

        if (stats.size > STREAM_THRESHOLD_BYTES) {
            // Use streaming reader for large file
            const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
            for await (const worksheet of workbookReader) {
                for await (const row of worksheet) {
                    if (row.number === 1) {
                        headers = (row.values as ExcelJS.CellValue[])
                            .slice(1)
                            .filter((h): h is string => typeof h === 'string' && h.trim() !== '')
                            .map((h: string) => normalizeHeader(h));
                        break;
                    }
                }
                break; // Only first worksheet
            }
        } else {
            // Small file — use normal read
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                throw new Error('No worksheet found in file');
            }
            const firstRow = worksheet.getRow(1);
            headers = (firstRow.values as ExcelJS.CellValue[])
                .slice(1)
                .filter((h): h is string => typeof h === 'string' && h.trim() !== '')
                .map((h: string) => normalizeHeader(h));
        }

        const expectedHeaders = TEMPLATE_HEADERS[type];
        const normalizedHeaders = headers.map((h: string) => normalizeHeader(h));
        if (!expectedHeaders) {
            return { valid: false, missing: ['Unknown template type'] };
        }

        const expectedNormalized = expectedHeaders.map((h: string) => normalizeHeader(h));

        const missingHeaders = expectedNormalized.filter((expected: string) => {
            if (OPTIONAL_HEADERS.includes(expected)) return false; // skip optional
            if (expected.startsWith('%') && expected.endsWith('%')) {
                const keyword = expected.slice(1, -1);
                return !headers.some((h: string) => h.includes(keyword));
            } else {
                return !headers.includes(expected);
            }
        });

        const mandatoryExpectedCount = expectedNormalized.filter(
            (h: string) => !OPTIONAL_HEADERS.includes(h)
        ).length;

        log.error('mandatoryExpectedCount', mandatoryExpectedCount);

        // must be at least mandatory count, and at most full expected count
        const columnCountMatches =
            normalizedHeaders.length >= mandatoryExpectedCount &&
            normalizedHeaders.length <= expectedNormalized.length;

        const issues = [...missingHeaders];
        if (!columnCountMatches) {
            issues.push(`Column count mismatch (found ${headers.length}, expected ${expectedHeaders.length})`);
        }

        return {
            valid: issues.length === 0,
            missing: issues
        };

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log.error('Error during template validation:', errorMessage);
        return {
            valid: false,
            missing: ['Error reading or processing Excel file']
        };
    }
}
export async function validateCountriesInExcel(
    filePath: string,
    expectedCountries: string[]
): Promise<CountryValidationResult> {
    log.debug('Validating file:', filePath);
    log.debug('Expected countries:', expectedCountries);

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
    const foundCountries = new Set<string>();

    for await (const worksheetReader of workbookReader) {
        for await (const row of worksheetReader) {
            const cellValue = row.getCell(1).value; // First column (A)

            if (typeof cellValue === 'string' && cellValue.trim()) {
                foundCountries.add(cellValue.trim().toLowerCase());
            }

            // Optimization: Exit early if all expected countries are found (case-insensitive)
            const allFound = expectedCountries.every((country: string) =>
                foundCountries.has(country.trim().toLowerCase())
            );
            if (allFound) {
                return { success: true };
            }
        }
    }

    // Final validation after full scan
    const missingCountries = expectedCountries.filter(
        (country: string) => !foundCountries.has(country.trim().toLowerCase())
    );

    if (missingCountries.length > 0) {
        return { success: false, missingCountries };
    }

    return { success: true };
}

// Export functions for backward compatibility
export default {
    validateTemplate,
    validateCountriesInExcel
};
