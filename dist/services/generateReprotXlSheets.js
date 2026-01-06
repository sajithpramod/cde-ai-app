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
exports.generateSheets = generateSheets;
exports.addBannerSheet = addBannerSheet;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const image_size_1 = require("image-size");
const csvHelper_1 = require("../services/csvHelper");
const reportUtils_1 = require("../utils/reportUtils");
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('reports');
function getTierColumnBg(name) {
    switch (name.trim()) {
        case 'relax':
            return '31B3EE';
        case 'reward':
            return '035EAD';
        case 'savour':
            return 'EC0089';
        case 'revel':
            return 'F3751F';
        case 'connect':
            return '66BC47';
        case 'impress':
            return '8B6AD8';
        default:
            return '';
    }
}
async function generateSheets(sheet, rootDir, sectionList, countryName = '') {
    for (const { name: sectionTitle, file } of sectionList) {
        const effectiveRoot = sectionTitle === 'Price Tier Forecast input by user'
            ? path.dirname(path.dirname(rootDir))
            : rootDir;
        const filename = sectionTitle === 'Price Tier Forecast input by user' ? `${countryName}_${file}.csv` : `${file}.csv`;
        const filePath = (0, reportUtils_1.safeJoin)(effectiveRoot, filename);
        if (fs.existsSync(filePath)) {
            const rows = await (0, csvHelper_1.parseCsvToJson)(filePath, 'xl');
            if (rows.length === 0)
                continue;
            sheet.addRow([]);
            sheet.addRow([sectionTitle]);
            if (sheet.lastRow) {
                sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };
            }
            if (rows.length > 0 && rows[0]) {
                const headers = Object.keys(rows[0]);
                const headerRow = sheet.addRow(headers.map(reportUtils_1.formatHeader));
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
                const numericColumnStats = {};
                if (isHeatMap) {
                    for (const header of headers) {
                        const numericValues = rows
                            .filter((row) => headers[0] && row[headers[0]] !== 'Total')
                            .map((row) => row[header])
                            .filter((val) => val !== undefined && ((typeof val === 'number' && !isNaN(val)) ||
                            (typeof val === 'string' && /^[+-]?(\d*\.)?\d+$/.test(val.trim()))))
                            .map((val) => parseFloat(String(val)));
                        if (numericValues.length > 0) {
                            const sorted = numericValues.slice().sort((a, b) => a - b);
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
                    const maxAbsValues = {};
                    for (let i = 1; i < headers.length; i++) {
                        const colHeader = headers[i];
                        if (!colHeader)
                            continue;
                        const maxAbs = Math.max(...rows.map((r) => Math.abs(parseFloat(String(r[colHeader])) || 0)));
                        maxAbsValues[colHeader] = maxAbs;
                        const col = sheet.getColumn(i + 1);
                        col.width = 35;
                    }
                    for (const row of rows) {
                        const rowData = [];
                        for (let i = 0; i < headers.length; i++) {
                            const header = headers[i];
                            if (!header)
                                continue;
                            let val = row[header];
                            if (!val)
                                val = '';
                            if (typeof val === "string") {
                                val = val.replace(/%/g, "").trim();
                            }
                            const num = parseFloat(String(val));
                            if (i === 0 || isNaN(num)) {
                                rowData.push(val);
                            }
                            else {
                                const maxAbsValue = maxAbsValues[header] || 1;
                                let barLength = Math.floor(Math.abs(num) / maxAbsValue * (maxBarChars / 2));
                                barLength = barLength > 10 ? barLength - 3 : barLength;
                                const positiveBar = num > 0 ? '█'.repeat(barLength) : '';
                                const negativeBar = num < 0 ? '█'.repeat(barLength) : '';
                                let leftPart = negativeBar.padStart(maxBarChars / 2, ' ');
                                let rightPart = positiveBar.padEnd(maxBarChars / 2, ' ');
                                if (num < 0) {
                                    leftPart = leftPart + ' ' + val;
                                }
                                else {
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
                            if (!headerKey)
                                continue;
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
                }
                else {
                    for (const row of rows) {
                        const dataRow = sheet.addRow(headers.map((h) => {
                            const val = row[h];
                            const num = (0, reportUtils_1.isStrictNumber)(val) ? parseFloat(String(val)) : val;
                            return !isNaN(Number(num)) && typeof val === 'string' && val.trim() !== '' ? num : val;
                        }));
                        let min = null;
                        let mid = null;
                        let max = null;
                        let tableNumericValues = [];
                        for (const row of rows) {
                            if (headers[0] && row[headers[0]] === 'Total')
                                continue;
                            for (let i = 1; i < headers.length - 1; i++) {
                                const headerKey = headers[i];
                                if (!headerKey)
                                    continue;
                                const val = row[headerKey];
                                const num = parseFloat(String(val));
                                if (!isNaN(num)) {
                                    tableNumericValues.push(num);
                                }
                            }
                        }
                        if (tableNumericValues.length > 0) {
                            const sorted = tableNumericValues.slice().sort((a, b) => a - b);
                            min = sorted[0] ?? null;
                            max = sorted[sorted.length - 1] ?? null;
                            const midIndex = Math.floor(sorted.length / 2);
                            if (sorted.length % 2 === 0) {
                                mid = ((sorted[midIndex - 1] ?? 0) + (sorted[midIndex] ?? 0)) / 2;
                            }
                            else {
                                mid = sorted[midIndex] ?? null;
                            }
                        }
                        if (isHeatMap) {
                            log.error('tableNumericValues', tableNumericValues, sectionTitle);
                            log.debug('MIN.MX.MID', min, max, mid);
                        }
                        dataRow.eachCell((cell, colNumber) => {
                            const header = headers[colNumber - 1];
                            if (!header)
                                return;
                            let rawValue = cell.value;
                            let tempVal = cell.value;
                            if (typeof rawValue === "string") {
                                rawValue = rawValue.trim();
                            }
                            if (typeof tempVal === "string") {
                                tempVal = tempVal.replace("%", "").trim();
                            }
                            const isNumeric = typeof tempVal === 'number' ||
                                (!isNaN(tempVal) && /^[\d.,%-]+$/.test(String(tempVal)));
                            if (isNumeric) {
                                const hasPercent = typeof rawValue === "string" && rawValue.includes("%");
                                let numericValue = parseFloat(typeof rawValue === "string" ? rawValue.replace("%", "") : String(rawValue));
                                if (!isNaN(numericValue)) {
                                    if (hasPercent) {
                                        cell.value = numericValue / 100;
                                        cell.numFmt = "0.00%";
                                    }
                                    else {
                                        cell.value = numericValue;
                                        if (sectionTitle === 'Current TBA Value Pools​' ||
                                            sectionTitle === 'Current   Value Pools' ||
                                            sectionTitle === 'Absolute Forecasted Value' ||
                                            sectionTitle === 'Decision Matrix' ||
                                            sectionTitle === 'Forecasted TBA Value Pools') {
                                            cell.numFmt = '#,##0.00';
                                        }
                                    }
                                }
                                else {
                                    cell.value = rawValue;
                                }
                            }
                            else {
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
                                    const color = (0, reportUtils_1.getRoleColor)(cellValue);
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
                                    value = value * 100;
                                }
                                if (!isNaN(value) && min !== null && mid !== null && max !== null) {
                                    let r, g, b;
                                    if (value <= mid) {
                                        const ratio = (value - min) / (mid - min || 1);
                                        r = 255;
                                        g = Math.round(255 * ratio);
                                        b = 0;
                                    }
                                    else {
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
                                    let argb;
                                    if (val > 0.5) {
                                        argb = '008000';
                                    }
                                    else if (val < -0.5) {
                                        argb = 'FF0000';
                                    }
                                    else {
                                        argb = 'FFFF00';
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
                sheet.eachRow((row) => {
                    row.height = 30;
                });
                if (sectionTitle === 'Decision Matrix' || sectionTitle === 'Display Foresight Weights') {
                    sheet.columns.forEach((column) => {
                        let defaultLength = 15;
                        let maxLength = 15;
                        column.eachCell?.({ includeEmpty: true }, (cell) => {
                            const cellValue = cell.value ? cell.value.toString() : '';
                            maxLength = Math.max(defaultLength, cellValue.length);
                        });
                        column.width = maxLength + 2;
                    });
                }
            }
            else {
                sheet.addRow(['[No Data]']);
            }
        }
        else {
            sheet.addRow([]);
            sheet.addRow([`${sectionTitle} - [Missing File]`]);
        }
    }
}
async function addBannerSheet(imageSheet, workbook) {
    const bannerImagePath = (0, reportUtils_1.safeJoin)(process.cwd(), 'public/images/banner.png');
    const theoryImagePath = (0, reportUtils_1.safeJoin)(process.cwd(), 'public/images/theory1.png');
    const insertImage = (sheet, filePath, startRow) => {
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const dimensions = (0, image_size_1.imageSize)(buffer);
            const imgId = workbook.addImage({
                buffer: buffer,
                extension: 'png'
            });
            sheet.addImage(imgId, {
                tl: { col: 1, row: startRow },
                ext: { width: dimensions.width || 0, height: dimensions.height || 0 }
            });
            return Math.ceil((dimensions.height || 0) / 15);
        }
        else {
            sheet.addRow([`[Image Missing: ${path.basename(filePath)}]`]);
            return 1;
        }
    };
    const bannerRows = insertImage(imageSheet, bannerImagePath, 1);
    insertImage(imageSheet, theoryImagePath, bannerRows + 2);
}
exports.default = { generateSheets, addBannerSheet };
//# sourceMappingURL=generateReprotXlSheets.js.map