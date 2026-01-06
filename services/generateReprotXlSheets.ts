import * as fs from 'fs';
import * as path from 'path';
import { imageSize } from 'image-size';
import * as ExcelJS from 'exceljs';
import { parseCsvToJson, CsvRow } from '../services/csvHelper';
import {
    safeJoin,
    getRoleColor,
    formatHeader,
    isStrictNumber,
} from '../utils/reportUtils';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('reports');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SectionItem {
    name: string;
    file: string;
}

interface NumericColumnStats {
    [header: string]: {
        min: number;
        mid: number;
        max: number;
    };
}

interface MaxAbsValues {
    [colHeader: string]: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTierColumnBg(name: string): string {
    switch (name.trim()) {
        case 'relax':
            return '31B3EE'; // light blue
        case 'reward':
            return '035EAD'; // light yellow
        case 'savour':
            return 'EC0089'; // light green
        case 'revel':
            return 'F3751F'; // light red/pink
        case 'connect':
            return '66BC47'; // light purple
        case 'impress':
            return '8B6AD8'; // lavender
        default:
            return '';
    }
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Generate Excel sheets from CSV data
 * @param sheet - ExcelJS worksheet
 * @param rootDir - Root directory for CSV files
 * @param sectionList - List of sections to process
 * @param countryName - Optional country name for file naming
 */
export async function generateSheets(
    sheet: ExcelJS.Worksheet,
    rootDir: string,
    sectionList: SectionItem[],
    countryName: string = ''
): Promise<void> {
    for (const { name: sectionTitle, file } of sectionList) {
        const effectiveRoot = sectionTitle === 'Price Tier Forecast input by user'
            ? path.dirname(path.dirname(rootDir))
            : rootDir;
        const filename = sectionTitle === 'Price Tier Forecast input by user' ? `${countryName}_${file}.csv` : `${file}.csv`;

        const filePath = safeJoin(effectiveRoot, filename);
        if (fs.existsSync(filePath)) {
            const rows = await parseCsvToJson(filePath, 'xl');
            if (rows.length === 0) continue;
            sheet.addRow([]);
            sheet.addRow([sectionTitle]);
            if (sheet.lastRow) {
                sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };
            }

            if (rows.length > 0 && rows[0]) {
                const headers = Object.keys(rows[0]);
                const headerRow = sheet.addRow(headers.map(formatHeader));
                if (sectionTitle === 'Display Foresight Trends') {
                    headerRow.height = 40;
                    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                }

                headerRow.eachCell((cell, colNumber) => {
                    const headerName = headers[colNumber - 1] || '';
                    log.debug('headerName', headerName);

                    const bgColor = getTierColumnBg(headerName);

                    cell.font = { bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    // Apply background color if it matches a tier
                    if (bgColor) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: bgColor.replace('#', '') }
                        };
                    }
                });

                const isHeatMap = [
                    'Current TBA Value Pools: Heat Map​',
                    'Forecasted TBA Value Pools: Heat Map',
                    'Current   Value Pools: Heat Map'
                ].includes(sectionTitle);

                const numericColumnStats: NumericColumnStats = {};

                if (isHeatMap) {
                    for (const header of headers) {
                        const numericValues = rows
                            // Only include rows where the first column is not 'Total'
                            .filter((row: CsvRow) => headers[0] && row[headers[0]] !== 'Total')
                            .map((row: CsvRow) => row[header])
                            .filter((val: string | number | undefined): val is string | number =>
                                val !== undefined && (
                                    (typeof val === 'number' && !isNaN(val)) ||
                                    (typeof val === 'string' && /^[+-]?(\d*\.)?\d+$/.test(val.trim()))
                                )
                            )
                            .map((val: string | number) => parseFloat(String(val)));

                        if (numericValues.length > 0) {
                            const sorted = numericValues.slice().sort((a: number, b: number) => a - b);
                            const min = sorted[0] ?? 0;
                            const max = sorted[sorted.length - 1] ?? 0;
                            const midIndex = Math.floor(sorted.length * 0.5);
                            const mid = sorted[midIndex] ?? 0;
                            numericColumnStats[header] = { min, mid, max };
                        }
                    }
                }

                if (sectionTitle === 'Absolute Change in Share by Value Pool') {
                    const maxBarChars = 20;
                    const maxAbsValues: MaxAbsValues = {};

                    for (let i = 1; i < headers.length; i++) {
                        const colHeader = headers[i];
                        if (!colHeader) continue;
                        const maxAbs = Math.max(
                            ...rows.map((r: CsvRow) => Math.abs(parseFloat(String(r[colHeader])) || 0))
                        );
                        maxAbsValues[colHeader] = maxAbs;

                        const col = sheet.getColumn(i + 1);
                        col.width = 35;
                    }

                    for (const row of rows) {
                        const rowData: (string | number)[] = [];

                        for (let i = 0; i < headers.length; i++) {
                            const header = headers[i];
                            if (!header) continue;
                            let val: string | number | undefined = row[header];
                            if (!val) val = '';
                            if (typeof val === "string") {
                                val = val.replace(/%/g, "").trim();
                            }
                            const num = parseFloat(String(val));

                            if (i === 0 || isNaN(num)) {
                                rowData.push(val);
                            } else {
                                const maxAbsValue = maxAbsValues[header] || 1;
                                let barLength = Math.floor(Math.abs(num) / maxAbsValue * (maxBarChars / 2));
                                barLength = barLength > 10 ? barLength - 3 : barLength;

                                const positiveBar = num > 0 ? '█'.repeat(barLength) : '';
                                const negativeBar = num < 0 ? '█'.repeat(barLength) : '';
                                let leftPart = negativeBar.padStart(maxBarChars / 2, ' ');
                                let rightPart = positiveBar.padEnd(maxBarChars / 2, ' ');
                                if (num < 0) {
                                    leftPart = leftPart + ' ' + val;
                                } else {
                                    rightPart = val + '' + rightPart;
                                }
                                const fullBar = `${leftPart}${rightPart}`;
                                const barWithValue = `${fullBar}`;
                                rowData.push(barWithValue);
                            }
                        }

                        const dataRow = sheet.addRow(rowData);
                        dataRow.getCell(1).font = { bold: true };
                        dataRow.getCell(1).alignment = { horizontal: 'left' };

                        for (let i = 2; i <= headers.length; i++) {
                            const cell = dataRow.getCell(i);
                            const headerKey = headers[i - 1];
                            if (!headerKey) continue;
                            const val = parseFloat(String(row[headerKey]));
                            if (!isNaN(val)) {
                                cell.font = {
                                    name: 'Courier New',
                                    size: 10,
                                    color: { argb: val < 0 ? 'FFFF4B4B' : 'FF63BE7B' },
                                };
                                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                            }
                        }
                    }

                    sheet.getColumn(1).width = 25;
                    for (let i = 2; i <= headers.length; i++) {
                        sheet.getColumn(i).width = 45;
                    }

                } else {
                    for (const row of rows) {
                        const dataRow = sheet.addRow(
                            headers.map((h: string) => {
                                const val = row[h];
                                const num = isStrictNumber(val) ? parseFloat(String(val)) : val;
                                return !isNaN(Number(num)) && typeof val === 'string' && val.trim() !== '' ? num : val;
                            })
                        );

                        let min: number | null = null;
                        let mid: number | null = null;
                        let max: number | null = null;

                        let tableNumericValues: number[] = [];

                        // Collect all numeric values from the table (skip rows where first column is 'Total' and skip first column)
                        for (const row of rows) {
                            if (headers[0] && row[headers[0]] === 'Total') continue; // skip 'Total' row

                            // Loop from second column (index 1) up to second-to-last column
                            for (let i = 1; i < headers.length - 1; i++) { // skip first and last column
                                const headerKey = headers[i];
                                if (!headerKey) continue;
                                const val = row[headerKey];
                                const num = parseFloat(String(val));
                                if (!isNaN(num)) {
                                    tableNumericValues.push(num);
                                }
                            }
                        }

                        if (tableNumericValues.length > 0) {
                            const sorted = tableNumericValues.slice().sort((a: number, b: number) => a - b);
                            min = sorted[0] ?? null;
                            max = sorted[sorted.length - 1] ?? null;

                            const midIndex = Math.floor(sorted.length / 2);
                            if (sorted.length % 2 === 0) {
                                // even length → average of middle two
                                mid = ((sorted[midIndex - 1] ?? 0) + (sorted[midIndex] ?? 0)) / 2;
                            } else {
                                mid = sorted[midIndex] ?? null;
                            }
                        }

                        if (isHeatMap) {
                            log.error('tableNumericValues', tableNumericValues, sectionTitle);
                            log.debug('MIN.MX.MID', min, max, mid);
                        }

                        dataRow.eachCell((cell, colNumber) => {
                            const header = headers[colNumber - 1];
                            if (!header) return;
                            let rawValue = cell.value;
                            let tempVal: any = cell.value;
                            if (typeof rawValue === "string") {
                                rawValue = rawValue.trim();
                            }

                            if (typeof tempVal === "string") {
                                tempVal = tempVal.replace("%", "").trim();
                            }

                            const isNumeric = typeof tempVal === 'number' ||
                                (!isNaN(tempVal) && /^[\d.,%-]+$/.test(String(tempVal)));

                            if (isNumeric) {

                                // Check if it originally had %
                                const hasPercent = typeof rawValue === "string" && rawValue.includes("%");

                                // Convert to number (remove % if exists)
                                let numericValue = parseFloat(
                                    typeof rawValue === "string" ? rawValue.replace("%", "") : String(rawValue)
                                );

                                if (!isNaN(numericValue)) {
                                    if (hasPercent) {
                                        cell.value = numericValue / 100;  // Excel expects decimal for %
                                        cell.numFmt = "0.00%";
                                    } else {
                                        cell.value = numericValue;        // Keep as number

                                        if (
                                            sectionTitle === 'Current TBA Value Pools​' ||
                                            sectionTitle === 'Current   Value Pools' ||
                                            sectionTitle === 'Absolute Forecasted Value' ||
                                            sectionTitle === 'Decision Matrix' ||
                                            sectionTitle === 'Forecasted TBA Value Pools'

                                        ) {

                                            cell.numFmt = '#,##0.00'; // Accounting-style numeric format
                                        }
                                    }
                                } else {
                                    // Not numeric, leave as-is (e.g., text values)
                                    cell.value = rawValue;
                                }
                            } else {
                                // Not numeric, leave as-is (e.g., text values)
                                cell.value = rawValue;
                            }
                            cell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            };


                            if (sectionTitle === 'Decision Matrix') {
                                if (["Role1", "Role2", "Role3"].includes(header)) {
                                    const cellValue = typeof cell.value === 'string' ? cell.value.trim() : String(cell.value);
                                    const color = getRoleColor(cellValue);
                                    if (color) {
                                        cell.fill = {
                                            type: 'pattern',
                                            pattern: 'solid',
                                            fgColor: { argb: color.replace('#', '') }
                                        };
                                    }
                                }
                            }

                            if (isHeatMap && header !== 'Total' && colNumber > 1 && dataRow.getCell(1).value !== 'Total') {
                                let value = parseFloat(String(cell.value));
                                if (cell.numFmt === "0.00%") {
                                    value = value * 100; // convert 0.45 → 45 for comparison
                                }
                                if (!isNaN(value) && min !== null && mid !== null && max !== null) {

                                    let r: number, g: number, b: number;
                                    if (value <= mid) {
                                        const ratio = (value - min) / (mid - min || 1);
                                        r = 255;
                                        g = Math.round(255 * ratio);
                                        b = 0;
                                    } else {
                                        const ratio = (value - mid) / (max - mid || 1);
                                        r = Math.round(255 * (1 - ratio));
                                        g = 255;
                                        b = 0;
                                    }
                                    const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: hex }
                                    };
                                }

                            }
                            if (sectionTitle === 'Display Foresight Weights') {
                                const val = parseFloat(String(cell.value));
                                if (!isNaN(val)) {
                                    let argb: string;
                                    if (val > 0.5) {
                                        argb = '008000'; // Light green
                                    } else if (val < -0.5) {
                                        argb = 'FF0000'; // Light red
                                    } else {
                                        argb = 'FFFF00'; // Light yellow
                                    }
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb }
                                    };
                                }
                            }


                        });
                    }

                }
                sheet.eachRow((row: ExcelJS.Row) => {
                    row.height = 30; // Set height to 30 points
                });
                if (sectionTitle === 'Decision Matrix' || sectionTitle === 'Display Foresight Weights') {
                    sheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
                        let defaultLength = 15; // minimum width
                        let maxLength = 15;
                        column.eachCell?.({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
                            const cellValue = cell.value ? cell.value.toString() : '';
                            maxLength = Math.max(defaultLength, cellValue.length);

                        });

                        column.width = maxLength + 2; // add some padding
                    });
                }
            } else {
                sheet.addRow(['[No Data]']);
            }
        } else {
            sheet.addRow([]);
            sheet.addRow([`${sectionTitle} - [Missing File]`]);
        }
    }
}

/**
 * Add banner and theory images to worksheet
 * @param imageSheet - ExcelJS worksheet for images
 * @param workbook - ExcelJS workbook
 */
export async function addBannerSheet(imageSheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook): Promise<void> {
    const bannerImagePath = safeJoin(process.cwd(), 'public/images/banner.png');
    const theoryImagePath = safeJoin(process.cwd(), 'public/images/theory1.png');

    // Helper to insert image
    const insertImage = (sheet: ExcelJS.Worksheet, filePath: string, startRow: number): number => {
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath) as Buffer;
            const dimensions = imageSize(buffer);

            const imgId = workbook.addImage({
                buffer: buffer as any,
                extension: 'png'
            });

            sheet.addImage(imgId, {
                tl: { col: 1, row: startRow },
                ext: { width: dimensions.width || 0, height: dimensions.height || 0 }
            });

            // Return total rows used by image (ExcelJS uses row height of 15 approx)
            return Math.ceil((dimensions.height || 0) / 15);
        } else {
            sheet.addRow([`[Image Missing: ${path.basename(filePath)}]`]);
            return 1;
        }
    };

    // Insert banner at row 1
    const bannerRows = insertImage(imageSheet, bannerImagePath, 1);

    // Insert theory image just below banner
    insertImage(imageSheet, theoryImagePath, bannerRows + 2);
}

// Export for backward compatibility
export default { generateSheets, addBannerSheet };
