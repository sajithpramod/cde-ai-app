import * as fs from 'fs';
import csv from 'csv-parser';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('csvHelper');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CsvRow {
    [key: string]: string | number;
}

export interface PriceTierRow {
    [key: string]: string;
}

export type CsvType = 'web' | 'xl';

// ============================================
// HELPER FUNCTIONS
// ============================================

function isNumeric(value: any): boolean {
    return !isNaN(value) && value !== null && value !== '';
}

// ============================================
// CSV PARSING FUNCTIONS
// ============================================

/**
 * Extract column names from a CSV file
 * @param csvFilePath - Path to the CSV file
 * @returns Array of column names
 */
export function extractColumnsFromCsv(csvFilePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const columns = new Set<string>();

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row: CsvRow) => {
                Object.keys(row).forEach(col => columns.add(col));
            })
            .on('end', () => {
                resolve(Array.from(columns));
            })
            .on('error', (err: Error) => {
                reject(err);
            });
    });
}

/**
 * Parse CSV file to JSON with optional formatting
 * @param filePath - Path to the CSV file
 * @param type - Type of output ('web' for formatted strings, 'xl' for numeric values)
 * @returns Array of parsed rows
 */
export function parseCsvToJson(filePath: string, type: CsvType = 'web'): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const rows: CsvRow[] = [];
        const formatter = new Intl.NumberFormat('en-UK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        const isRSVFile = filePath.includes('TBA_RSV_Output') ||
                          filePath.includes(' _RSV_Output') ||
                          filePath.includes('Forecasted RSV');

        log.debug('filePath', filePath);

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data: CsvRow) => {
                for (const key in data) {
                    const raw = data[key];
                    if (isNumeric(raw)) {
                        let num = Number(raw);
                        num = Number(num.toFixed(2));

                        if (isRSVFile) {
                            if (type === 'web') {
                                data[key] = formatter.format(num); // string
                            } else if (type === 'xl') {
                                data[key] = num; // numeric with 2 decimals
                            }
                        } else {
                            data[key] = num;
                        }
                    }
                }
                rows.push(data);
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

/**
 * Parse price tier CSV file (extracts first column only)
 * @param csvFilePath - Path to the CSV file
 * @returns Array of price tier values
 */
export function parsePriceTierCsv(csvFilePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const result: string[] = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row: PriceTierRow) => {
                const value = Object.values(row)[0]; // First column only
                if (value && value.trim()) {
                    result.push(value.trim());
                }
            })
            .on('end', () => resolve(result))
            .on('error', reject);
    });
}

/**
 * Parse and rename price tier filled CSV with trimmed values
 * @param csvFilePath - Path to the CSV file
 * @returns Array of parsed rows with trimmed values
 */
export function parseRenamePriceTierFilledCsv(csvFilePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const result: CsvRow[] = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row: CsvRow) => {
                // Trim all values in the row
                const cleanedRow: CsvRow = Object.fromEntries(
                    Object.entries(row).map(([key, value]) => [
                        key.trim(),
                        typeof value === 'string' ? value.trim() : value
                    ])
                );
                result.push(cleanedRow);
            })
            .on('end', () => resolve(result))
            .on('error', reject);
    });
}

/**
 * Parse CSV file to array of row objects
 * @param csvFilePath - Path to the CSV file
 * @returns Array of parsed rows
 */
export function parseCsv(csvFilePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const results: CsvRow[] = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row: CsvRow) => {
                // push each full row as an object
                results.push(row);
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// Export for backward compatibility
export default {
    extractColumnsFromCsv,
    parseCsvToJson,
    parsePriceTierCsv,
    parseRenamePriceTierFilledCsv,
    parseCsv
};
