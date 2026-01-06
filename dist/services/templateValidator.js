"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTemplate = validateTemplate;
exports.validateCountriesInExcel = validateCountriesInExcel;
const ExcelJS = __importStar(require("exceljs"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('templateValidator');
const TEMPLATE_HEADERS = {
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
    Nielsen: [
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
const OPTIONAL_HEADERS = ['sample size'];
const HEADER_ALIASES = {
    'market abbrevation': 'market abbreviation',
    'market abbreviation': 'market abbreviation'
};
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024;
const STREAM_THRESHOLD_BYTES = 10 * 1024 * 1024;
function normalizeHeader(h) {
    const normalized = h.trim().toLowerCase();
    return HEADER_ALIASES[normalized] || normalized;
}
async function validateTemplate(filePath, originalName, type) {
    try {
        const ext = path.extname(originalName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return { valid: false, missing: ['Invalid file type'] };
        }
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_FILE_SIZE_BYTES) {
            return { valid: false, missing: ['File too large'] };
        }
        let headers = [];
        if (stats.size > STREAM_THRESHOLD_BYTES) {
            const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
            for await (const worksheet of workbookReader) {
                for await (const row of worksheet) {
                    if (row.number === 1) {
                        headers = row.values
                            .slice(1)
                            .filter((h) => typeof h === 'string' && h.trim() !== '')
                            .map((h) => normalizeHeader(h));
                        break;
                    }
                }
                break;
            }
        }
        else {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                throw new Error('No worksheet found in file');
            }
            const firstRow = worksheet.getRow(1);
            headers = firstRow.values
                .slice(1)
                .filter((h) => typeof h === 'string' && h.trim() !== '')
                .map((h) => normalizeHeader(h));
        }
        const expectedHeaders = TEMPLATE_HEADERS[type];
        const normalizedHeaders = headers.map((h) => normalizeHeader(h));
        if (!expectedHeaders) {
            return { valid: false, missing: ['Unknown template type'] };
        }
        const expectedNormalized = expectedHeaders.map((h) => normalizeHeader(h));
        const missingHeaders = expectedNormalized.filter((expected) => {
            if (OPTIONAL_HEADERS.includes(expected))
                return false;
            if (expected.startsWith('%') && expected.endsWith('%')) {
                const keyword = expected.slice(1, -1);
                return !headers.some((h) => h.includes(keyword));
            }
            else {
                return !headers.includes(expected);
            }
        });
        const mandatoryExpectedCount = expectedNormalized.filter((h) => !OPTIONAL_HEADERS.includes(h)).length;
        log.error('mandatoryExpectedCount', mandatoryExpectedCount);
        const columnCountMatches = normalizedHeaders.length >= mandatoryExpectedCount &&
            normalizedHeaders.length <= expectedNormalized.length;
        const issues = [...missingHeaders];
        if (!columnCountMatches) {
            issues.push(`Column count mismatch (found ${headers.length}, expected ${expectedHeaders.length})`);
        }
        return {
            valid: issues.length === 0,
            missing: issues
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log.error('Error during template validation:', errorMessage);
        return {
            valid: false,
            missing: ['Error reading or processing Excel file']
        };
    }
}
async function validateCountriesInExcel(filePath, expectedCountries) {
    log.debug('Validating file:', filePath);
    log.debug('Expected countries:', expectedCountries);
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {});
    const foundCountries = new Set();
    for await (const worksheetReader of workbookReader) {
        for await (const row of worksheetReader) {
            const cellValue = row.getCell(1).value;
            if (typeof cellValue === 'string' && cellValue.trim()) {
                foundCountries.add(cellValue.trim().toLowerCase());
            }
            const allFound = expectedCountries.every((country) => foundCountries.has(country.trim().toLowerCase()));
            if (allFound) {
                return { success: true };
            }
        }
    }
    const missingCountries = expectedCountries.filter((country) => !foundCountries.has(country.trim().toLowerCase()));
    if (missingCountries.length > 0) {
        return { success: false, missingCountries };
    }
    return { success: true };
}
exports.default = {
    validateTemplate,
    validateCountriesInExcel
};
//# sourceMappingURL=templateValidator.js.map