"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCsvReportData = exports.getMekkoChart = exports.downloadExcelReport = exports.viewCsvReport = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const rScriptService_1 = require("../services/rScriptService");
const exceljs_1 = __importDefault(require("exceljs"));
const csvHelper_1 = require("../services/csvHelper");
const generateReprotXlSheets_1 = require("../services/generateReprotXlSheets");
const debugLogger_1 = require("../utils/debugLogger");
const reportUtils_1 = require("../utils/reportUtils");
const log = (0, debugLogger_1.createModuleLogger)('report');
const viewCsvReport = async (req, res) => {
    if (!req.session.user) {
        res.redirect('/auth/login');
        return;
    }
    if (!req.session || !req.session.userUploadFolerPath) {
        req.session.redirectAfterLogin = req.originalUrl;
        res.redirect('/auth/login');
        return;
    }
    const reportName = req.params.name;
    const folderPath = req.session.userUploadFolerPath;
    const resultsRoot = path_1.default.join(folderPath, 'Results');
    if (!fs_1.default.existsSync(resultsRoot)) {
        res.status(404).render('404', { message: 'Report not found' });
        return;
    }
    let countries = [];
    if (fs_1.default.existsSync(resultsRoot)) {
        countries = fs_1.default.readdirSync(resultsRoot)
            .filter(f => fs_1.default.statSync(path_1.default.join(resultsRoot, f)).isDirectory());
    }
    if (countries.length === 0) {
        res.status(404).render('404', { message: 'No country reports found' });
        return;
    }
    const selectedCountry = req.query.country && countries.includes(req.query.country)
        ? req.query.country
        : (countries[0] || '');
    const countryFolder = path_1.default.join(resultsRoot, selectedCountry);
    await (0, rScriptService_1.runRScript)('Interactive_Mekko_chart.R', [countryFolder]);
    const reportData = {};
    try {
        const files = fs_1.default.readdirSync(countryFolder).filter(f => f.endsWith('.csv'));
        for (const file of files) {
            const tableName = path_1.default.basename(file, '.csv');
            const filePath = path_1.default.join(countryFolder, file);
            reportData[tableName] = await (0, csvHelper_1.parseCsvToJson)(filePath);
        }
        const mekkoPath1 = path_1.default.join(countryFolder, 'Current Value Pool.html');
        let mekkoHtml = '';
        if (fs_1.default.existsSync(mekkoPath1)) {
            mekkoHtml = fs_1.default.readFileSync(mekkoPath1, 'utf8');
        }
        else {
            log.warn('Mekko chart not found:', mekkoPath1);
        }
        const mekkoPath2 = path_1.default.join(countryFolder, 'Forecasted Value Pool.html');
        let mekkoHtml2 = '';
        if (fs_1.default.existsSync(mekkoPath2)) {
            mekkoHtml2 = fs_1.default.readFileSync(mekkoPath2, 'utf8');
        }
        else {
            log.warn('Mekko chart not found:', mekkoPath2);
        }
        const mekkoPath3 = path_1.default.join(countryFolder, '  Value Pool.html');
        let mekkoHtml3 = '';
        if (fs_1.default.existsSync(mekkoPath3)) {
            mekkoHtml3 = fs_1.default.readFileSync(mekkoPath3, 'utf8');
        }
        else {
            log.warn('Mekko chart not found:', mekkoPath3);
        }
        log.debug('Current year', reportData['Current_year']);
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
    }
    catch (err) {
        log.error('Error while viewing report', { reason: err });
        res.status(500).render('error', { message: 'Error loading report' });
    }
};
exports.viewCsvReport = viewCsvReport;
const downloadExcelReport = async (req, res) => {
    if (!req.session || !req.session.userUploadFolerPath) {
        req.session.redirectAfterLogin = req.originalUrl;
        res.redirect('/auth/login');
        return;
    }
    const reportFolderPath = req.session.userUploadFolerPath;
    const resultsRoot = (0, reportUtils_1.safeJoin)(reportFolderPath, 'Results');
    if (!fs_1.default.existsSync(resultsRoot)) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
    }
    try {
        const countries = fs_1.default.readdirSync(resultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        const selectedCountry = req.query.country && countries.includes(req.query.country)
            ? req.query.country
            : (countries[0] || '');
        const countryFolder = path_1.default.join(resultsRoot, selectedCountry);
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'Forecast App';
        workbook.created = new Date();
        const finalModelSheet = workbook.addWorksheet('Final Model');
        const topDownSheet = workbook.addWorksheet('Serves Top-Down');
        const boottomUpSheet = workbook.addWorksheet('Serves Bottom-Up');
        const ensembleforcastSheet = workbook.addWorksheet('Serves Ensemble-Forcast');
        const imageSheet = workbook.addWorksheet('Theory Scenarios', { pageSetup: { orientation: 'landscape' } });
        log.debug('Selected country name', selectedCountry);
        await (0, generateReprotXlSheets_1.generateSheets)(finalModelSheet, countryFolder, (0, reportUtils_1.getFileListForSection)('Final Model'), selectedCountry);
        await (0, generateReprotXlSheets_1.generateSheets)(topDownSheet, countryFolder, (0, reportUtils_1.getFileListForSection)('Serves Top-Down'));
        await (0, generateReprotXlSheets_1.generateSheets)(boottomUpSheet, countryFolder, (0, reportUtils_1.getFileListForSection)('Serves Bottom-Up'));
        await (0, generateReprotXlSheets_1.generateSheets)(ensembleforcastSheet, countryFolder, (0, reportUtils_1.getFileListForSection)('Serves Ensemble-Forcast'));
        await (0, generateReprotXlSheets_1.addBannerSheet)(imageSheet, workbook);
        const fileName = `Forecast_Report_${selectedCountry}_${Date.now()}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (err) {
        log.error('Download Excel Error:', { reason: err });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.downloadExcelReport = downloadExcelReport;
const getMekkoChart = async (req, res) => {
    const reportFolderPath = req.session.userUploadFolerPath || '';
    const resultsRoot = (0, reportUtils_1.safeJoin)(reportFolderPath, 'Results');
    if (!fs_1.default.existsSync(resultsRoot)) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
    }
    const countries = fs_1.default.readdirSync(resultsRoot)
        .filter(f => fs_1.default.statSync(path_1.default.join(resultsRoot, f)).isDirectory());
    if (countries.length === 0) {
        res.status(404).json({ success: false, error: 'No country reports found' });
        return;
    }
    const selectedCountry = req.query.country && countries.includes(req.query.country)
        ? req.query.country
        : (countries[0] || '');
    let filename;
    const chartParam = req.query.chart;
    if (chartParam === '1') {
        filename = 'Current Value Pool.html';
    }
    else if (chartParam === '2') {
        filename = 'Forecasted Value Pool.html';
    }
    else if (chartParam === '3') {
        filename = '  Value Pool.html';
    }
    else {
        res.status(400).json({ success: false, error: 'Invalid chart parameter' });
        return;
    }
    log.debug('Selected country name', selectedCountry);
    const countryFolder = path_1.default.join(resultsRoot, selectedCountry);
    const mekkoPath3 = path_1.default.join(countryFolder, filename);
    if (fs_1.default.existsSync(mekkoPath3)) {
        const mekkoHtml3 = fs_1.default.readFileSync(mekkoPath3, 'utf8');
        res.set('Content-Type', 'text/html');
        res.send(mekkoHtml3);
    }
    else {
        log.warn('Mekko chart not found:', mekkoPath3);
        res.status(404).json({ success: false, error: 'Chart not found' });
    }
};
exports.getMekkoChart = getMekkoChart;
const getCsvReportData = async (req, res) => {
    const reportFolderPath = req.session.userUploadFolerPath || '';
    const resultsRoot = (0, reportUtils_1.safeJoin)(reportFolderPath, 'Results');
    if (!fs_1.default.existsSync(resultsRoot)) {
        res.status(404).json({ success: false, error: 'Report not found' });
        return;
    }
    const countries = fs_1.default.readdirSync(resultsRoot)
        .filter(f => fs_1.default.statSync(path_1.default.join(resultsRoot, f)).isDirectory());
    if (countries.length === 0) {
        res.status(404).json({ success: false, error: 'No country reports found' });
        return;
    }
    const selectedCountry = req.query.country && countries.includes(req.query.country)
        ? req.query.country
        : (countries[0] || '');
    const countryFolder = path_1.default.join(resultsRoot, selectedCountry);
    try {
        const files = fs_1.default.readdirSync(countryFolder)
            .filter(f => f.endsWith('.csv'));
        const reportData = {};
        for (const file of files) {
            const tableName = path_1.default.basename(file, '.csv');
            reportData[tableName] = await (0, csvHelper_1.parseCsvToJson)(path_1.default.join(countryFolder, file));
        }
        const mekkoPath1 = path_1.default.join(countryFolder, 'Current Value Pool.html');
        const mekkoPath2 = path_1.default.join(countryFolder, 'Forecasted Value Pool.html');
        const mekkoPath3 = path_1.default.join(countryFolder, '  Value Pool.html');
        if (!fs_1.default.existsSync(mekkoPath1) || !fs_1.default.existsSync(mekkoPath2) || !fs_1.default.existsSync(mekkoPath3)) {
            await (0, rScriptService_1.runRScript)('Interactive_Mekko_chart.R', [countryFolder]);
        }
        res.json({ success: true, data: reportData, countries, selectedCountry });
    }
    catch (err) {
        log.warn('Error', { reason: err });
        res.status(500).json({ success: false, error: 'Error loading report data' });
    }
};
exports.getCsvReportData = getCsvReportData;
//# sourceMappingURL=reportController.js.map