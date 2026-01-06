// Report Controller - TypeScript Version
// Handles report viewing, CSV parsing, Excel generation, and Mekko chart rendering

import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { runRScript } from '../services/rScriptService';
import ExcelJS from 'exceljs';
import { parseCsvToJson } from '../services/csvHelper';
import { generateSheets, addBannerSheet } from '../services/generateReprotXlSheets';
import { createModuleLogger } from '../utils/debugLogger';
import { safeJoin, getFileListForSection } from '../utils/reportUtils';

const log = createModuleLogger('report');

/**
 * View CSV report with country-specific data
 */
export const viewCsvReport = async (req: Request, res: Response): Promise<void> => {
    if (!req.session.user) {
        res.redirect('/auth/login');
        return;
    }

    // Check if session exists and folder path is available
    if (!req.session || !req.session.userUploadFolerPath) {
        // Optionally store the original request URL to redirect back after login
        req.session.redirectAfterLogin = req.originalUrl;
        res.redirect('/auth/login');
        return;
    }

    const reportName = req.params.name;
    const folderPath = req.session.userUploadFolerPath;
    const resultsRoot = path.join(folderPath, 'Results');

    if (!fs.existsSync(resultsRoot)) {
        res.status(404).render('404', { message: 'Report not found' });
        return;
    }

    let countries: string[] = [];
    if (fs.existsSync(resultsRoot)) {
        countries = fs.readdirSync(resultsRoot)
            .filter(f => fs.statSync(path.join(resultsRoot, f)).isDirectory());
    }

    if (countries.length === 0) {
        res.status(404).render('404', { message: 'No country reports found' });
        return;
    }

    // Figure out which country to show (query param ?country=XYZ)
    const selectedCountry = req.query.country && countries.includes(req.query.country as string)
        ? (req.query.country as string)
        : (countries[0] || '');   // default to the first

    const countryFolder = path.join(resultsRoot, selectedCountry);

    await runRScript('Interactive_Mekko_chart.R', [countryFolder]);

    // Read CSVs in that folder
    const reportData: Record<string, any[]> = {};
    try {
        const files = fs.readdirSync(countryFolder).filter(f => f.endsWith('.csv'));

        for (const file of files) {
            const tableName = path.basename(file, '.csv');
            const filePath = path.join(countryFolder, file);
            reportData[tableName] = await parseCsvToJson(filePath);
        }

        const mekkoPath1 = path.join(countryFolder, 'Current Value Pool.html');
        let mekkoHtml = '';
        if (fs.existsSync(mekkoPath1)) {
            mekkoHtml = fs.readFileSync(mekkoPath1, 'utf8');
        } else {
            log.warn('Mekko chart not found:', mekkoPath1);
        }

        const mekkoPath2 = path.join(countryFolder, 'Forecasted Value Pool.html');
        let mekkoHtml2 = '';
        if (fs.existsSync(mekkoPath2)) {
            mekkoHtml2 = fs.readFileSync(mekkoPath2, 'utf8');
        } else {
            log.warn('Mekko chart not found:', mekkoPath2);
        }

        const mekkoPath3 = path.join(countryFolder, '  Value Pool.html');
        let mekkoHtml3 = '';
        if (fs.existsSync(mekkoPath3)) {
            mekkoHtml3 = fs.readFileSync(mekkoPath3, 'utf8');
        } else {
            log.warn('Mekko chart not found:', mekkoPath3);
        }

        log.debug('Current year', reportData['Current_year']);

        // Render, passing list + selection + data
        res.render('report', {
            title: `Report: ${reportName}`,
            user: req.session.user,
            reportName,
            countries,
            selectedCountry,
            data: reportData,
            mekkochart1: mekkoHtml,
            mekkochart2: mekkoHtml2,
            mekkochart3: mekkoHtml3,
            duration: req.session.forcastDuration,
            reportId: req.session.currentReportId || null
        });

    } catch (err) {
        log.error('Error while viewing report', { reason: err });
        res.status(500).render('error', { message: 'Error loading report' });
    }
};

/**
 * Download Excel report with all sheets
 */
export const downloadExcelReport = async (req: Request, res: Response): Promise<void> => {
    if (!req.session || !req.session.userUploadFolerPath) {
        // Optionally store the original request URL to redirect back after login
        req.session.redirectAfterLogin = req.originalUrl;
        res.redirect('/auth/login');
        return;
    }

    const reportFolderPath = req.session.userUploadFolerPath;
    const resultsRoot = safeJoin(reportFolderPath, 'Results');

    if (!fs.existsSync(resultsRoot)) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
    }

    try {
        const countries = fs.readdirSync(resultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const selectedCountry = req.query.country && countries.includes(req.query.country as string)
            ? (req.query.country as string)
            : (countries[0] || '');

        const countryFolder = path.join(resultsRoot, selectedCountry);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Forecast App';
        workbook.created = new Date();

        const finalModelSheet = workbook.addWorksheet('Final Model');
        const topDownSheet = workbook.addWorksheet('Serves Top-Down');
        const boottomUpSheet = workbook.addWorksheet('Serves Bottom-Up');
        const ensembleforcastSheet = workbook.addWorksheet('Serves Ensemble-Forcast');
        const imageSheet = workbook.addWorksheet('Theory Scenarios', { pageSetup: { orientation: 'landscape' } });

        log.debug('Selected country name', selectedCountry);

        await generateSheets(finalModelSheet, countryFolder, getFileListForSection('Final Model'), selectedCountry);
        await generateSheets(topDownSheet, countryFolder, getFileListForSection('Serves Top-Down'));
        await generateSheets(boottomUpSheet, countryFolder, getFileListForSection('Serves Bottom-Up'));
        await generateSheets(ensembleforcastSheet, countryFolder, getFileListForSection('Serves Ensemble-Forcast'));

        await addBannerSheet(imageSheet, workbook);

        const fileName = `Forecast_Report_${selectedCountry}_${Date.now()}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error('Download Excel Error:', { reason: err });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Get Mekko chart HTML for rendering
 */
export const getMekkoChart = async (req: Request, res: Response): Promise<void> => {
    const reportFolderPath = req.session.userUploadFolerPath || '';
    const resultsRoot = safeJoin(reportFolderPath, 'Results');

    if (!fs.existsSync(resultsRoot)) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
    }

    // Find countries
    const countries = fs.readdirSync(resultsRoot)
        .filter(f => fs.statSync(path.join(resultsRoot, f)).isDirectory());

    if (countries.length === 0) {
        res.status(404).json({ success: false, error: 'No country reports found' });
        return;
    }

    const selectedCountry = req.query.country && countries.includes(req.query.country as string)
        ? (req.query.country as string)
        : (countries[0] || '');

    let filename: string;
    const chartParam = req.query.chart as string;

    if (chartParam === '1') {
        filename = 'Current Value Pool.html';
    } else if (chartParam === '2') {
        filename = 'Forecasted Value Pool.html';
    } else if (chartParam === '3') {
        filename = '  Value Pool.html';
    } else {
        res.status(400).json({ success: false, error: 'Invalid chart parameter' });
        return;
    }

    log.debug('Selected country name', selectedCountry);

    const countryFolder = path.join(resultsRoot, selectedCountry);
    const mekkoPath3 = path.join(countryFolder, filename);

    if (fs.existsSync(mekkoPath3)) {
        const mekkoHtml3 = fs.readFileSync(mekkoPath3, 'utf8');
        res.set('Content-Type', 'text/html');
        res.send(mekkoHtml3);
    } else {
        log.warn('Mekko chart not found:', mekkoPath3);
        res.status(404).json({ success: false, error: 'Chart not found' });
    }
};

/**
 * Get CSV report data as JSON
 */
export const getCsvReportData = async (req: Request, res: Response): Promise<void> => {
    const reportFolderPath = req.session.userUploadFolerPath || '';
    const resultsRoot = safeJoin(reportFolderPath, 'Results');

    if (!fs.existsSync(resultsRoot)) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
    }

    // Find countries
    const countries = fs.readdirSync(resultsRoot)
        .filter(f => fs.statSync(path.join(resultsRoot, f)).isDirectory());

    if (countries.length === 0) {
        res.status(404).json({ success: false, error: 'No country reports found' });
        return;
    }

    const selectedCountry = req.query.country && countries.includes(req.query.country as string)
        ? (req.query.country as string)
        : (countries[0] || '');

    const countryFolder = path.join(resultsRoot, selectedCountry);

    try {
        const files = fs.readdirSync(countryFolder)
            .filter(f => f.endsWith('.csv'));

        const reportData: Record<string, any[]> = {};
        for (const file of files) {
            const tableName = path.basename(file, '.csv');
            reportData[tableName] = await parseCsvToJson(path.join(countryFolder, file));
        }

        const mekkoPath1 = path.join(countryFolder, 'Current Value Pool.html');
        const mekkoPath2 = path.join(countryFolder, 'Forecasted Value Pool.html');
        const mekkoPath3 = path.join(countryFolder, '  Value Pool.html');

        if (!fs.existsSync(mekkoPath1) || !fs.existsSync(mekkoPath2) || !fs.existsSync(mekkoPath3)) {
            await runRScript('Interactive_Mekko_chart.R', [countryFolder]);
        }

        res.json({ success: true, data: reportData, countries, selectedCountry });
    } catch (err) {
        log.warn('Error', { reason: err });
        res.status(500).json({ success: false, error: 'Error loading report data' });
    }
};
