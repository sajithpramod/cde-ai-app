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
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const uploadController_1 = require("../controllers/uploadController");
const pythonScriptService_1 = require("../services/pythonScriptService");
const rScriptService_1 = require("../services/rScriptService");
const csvHelper_1 = require("../services/csvHelper");
const { body, validationResult } = require('express-validator');
const validateAndStoreDynamic_1 = require("../middlewares/validateAndStoreDynamic");
const marketCountryValidator_1 = require("../utils/marketCountryValidator");
const templateValidator_1 = require("../services/templateValidator");
const forecastProgress_1 = require("../services/forecastProgress");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = __importDefault(require("../services/db"));
const debugLogger_1 = require("../utils/debugLogger");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const inputValidation_1 = require("../middlewares/inputValidation");
const log = (0, debugLogger_1.createModuleLogger)('reports');
const uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: 'Too many uploads from this IP, please try again later.'
    }
});
const foreCastLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many uploads from this IP, please try again later.'
    }
});
const downloadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Too many download requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
const FILES = {
    PRICE_TIER_COLUMNS: 'all_price_tier_columns.csv',
    PRICE_TIER_RENAME: 'price_tier_rename_template.csv',
    PRICE_TIER_COUNT: 'price_tier_count_check.csv'
};
const SCRIPT_MAP = Object.create(null);
SCRIPT_MAP['Nielsen_initialDataFile'] = 'Python1.py';
SCRIPT_MAP['iwsr_initialDataFile'] = 'Python1.py';
SCRIPT_MAP['iwsr_ForesightFile'] = 'clean_foresight_data.R';
SCRIPT_MAP['Nielsen_ForesightFile'] = 'clean_foresight_data.R';
SCRIPT_MAP['iwsr_ ategoryRSVFile'] = 'Python2.py';
SCRIPT_MAP['Nielsen_ ategoryRSVFile'] = 'Python2.py';
SCRIPT_MAP['iwsr_CCFbackdataFile'] = 'Python3.py';
SCRIPT_MAP['Nielsen_CCFbackdataFile'] = 'Python3.py';
function resolveSafePath(baseDir, ...parts) {
    const fullPath = path.resolve(baseDir, ...parts);
    if (!fullPath.startsWith(baseDir)) {
        throw new Error('Invalid file path');
    }
    return fullPath;
}
function safeParseArray(input) {
    if (Array.isArray(input))
        return input;
    try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
const forecastValidationRules = [
    body('cagrData').isArray({ min: 1 }).withMessage('cagrData must be a non-empty array'),
    body('cagrData.*.tier')
        .isString().withMessage('Each tier must be a string')
        .trim().notEmpty().withMessage('tier cannot be empty'),
    body('cagrData.*.cagr')
        .custom((value) => {
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error('cagr must be a valid number');
        }
        return true;
    }),
    body('countryNames').optional().isArray(),
    body('countryNames.*').optional().isString().trim().notEmpty(),
    body('marketNames').optional().isArray(),
    body('marketNames.*').optional().isString().trim().notEmpty(),
    (req, res, next) => {
        const { countryNames, marketNames, countryMultiSelect } = req.body;
        if (countryMultiSelect != 'Subclusters') {
            if ((!countryNames || countryNames.length === 0) && (!marketNames || marketNames.length === 0)) {
                res.status(400).json({ success: false, error: 'Either countryNames or marketNames must be provided' });
                return;
            }
        }
        next();
    }
];
module.exports = (io) => {
    const router = express_1.default.Router();
    router.post('/forecast', authMiddleware_1.ensureAuthenticated, foreCastLimiter, forecastValidationRules, (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        (0, uploadController_1.handleForecastForm)(req, res, io);
    });
    router.get('/exchange-rate', authMiddleware_1.ensureAuthenticated, downloadLimiter, (_req, res) => {
        const filePath = path.join(__dirname, '..', 'uploads', 'Currency_and_Exchange_rate.xlsx');
        res.download(filePath, 'exchange-rate.xlsx', (err) => {
            if (err) {
                res.status(500).send('File could not be downloaded.');
            }
        });
    });
    router.get('/download-mapped-csv', authMiddleware_1.ensureAuthenticated, downloadLimiter, (0, inputValidation_1.validateRequest)(inputValidation_1.fileDownloadSchema, 'query'), (req, res) => {
        try {
            const { file, folder } = req.query;
            let folderName = folder;
            if (!file) {
                res.status(400).json({ success: false, error: 'File parameter is required' });
                return;
            }
            if (!folder) {
                res.status(400).json({ success: false, error: 'Folder parameter is required' });
                return;
            }
            if (file.includes('..') || folder.includes('..') || file.includes('/') || file.includes('\\') || folderName.includes('/') || folderName.includes('\\')) {
                res.status(403).json({ success: false, error: 'Invalid file or folder path' });
                return;
            }
            const allowedFiles = ['mapped_latest_year_data.csv', 'mapped_back_data.csv', 'mapped_latest_year.csv'];
            if (!allowedFiles.includes(file)) {
                res.status(403).json({ success: false, error: 'Access to this file is not allowed' });
                return;
            }
            const uploadsDir = req.session.userUploadFolerPath;
            if (!uploadsDir) {
                res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
                return;
            }
            const filePath = path.join(uploadsDir, file);
            const resolvedFilePath = path.resolve(filePath);
            const resolvedUploadsDir = path.resolve(uploadsDir);
            if (!resolvedFilePath.startsWith(resolvedUploadsDir)) {
                log.error('Path traversal attempt detected', {
                    filePath: resolvedFilePath,
                    uploadsDir: resolvedUploadsDir
                });
                res.status(403).json({ success: false, error: 'Access denied: Invalid file path' });
            }
            if (!fs.existsSync(resolvedFilePath)) {
                log.error(`File not found: ${resolvedFilePath}`);
                res.status(404).json({ success: false, error: 'File not found. The file may not have been generated yet.' });
            }
            res.download(resolvedFilePath, file, (err) => {
                if (err) {
                    log.error('File download error:', err);
                    res.status(500).json({ success: false, error: 'File could not be downloaded.' });
                }
            });
        }
        catch (error) {
            log.error('File download error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });
    router.post('/runRscript3', authMiddleware_1.ensureAuthenticated, async (req, res) => {
        try {
            const uploadDir = req.session.userUploadFolerPath;
            if (!uploadDir) {
                res.status(400).json({ success: false, error: 'Upload folder path not found in session' });
                return;
            }
            fs.mkdirSync(uploadDir, { recursive: true });
            const { selected, renameData, countryNames } = req.body;
            if (!Array.isArray(renameData)) {
                res.status(400).json({ success: false, error: 'Invalid input format' });
            }
            const priceGrossTierPath = path.join(uploadDir, 'pt_growth_input_template.csv');
            if (Array.isArray(renameData) && renameData.length > 0) {
                if (fs.existsSync(priceGrossTierPath)) {
                    fs.unlinkSync(priceGrossTierPath);
                }
                const renameCsvPath = path.join(uploadDir, 'price_tier_rename_filled.csv');
                const renameCsv = 'Original price tier,Renamed price tier,Rank price tier\n' +
                    renameData
                        .map(r => `${r.original},${r.renamed || r.original},${r.rank}`)
                        .join('\n') + '\n';
                fs.writeFileSync(renameCsvPath, renameCsv);
            }
            if (!selected) {
                res.status(400).json({ success: false, error: 'Missing selected input' });
            }
            let script = '03_forecast_timeframe.R';
            let result;
            if (countryNames && countryNames.includes('Indonesia')) {
                script = 'BGS/03_forecast_timeframe_BGS.R';
                result = await (0, rScriptService_1.runRScript)(script, [uploadDir, 'price_tier_rename_filled.csv'], io);
            }
            else {
                result = await (0, rScriptService_1.runRScript)(script, [uploadDir, selected || '', 'price_tier_rename_filled.csv'], io);
            }
            if (!result.success) {
                res.status(500).json({ success: false, error: result.error });
            }
            if (fs.existsSync(priceGrossTierPath)) {
                const priceTierGrowthTemplate = await (0, csvHelper_1.parseCsv)(priceGrossTierPath);
                res.json({
                    success: true,
                    priceTierGrowthTemplate,
                });
            }
            else {
                res.status(500).json({ success: false, error: 'Growth file is not generated' });
            }
        }
        catch (err) {
            log.error('Error', err);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });
    router.get('/', authMiddleware_1.ensureAuthenticated, (req, res) => {
        res.render('upload', { title: 'Upload Page', user: req.session.user });
    });
    router.get('/progress', authMiddleware_1.ensureAuthenticated, async (req, res) => {
        try {
            const userId = req.session.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Not logged in' });
                return;
            }
            const result = await (0, db_1.default)('user_forecast_progress')
                .select('form_data', 'uploaded_files', 'country_selection')
                .where({ user_id: userId, is_complete: false })
                .limit(1);
            if (result.length === 0) {
                res.json({ success: false, inProgress: false, message: 'No progress found' });
                return;
            }
            const firstResult = result[0];
            if (!firstResult) {
                res.json({ success: false, inProgress: false, message: 'No progress found' });
                return;
            }
            const { form_data, uploaded_files, country_selection } = firstResult;
            const prefillData = {
                dataType: form_data?.dataType || '',
                typeOfModel: form_data?.typeOfModel || '',
                marketId: form_data?.marketSelect || '',
                exchangeRate: form_data?.exchangeRate || '',
                fromCurrency: form_data?.fromCurrency || '',
                toCurrency: form_data?.toCurrency || '',
                selectedPriceTier: form_data?.selectedPriceTier || '',
                subClusterSelect: form_data?.subClusterSelect || '',
                countryMultiSelect: country_selection?.countryMultiSelect || '',
                countryNames: country_selection?.countryNames || [],
                forecastDuration: form_data?.forcastDuration || '',
            };
            if (form_data?.validatedFilePath) {
                req.session.userUploadFolerPath = form_data.validatedFilePath;
            }
            const internalFiles = Array.isArray(uploaded_files) ? uploaded_files : [];
            const prefillFiles = {
                initialDataFile: form_data?.fileName
                    ? {
                        name: form_data.fileName,
                        url: form_data.validatedFilePath
                            ? `/uploads/${path.basename(form_data.validatedFilePath)}`
                            : null,
                    }
                    : null,
                attachmentFiles: internalFiles.map(file => ({
                    field: file.field,
                    file_name: file.file_name,
                    url: `/uploads/${path.basename(file.path)}`,
                })),
            };
            let tierColumns;
            let renamePriceTier;
            const initialFile = internalFiles.find(f => f.field === 'initialDataFile');
            const ccFbackdataFile = internalFiles.find(f => f.field === 'CCFbackdataFile');
            const foresightFile = internalFiles.find(f => f.field === 'ForesightFile');
            if (initialFile) {
                const uploadFolder = initialFile.path;
                const tierPath = path.join(uploadFolder, FILES.PRICE_TIER_COLUMNS);
                if (fs.existsSync(tierPath)) {
                    tierColumns = await (0, csvHelper_1.parsePriceTierCsv)(tierPath);
                }
            }
            if (ccFbackdataFile && initialFile) {
                const uploadFolder = initialFile.path;
                const renamePriceTierFile = path.join(uploadFolder, 'price_tier_rename_filled.csv');
                const renaePriceTierTemplate = path.join(uploadFolder, 'price_tier_rename_template.csv');
                log.debug('tierPath', renamePriceTierFile);
                if (fs.existsSync(renamePriceTierFile)) {
                    renamePriceTier = await (0, csvHelper_1.parseRenamePriceTierFilledCsv)(renamePriceTierFile);
                }
                else if (fs.existsSync(renaePriceTierTemplate)) {
                    renamePriceTier = await (0, csvHelper_1.parseRenamePriceTierFilledCsv)(renaePriceTierTemplate);
                }
                log.debug('renamePriceTier', renamePriceTier);
            }
            let priceTierGrowthTemplate;
            if (foresightFile && initialFile) {
                const uploadFolder = initialFile.path;
                const priceGrossTierPath = path.join(uploadFolder, 'pt_growth_input_template.csv');
                log.debug('Checking for growth template at:', priceGrossTierPath);
                if (fs.existsSync(priceGrossTierPath)) {
                    priceTierGrowthTemplate = await (0, csvHelper_1.parseCsv)(priceGrossTierPath);
                    log.debug('Found growth template:', priceTierGrowthTemplate);
                }
            }
            res.json({
                success: true,
                inProgress: true,
                prefillData,
                prefillFiles,
                tierColumns,
                renamePriceTier,
                priceTierGrowthTemplate
            });
        }
        catch (err) {
            log.error('Error fetching progress:', err);
            res.status(500).json({ success: false, message: 'Error fetching progress' });
        }
    });
    router.delete('/progress', authMiddleware_1.ensureAuthenticated, async (req, res) => {
        try {
            const userId = req.session.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Not logged in' });
                return;
            }
            const deleted = await (0, db_1.default)('user_forecast_progress')
                .where({ user_id: userId, is_complete: false })
                .del();
            if (deleted > 0) {
                log.info(`Deleted incomplete forecast for user ${userId}`);
                res.json({ success: true, message: 'Draft discarded successfully' });
            }
            else {
                res.json({ success: false, message: 'No draft found to discard' });
            }
        }
        catch (err) {
            log.error('Error discarding progress:', err);
            res.status(500).json({ success: false, message: 'Error discarding draft' });
        }
    });
    router.post('/single', authMiddleware_1.ensureAuthenticated, uploadLimiter, (0, validateAndStoreDynamic_1.validateAndStoreDynamic)(), (0, marketCountryValidator_1.validateMarketAndCountry)(), async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
            }
            const { fileName, validatedFilePath, fieldName } = req;
            const { countryMultiSelect, countryNames: rawCountryNames, marketNames: rawMarketNames, selectedPriceTier, exchangeRate, marketSelect, typeOfModel, fromCurrency, toCurrency, subClusterSelect, forcastDuration, dataType } = req.body;
            const marketNames = safeParseArray(rawMarketNames);
            let countryNames = [];
            if (countryMultiSelect === 'AllCountries') {
                if (!marketNames?.length) {
                    res.status(400).json({ success: false, error: 'Market selection is required for AllCountries' });
                }
                const allCountries = await (0, db_1.default)('countries')
                    .select('country_name')
                    .whereIn('cluster_name', marketNames)
                    .orderBy('country_name');
                countryNames = allCountries.map(c => c.country_name);
            }
            else {
                try {
                    countryNames = safeParseArray(rawCountryNames);
                }
                catch {
                    res.status(400).json({ success: false, error: 'Invalid countryNames format' });
                }
            }
            const expectedCountries = countryNames.length ? countryNames : marketNames;
            if (expectedCountries.length && countryMultiSelect !== 'Subclusters' && validatedFilePath && fileName) {
                const check = await (0, templateValidator_1.validateCountriesInExcel)(resolveSafePath(validatedFilePath, fileName), expectedCountries);
                if (!check.success) {
                    res.status(400).json({
                        success: false,
                        error: `Missing countries in Excel: ${check.missingCountries?.join(', ') || 'unknown'}`
                    });
                    return;
                }
            }
            const socketEvent = `upload-progress:${fileName}`;
            const emit = (msg) => io.emit(socketEvent, msg);
            emit({ step: 'upload_complete', message: 'File uploaded, processing started...' });
            const scriptKey = `${dataType}_${fieldName}`;
            let script = '';
            if (SCRIPT_MAP[scriptKey]) {
                script = SCRIPT_MAP[scriptKey];
            }
            let result;
            if (script.endsWith('.py') && validatedFilePath) {
                result = await handlePythonScript(script, validatedFilePath, dataType, fieldName, selectedPriceTier, exchangeRate);
            }
            else if (script && validatedFilePath) {
                try {
                    result = await (0, rScriptService_1.runRScript)(script, [validatedFilePath], io);
                }
                catch (err) {
                    res.status(500).json({ success: false, error: err.message });
                }
            }
            await (0, forecastProgress_1.saveForecastProgress)(db_1.default, req, {
                dataType,
                fieldName,
                fileName,
                validatedFilePath,
                countryMultiSelect: countryMultiSelect ? [countryMultiSelect] : undefined,
                countryNames,
                marketNames,
                selectedPriceTier: selectedPriceTier ? [selectedPriceTier] : undefined,
                exchangeRate,
                marketSelect,
                typeOfModel,
                fromCurrency,
                toCurrency,
                subClusterSelect: subClusterSelect ? [subClusterSelect] : undefined,
                forcastDuration
            });
            res.json({ success: true, ...result });
        }
        catch (err) {
            if (process.env.NODE_ENV === 'production') {
                res.status(500).json({ success: false, error: 'An error occurred, please contact admin' });
            }
            else {
                res.status(500).json({ success: false, error: err.error });
            }
        }
    });
    async function handlePythonScript(script, validatedFilePath, dataType, fieldName, selectedPriceTier, exchangeRate) {
        let tierColumns = null;
        let priceTierRenameColumns = null;
        try {
            if (script === 'Python1.py' && dataType) {
                const tierPath = path.join(validatedFilePath, FILES.PRICE_TIER_COLUMNS);
                if (fs.existsSync(tierPath))
                    fs.unlinkSync(tierPath);
                await (0, pythonScriptService_1.runPythonScript)(script, [validatedFilePath, dataType]);
                if (!fs.existsSync(tierPath)) {
                    throw new Error('Processing failed, file not generated');
                }
                tierColumns = await (0, csvHelper_1.parsePriceTierCsv)(tierPath);
            }
            if (fieldName === ' ategoryRSVFile' && dataType && selectedPriceTier && exchangeRate) {
                await (0, pythonScriptService_1.runPythonScript)(script, [validatedFilePath, dataType, selectedPriceTier, exchangeRate]);
            }
            if (fieldName === 'CCFbackdataFile' && dataType && selectedPriceTier) {
                const checkPath = path.join(validatedFilePath, FILES.PRICE_TIER_COUNT);
                const renamePath = path.join(validatedFilePath, FILES.PRICE_TIER_RENAME);
                [checkPath, renamePath].forEach(file => fs.existsSync(file) && fs.unlinkSync(file));
                await (0, pythonScriptService_1.runPythonScript)(script, [validatedFilePath, dataType, selectedPriceTier]);
                if (fs.existsSync(renamePath)) {
                    priceTierRenameColumns = await (0, csvHelper_1.parseRenamePriceTierFilledCsv)(renamePath);
                }
                else {
                    throw new Error('Processing failed, file not generated');
                }
            }
            return { tierColumns, priceTierRenameColumns };
        }
        catch (err) {
            log.error('Python error:', err.message);
            throw err;
        }
    }
    return router;
};
//# sourceMappingURL=upload.js.map