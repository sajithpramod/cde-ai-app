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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractColumnsFromCsv = extractColumnsFromCsv;
exports.parseCsvToJson = parseCsvToJson;
exports.parsePriceTierCsv = parsePriceTierCsv;
exports.parseRenamePriceTierFilledCsv = parseRenamePriceTierFilledCsv;
exports.parseCsv = parseCsv;
const fs = __importStar(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('csvHelper');
function isNumeric(value) {
    return !isNaN(value) && value !== null && value !== '';
}
function extractColumnsFromCsv(csvFilePath) {
    return new Promise((resolve, reject) => {
        const columns = new Set();
        fs.createReadStream(csvFilePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            Object.keys(row).forEach(col => columns.add(col));
        })
            .on('end', () => {
            resolve(Array.from(columns));
        })
            .on('error', (err) => {
            reject(err);
        });
    });
}
function parseCsvToJson(filePath, type = 'web') {
    return new Promise((resolve, reject) => {
        const rows = [];
        const formatter = new Intl.NumberFormat('en-UK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        const isRSVFile = filePath.includes('TBA_RSV_Output') ||
            filePath.includes(' _RSV_Output') ||
            filePath.includes('Forecasted RSV');
        log.debug('filePath', filePath);
        fs.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (data) => {
            for (const key in data) {
                const raw = data[key];
                if (isNumeric(raw)) {
                    let num = Number(raw);
                    num = Number(num.toFixed(2));
                    if (isRSVFile) {
                        if (type === 'web') {
                            data[key] = formatter.format(num);
                        }
                        else if (type === 'xl') {
                            data[key] = num;
                        }
                    }
                    else {
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
function parsePriceTierCsv(csvFilePath) {
    return new Promise((resolve, reject) => {
        const result = [];
        fs.createReadStream(csvFilePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            const value = Object.values(row)[0];
            if (value && value.trim()) {
                result.push(value.trim());
            }
        })
            .on('end', () => resolve(result))
            .on('error', reject);
    });
}
function parseRenamePriceTierFilledCsv(csvFilePath) {
    return new Promise((resolve, reject) => {
        const result = [];
        fs.createReadStream(csvFilePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            const cleanedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [
                key.trim(),
                typeof value === 'string' ? value.trim() : value
            ]));
            result.push(cleanedRow);
        })
            .on('end', () => resolve(result))
            .on('error', reject);
    });
}
function parseCsv(csvFilePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvFilePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            results.push(row);
        })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}
exports.default = {
    extractColumnsFromCsv,
    parseCsvToJson,
    parsePriceTierCsv,
    parseRenamePriceTierFilledCsv,
    parseCsv
};
//# sourceMappingURL=csvHelper.js.map