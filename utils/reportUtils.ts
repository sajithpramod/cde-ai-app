// utils/reportUtils.ts
import path from 'path';
import { Worksheet } from 'exceljs';

export function isValidName(name: string): boolean {
    return /^[a-zA-Z0-9 _-]+$/.test(name);
}

export function safeJoin(base: string, target: string): string {
    const targetPath = path.resolve(base, target);

    if (!targetPath.startsWith(path.resolve(base))) {
        throw new Error('Unsafe path access detected');
    }

    return targetPath;
}

export function isNumeric(value: unknown): boolean {
    return !isNaN(value as number) && value !== null && value !== '';
}

export function getRoleColor(role: string): string {
    console.log('here role', role);
    switch (role) {
        case 'Invest to grow(ahead)': return '#EAF6DD';
        case 'Invest to grow(now)': return '#CBF0DD';
        case 'Selective Plays': return '#FCE7D0';
        case 'Maintain': return '#E7F6FD';
        default: return '';
    }
}

export function isStrictNumber(val: unknown): boolean {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return /^-?\d+(\.\d+)?$/.test(trimmed); // strictly matches 123, -123.45
    }
    return false;
}

interface FileItem {
    name: string;
    file: string;
}

export function getFileListForSection(section: string): FileItem[] {
    const tableOrder: FileItem[] = [
        { name: 'Price Tier Forecast input by user', file: 'pt_growth_input_filled' },
        { name: 'Current TBA Value Pools​', file: 'TBA_RSV_Output' },
        { name: 'Current TBA Value Pools: Heat Map​', file: 'Current Value Pool Heat Map' },
        { name: 'Current   Value Pools', file: ' _RSV_Output' },
        { name: 'Current   Value Pools: Heat Map', file: '  Value Pool Heat Map' },
        { name: 'Forecasted TBA Value Pools', file: 'Forecasted RSV' },
        { name: 'Forecasted TBA Value Pools: Heat Map', file: 'Forecasted value pool heat map' },
        { name: 'Absolute Change in Share by Value Pool', file: 'Absolute Change in Share by Value Pool' },
        { name: 'Decision Matrix', file: 'Decision Matrix' }
    ];

    const topDown: FileItem[] = [
        { name: 'Motivations Trend', file: 'Motivations trend' },
        { name: 'F24', file: 'LY' },
        { name: 'Display Top-Down Forecasts', file: 'Top Down serves forecast' }
    ];

    const bottomUp: FileItem[] = [
        { name: 'Display Foresight Trends', file: 'Foresights trend' },
        { name: 'Display Foresight Weights', file: 'Foresight Weight' },
        { name: 'Display Bottom-up Forecasts', file: 'Bottomup serves forecast' }
    ];

    const ensembleforcast: FileItem[] = [
        { name: 'Display Ensemble Weights', file: 'Ensemble weights' },
        { name: 'Display Ensemble Forecasts', file: 'Ensemble serves forecast' }
    ];
    console.log('section', section);

    switch (section) {
        case 'Final Model':
            return tableOrder;
        case 'Serves Top-Down':
            return topDown;
        case 'Serves Bottom-Up':
            return bottomUp;
        case 'Serves Ensemble-Forcast':
            return ensembleforcast;
        default:
            return [];
    }
}

interface HeatMapStats {
    [header: string]: {
        min: number;
        max: number;
        mid: number;
    };
}

export function getHeatMapStats(headers: string[], rows: Record<string, any>[]): HeatMapStats {
    const stats: HeatMapStats = {};
    for (const header of headers) {
        const nums = rows.map(row => parseFloat(row[header])).filter(v => !isNaN(v));
        if (nums.length) {
            nums.sort((a, b) => a - b);
            const minVal = nums[0];
            const maxVal = nums[nums.length - 1];
            const midVal = nums[Math.floor(nums.length / 2)];
            if (minVal !== undefined && maxVal !== undefined && midVal !== undefined) {
                stats[header] = {
                    min: minVal,
                    max: maxVal,
                    mid: midVal
                };
            }
        }
    }
    return stats;
}

export function applyHeatMapFormatting(sheet: Worksheet, stats: HeatMapStats): void {
    const headers = (sheet.getRow(1).values as any[]).slice(1); // ignore first empty
    for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
        const row = sheet.getRow(rowIdx);
        headers.forEach((header, colIdx) => {
            const val = parseFloat(row.getCell(colIdx + 1).value as string);
            if (isNaN(val)) return;

            const headerStats = stats[header];
            if (!headerStats) return;

            const { min, mid, max } = headerStats;
            const color = getHeatColor(val, min, mid, max);
            row.getCell(colIdx + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: color.replace('#', '') }
            };
        });
    }
}

function getHeatColor(value: number, min: number, mid: number, max: number): string {
    if (value <= mid) {
        const ratio = (value - min) / (mid - min || 1);
        return interpolateColor('#ffffff', '#a8d5ff', ratio);
    } else {
        const ratio = (value - mid) / (max - mid || 1);
        return interpolateColor('#a8d5ff', '#005f9e', ratio);
    }
}

function interpolateColor(start: string, end: string, ratio: number): string {
    const hex = (val: number) => Math.max(0, Math.min(255, Math.round(val))).toString(16).padStart(2, '0');
    const s = parseInt(start.slice(1), 16);
    const e = parseInt(end.slice(1), 16);

    const r = ((s >> 16) & 0xff) + (((e >> 16) & 0xff) - ((s >> 16) & 0xff)) * ratio;
    const g = ((s >> 8) & 0xff) + (((e >> 8) & 0xff) - ((s >> 8) & 0xff)) * ratio;
    const b = (s & 0xff) + ((e & 0xff) - (s & 0xff)) * ratio;

    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function addBarChartToSheet(sheet: Worksheet, rows: Record<string, any>[], headers: string[]): void {
    const targetCol = headers[1];
    if (!targetCol) return; // Assuming 2nd column is numeric
    const maxVal = Math.max(...rows.map(r => Math.abs(parseFloat(r[targetCol]) || 0)));

    sheet.getRow(1).values = [...(sheet.getRow(1).values as any[]), 'Bar Chart'];
    for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const value = parseFloat(row.getCell(2).value as string);
        if (!isNaN(value)) {
            const length = Math.round((Math.abs(value) / maxVal) * 20);
            const bar = (value < 0 ? '-' : '') + '▇'.repeat(length);
            row.values = [...(row.values as any[]), bar];
        } else {
            row.values = [...(row.values as any[]), ''];
        }
    }

    sheet.getColumn(sheet.columnCount).width = 30;
}

export function formatHeader(header: string): string {
    const map: Record<string, string> = {
        user_value_per: 'CAGR %',
        user_value_b100: 'Base100'
    };

    const key = header.toLowerCase();
    if (map[key]) return map[key];

    return header
        .replace(/[._]/g, ' ')                       // Replace dot/underscore with space
        .replace(/([a-z])([A-Z])/g, '$1 $2')         // Add space between camelCase
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)) // Capitalize words
        .join(' ');
}
