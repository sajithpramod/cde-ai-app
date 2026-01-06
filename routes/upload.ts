// forecasting-app/routes/upload.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import { handleForecastForm } from '../controllers/uploadController';
import { runPythonScript } from '../services/pythonScriptService';
import { runRScript } from '../services/rScriptService';
import { parsePriceTierCsv, parseCsv, parseRenamePriceTierFilledCsv } from '../services/csvHelper';
const { body, validationResult } = require('express-validator');
import { validateAndStoreDynamic } from '../middlewares/validateAndStoreDynamic';
import { validateMarketAndCountry } from '../utils/marketCountryValidator';
import { validateCountriesInExcel } from '../services/templateValidator';
import { saveForecastProgress } from '../services/forecastProgress';
import rateLimit from 'express-rate-limit';
import db from '../services/db';
import { createModuleLogger } from '../utils/debugLogger';
import { ensureAuthenticated } from '../middlewares/authMiddleware';
import { validateRequest, fileDownloadSchema } from '../middlewares/inputValidation';
import { User } from '../types';

const log = createModuleLogger('reports');

// ============================================
// SESSION TYPE EXTENSIONS
// ============================================

// Extend Express session to include our custom properties
declare module 'express-session' {
    interface SessionData {
        user?: User;
        userUploadFolerPath?: string;
        forcastDuration?: string;
        staticMappingFile?: string;
        staticTBAMapping?: string;
    }
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RequestWithValidation extends Request {
    fileName?: string;
    validatedFilePath?: string;
    fieldName?: string;
}

interface UploadedFileInfo {
    field: string;
    file_name: string;
    path: string;
}

interface ForecastProgressData {
    form_data?: {
        dataType?: string;
        typeOfModel?: string;
        marketSelect?: string;
        exchangeRate?: string;
        fromCurrency?: string;
        toCurrency?: string;
        selectedPriceTier?: string;
        subClusterSelect?: string;
        forcastDuration?: string;
        fileName?: string;
        validatedFilePath?: string;
    };
    uploaded_files?: UploadedFileInfo[];
    country_selection?: {
        countryMultiSelect?: string;
        countryNames?: string[];
    };
}

interface CountryRow {
    country_name: string;
}

interface PriceTierRow {
    original: string;
    renamed?: string;
    rank: number;
}

interface PythonScriptResult {
    success?: boolean;
    tierColumns?: any;
    priceTierRenameColumns?: any;
}

// ============================================
// RATE LIMITERS
// ============================================

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: {
        success: false,
        error: 'Too many uploads from this IP, please try again later.'
    }
});

const foreCastLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        success: false,
        error: 'Too many uploads from this IP, please try again later.'
    }
});

// Rate limiter for download endpoints
const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Allow more downloads than uploads
    message: {
        success: false,
        error: 'Too many download requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// CONSTANTS
// ============================================

const FILES = {
    PRICE_TIER_COLUMNS: 'all_price_tier_columns.csv',
    PRICE_TIER_RENAME: 'price_tier_rename_template.csv',
    PRICE_TIER_COUNT: 'price_tier_count_check.csv'
} as const;

const SCRIPT_MAP: Record<string, string> = Object.create(null);
SCRIPT_MAP['Nielsen_initialDataFile'] = 'Python1.py';
SCRIPT_MAP['iwsr_initialDataFile'] = 'Python1.py';
SCRIPT_MAP['iwsr_ForesightFile'] = 'clean_foresight_data.R';
SCRIPT_MAP['Nielsen_ForesightFile'] = 'clean_foresight_data.R';
SCRIPT_MAP['iwsr_ ategoryRSVFile'] = 'Python2.py';
SCRIPT_MAP['Nielsen_ ategoryRSVFile'] = 'Python2.py';
SCRIPT_MAP['iwsr_CCFbackdataFile'] = 'Python3.py';
SCRIPT_MAP['Nielsen_CCFbackdataFile'] = 'Python3.py';

// ============================================
// HELPER FUNCTIONS
// ============================================

function resolveSafePath(baseDir: string, ...parts: string[]): string {
    const fullPath = path.resolve(baseDir, ...parts);
    if (!fullPath.startsWith(baseDir)) {
        throw new Error('Invalid file path');
    }
    return fullPath;
}

function safeParseArray(input: any): string[] {
    if (Array.isArray(input)) return input; // Already an array
    try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return []; // Fallback to empty array if invalid JSON
    }
}

// ============================================
// VALIDATION RULES
// ============================================

const forecastValidationRules: any[] = [
    body('cagrData').isArray({ min: 1 }).withMessage('cagrData must be a non-empty array'),

    body('cagrData.*.tier')
        .isString().withMessage('Each tier must be a string')
        .trim().notEmpty().withMessage('tier cannot be empty'),

    body('cagrData.*.cagr')
        .custom((value: any) => {
            const num = parseFloat(value);
            if (isNaN(num)) {
                throw new Error('cagr must be a valid number');
            }
            return true;
        }),

    // Optional validation for countryNames and marketNames
    body('countryNames').optional().isArray(),
    body('countryNames.*').optional().isString().trim().notEmpty(),
    body('marketNames').optional().isArray(),
    body('marketNames.*').optional().isString().trim().notEmpty(),

    // Ensure at least one of marketNames or countryNames is provided
    (req: Request, res: Response, next: NextFunction): void => {
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

// ============================================
// ROUTE HANDLER
// ============================================

export = (io: SocketIOServer): Router => {
    const router = express.Router();

    // POST /forecast - Handle forecast form submission
    router.post('/forecast',
        ensureAuthenticated,
        foreCastLimiter,
        forecastValidationRules,
        (req: Request, res: Response): void => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            handleForecastForm(req, res, io);
        });

    // GET /exchange-rate - Download exchange rate file
    router.get('/exchange-rate', ensureAuthenticated, downloadLimiter, (_req: Request, res: Response): void => {
        const filePath = path.join(__dirname, '..', 'uploads', 'Currency_and_Exchange_rate.xlsx');

        res.download(filePath, 'exchange-rate.xlsx', (err) => {
            if (err) {
                res.status(500).send('File could not be downloaded.');
            }
        });
    });

    // GET /download-mapped-csv - Download mapped CSV files after initialDataFile processing
    router.get('/download-mapped-csv', ensureAuthenticated, downloadLimiter, validateRequest(fileDownloadSchema, 'query') as any, (req: Request, res: Response): void => {
        try {
            const { file, folder } = req.query as { file?: string; folder?: string };

            let folderName = folder;

            // Validate file parameter
            if (!file) {
                res.status(400).json({ success: false, error: 'File parameter is required' });
                return;
            }

            // Validate folder parameter
            if (!folder) {
                res.status(400).json({ success: false, error: 'Folder parameter is required' });
                return;
            }

            // Prevent directory traversal attacks - check this FIRST for security
            if (file.includes('..') || folder.includes('..') || file.includes('/') || file.includes('\\') || folderName!.includes('/') || folderName!.includes('\\')) {
                res.status(403).json({ success: false, error: 'Invalid file or folder path' });
                return;
            }

            // Only allow specific CSV files for security
            const allowedFiles = ['mapped_latest_year_data.csv', 'mapped_back_data.csv', 'mapped_latest_year.csv'];
            if (!allowedFiles.includes(file)) {
                res.status(403).json({ success: false, error: 'Access to this file is not allowed' });
                return;
            }

            // Construct the full file path
            const uploadsDir = req.session.userUploadFolerPath;

            // Ensure uploadsDir exists
            if (!uploadsDir) {
                res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
                return;
            }

            const filePath = path.join(uploadsDir, file);

            // Enhanced path traversal protection with path.resolve()
            const resolvedFilePath = path.resolve(filePath);
            const resolvedUploadsDir = path.resolve(uploadsDir);

            // Verify the resolved path is still within the uploads directory
            if (!resolvedFilePath.startsWith(resolvedUploadsDir)) {
                log.error('Path traversal attempt detected', {
                    filePath: resolvedFilePath,
                    uploadsDir: resolvedUploadsDir
                });
                res.status(403).json({ success: false, error: 'Access denied: Invalid file path' });
            }

            // Check if file exists
            if (!fs.existsSync(resolvedFilePath)) {
                log.error(`File not found: ${resolvedFilePath}`);
                res.status(404).json({ success: false, error: 'File not found. The file may not have been generated yet.' });
            }

            // Send the file for download
            res.download(resolvedFilePath, file, (err) => {
                if (err) {
                    log.error('File download error:', err);
                    res.status(500).json({ success: false, error: 'File could not be downloaded.' });
                }
            });

        } catch (error) {
            log.error('File download error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // POST /runRscript3 - Run R script for price tier growth
    router.post('/runRscript3', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
        try {
            const uploadDir = req.session.userUploadFolerPath;
            if (!uploadDir) {
                res.status(400).json({ success: false, error: 'Upload folder path not found in session' });
                return;
            }

            fs.mkdirSync(uploadDir, { recursive: true });
            const { selected, renameData, countryNames } = req.body as {
                selected?: string;
                renameData?: PriceTierRow[];
                countryNames?: string[];
            };

            if (!Array.isArray(renameData)) {
                res.status(400).json({ success: false, error: 'Invalid input format' });
            }

            // 1. Write Rename + Rank CSV
            const priceGrossTierPath = path.join(uploadDir, 'pt_growth_input_template.csv');
            if (Array.isArray(renameData) && renameData.length > 0) {
                if (fs.existsSync(priceGrossTierPath)) {
                    fs.unlinkSync(priceGrossTierPath);
                }

                const renameCsvPath = path.join(uploadDir, 'price_tier_rename_filled.csv');
                const renameCsv =
                    'Original price tier,Renamed price tier,Rank price tier\n' +
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
                result = await runRScript(script, [uploadDir, 'price_tier_rename_filled.csv'], io);
            } else {
                result = await runRScript(script, [uploadDir, selected || '', 'price_tier_rename_filled.csv'], io);
            }

            if (!result.success) {
                res.status(500).json({ success: false, error: result.error });
            }

            if (fs.existsSync(priceGrossTierPath)) {
                const priceTierGrowthTemplate = await parseCsv(priceGrossTierPath);
                res.json({
                    success: true,
                    priceTierGrowthTemplate,
                });
            } else {
                res.status(500).json({ success: false, error: 'Growth file is not generated' });
            }

        } catch (err) {
            log.error('Error', err);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });

    // GET / - Render upload page
    router.get('/', ensureAuthenticated, (req: Request, res: Response) => {
        res.render('upload', { title: 'Upload Page', user: req.session.user });
    });

    // GET /progress - Get forecast progress
    router.get('/progress', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.session.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Not logged in' });
                return;
            }

            const result = await db('user_forecast_progress')
                .select('form_data', 'uploaded_files', 'country_selection')
                .where({ user_id: userId, is_complete: false })
                .limit(1) as ForecastProgressData[];

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

            // Normalize for frontend form structure
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

            // Keep full file info for internal processing
            const internalFiles: UploadedFileInfo[] = Array.isArray(uploaded_files) ? uploaded_files : [];

            const prefillFiles = {
                // For backward compatibility if old logic still provides single file info
                initialDataFile: form_data?.fileName
                    ? {
                        name: form_data.fileName,
                        url: form_data.validatedFilePath
                            ? `/uploads/${path.basename(form_data.validatedFilePath)}`
                            : null,
                    }
                    : null,

                // Convert uploaded_files array to attachmentFiles (sanitized for response)
                attachmentFiles: internalFiles.map(file => ({
                    field: file.field,
                    file_name: file.file_name,
                    url: `/uploads/${path.basename(file.path)}`,
                })),
            };

            // Optional: get tier columns only if initialDataFile exists
            let tierColumns: any;
            let renamePriceTier: any;
            const initialFile = internalFiles.find(f => f.field === 'initialDataFile');

            const ccFbackdataFile = internalFiles.find(f => f.field === 'CCFbackdataFile');
            const foresightFile = internalFiles.find(f => f.field === 'ForesightFile');

            if (initialFile) {
                const uploadFolder = initialFile.path;
                const tierPath = path.join(uploadFolder, FILES.PRICE_TIER_COLUMNS);
                if (fs.existsSync(tierPath)) {
                    tierColumns = await parsePriceTierCsv(tierPath);
                }
            }

            if (ccFbackdataFile && initialFile) {
                const uploadFolder = initialFile.path;
                const renamePriceTierFile = path.join(uploadFolder, 'price_tier_rename_filled.csv');
                const renaePriceTierTemplate = path.join(uploadFolder, 'price_tier_rename_template.csv');

                log.debug('tierPath', renamePriceTierFile);

                if (fs.existsSync(renamePriceTierFile)) {
                    renamePriceTier = await parseRenamePriceTierFilledCsv(renamePriceTierFile);
                } else if (fs.existsSync(renaePriceTierTemplate)) {
                    renamePriceTier = await parseRenamePriceTierFilledCsv(renaePriceTierTemplate);
                }
                log.debug('renamePriceTier', renamePriceTier);
            }

            // Check for growth template file
            let priceTierGrowthTemplate: any;
            if (foresightFile && initialFile) {
                const uploadFolder = initialFile.path;
                const priceGrossTierPath = path.join(uploadFolder, 'pt_growth_input_template.csv');

                log.debug('Checking for growth template at:', priceGrossTierPath);

                if (fs.existsSync(priceGrossTierPath)) {
                    priceTierGrowthTemplate = await parseCsv(priceGrossTierPath);
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
        } catch (err) {
            log.error('Error fetching progress:', err);
            res.status(500).json({ success: false, message: 'Error fetching progress' });
        }
    });

    // DELETE /progress - Discard incomplete forecast and start fresh
    router.delete('/progress', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.session.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Not logged in' });
                return;
            }

            // Delete the incomplete forecast record
            const deleted = await db('user_forecast_progress')
                .where({ user_id: userId, is_complete: false })
                .del();

            if (deleted > 0) {
                log.info(`Deleted incomplete forecast for user ${userId}`);
                res.json({ success: true, message: 'Draft discarded successfully' });
            } else {
                res.json({ success: false, message: 'No draft found to discard' });
            }
        } catch (err) {
            log.error('Error discarding progress:', err);
            res.status(500).json({ success: false, message: 'Error discarding draft' });
        }
    });

    // POST /single - Handle single file upload
    router.post(
        '/single',
        ensureAuthenticated,
        uploadLimiter,
        validateAndStoreDynamic(),
        validateMarketAndCountry(),
        async (req: RequestWithValidation, res: Response): Promise<void> => {
            try {
                // ---- 1. Request Validation ----
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ success: false, errors: errors.array() });
                }

                const { fileName, validatedFilePath, fieldName } = req;
                const {
                    countryMultiSelect,
                    countryNames: rawCountryNames,
                    marketNames: rawMarketNames,
                    selectedPriceTier,
                    exchangeRate,
                    marketSelect,
                    typeOfModel,
                    fromCurrency,
                    toCurrency,
                    subClusterSelect,
                    forcastDuration,
                    dataType
                } = req.body as {
                    countryMultiSelect?: string;
                    countryNames?: string | string[];
                    marketNames?: string | string[];
                    selectedPriceTier?: string;
                    exchangeRate?: string;
                    marketSelect?: string;
                    typeOfModel?: string;
                    fromCurrency?: string;
                    toCurrency?: string;
                    subClusterSelect?: string;
                    forcastDuration?: string;
                    dataType?: string;
                };

                const marketNames = safeParseArray(rawMarketNames);
                let countryNames: string[] = [];

                // ---- 2. Country Selection ----
                if (countryMultiSelect === 'AllCountries') {
                    if (!marketNames?.length) {
                        res.status(400).json({ success: false, error: 'Market selection is required for AllCountries' });
                    }
                    const allCountries = await db('countries')
                        .select('country_name')
                        .whereIn('cluster_name', marketNames)
                        .orderBy('country_name') as CountryRow[];
                    countryNames = allCountries.map(c => c.country_name);
                } else {
                    try {
                        countryNames = safeParseArray(rawCountryNames);
                    } catch {
                        res.status(400).json({ success: false, error: 'Invalid countryNames format' });
                    }
                }

                // ---- 3. Excel Country Validation ----
                const expectedCountries = countryNames.length ? countryNames : marketNames;
                if (expectedCountries.length && countryMultiSelect !== 'Subclusters' && validatedFilePath && fileName) {
                    const check = await validateCountriesInExcel(
                        resolveSafePath(validatedFilePath, fileName),
                        expectedCountries
                    );
                    if (!check.success) {
                        res.status(400).json({
                            success: false,
                            error: `Missing countries in Excel: ${check.missingCountries?.join(', ') || 'unknown'}`
                        });
                        return;
                    }
                }

                // ---- 4. Socket Setup ----
                const socketEvent = `upload-progress:${fileName}`;
                const emit = (msg: any) => io.emit(socketEvent, msg);
                emit({ step: 'upload_complete', message: 'File uploaded, processing started...' });

                const scriptKey = `${dataType}_${fieldName}`;

                let script = '';
                if (SCRIPT_MAP[scriptKey]) {
                    script = SCRIPT_MAP[scriptKey];
                }

                // ---- 6. Script Execution ----
                let result: PythonScriptResult | undefined;
                if (script.endsWith('.py') && validatedFilePath) {
                    result = await handlePythonScript(script, validatedFilePath, dataType, fieldName, selectedPriceTier, exchangeRate);
                } else if (script && validatedFilePath) {
                    try {
                        result = await runRScript(script, [validatedFilePath], io);
                    } catch (err) {
                        res.status(500).json({ success: false, error: (err as Error).message });
                    }
                }

                await saveForecastProgress(db, req, {
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
            } catch (err) {
                if (process.env.NODE_ENV === 'production') {
                    res.status(500).json({ success: false, error: 'An error occurred, please contact admin' });
                } else {
                    res.status(500).json({ success: false, error: (err as any).error });
                }
            }
        }
    );

    // ---- Helper for Python script handling ----
    async function handlePythonScript(
        script: string,
        validatedFilePath: string,
        dataType: string | undefined,
        fieldName: string | undefined,
        selectedPriceTier: string | undefined,
        exchangeRate: string | undefined
    ): Promise<PythonScriptResult> {
        let tierColumns: any = null;
        let priceTierRenameColumns: any = null;

        try {
            if (script === 'Python1.py' && dataType) {
                const tierPath = path.join(validatedFilePath, FILES.PRICE_TIER_COLUMNS);
                if (fs.existsSync(tierPath)) fs.unlinkSync(tierPath);
                await runPythonScript(script, [validatedFilePath, dataType]);
                if (!fs.existsSync(tierPath)) {
                    throw new Error('Processing failed, file not generated');
                }
                tierColumns = await parsePriceTierCsv(tierPath);
            }

            if (fieldName === ' ategoryRSVFile' && dataType && selectedPriceTier && exchangeRate) {
                await runPythonScript(script, [validatedFilePath, dataType, selectedPriceTier, exchangeRate]);
            }

            if (fieldName === 'CCFbackdataFile' && dataType && selectedPriceTier) {
                const checkPath = path.join(validatedFilePath, FILES.PRICE_TIER_COUNT);
                const renamePath = path.join(validatedFilePath, FILES.PRICE_TIER_RENAME);
                [checkPath, renamePath].forEach(file => fs.existsSync(file) && fs.unlinkSync(file));

                await runPythonScript(script, [validatedFilePath, dataType, selectedPriceTier]);

                if (fs.existsSync(renamePath)) {
                    priceTierRenameColumns = await parseRenamePriceTierFilledCsv(renamePath);
                } else {
                    throw new Error('Processing failed, file not generated');
                }
            }

            return { tierColumns, priceTierRenameColumns };
        } catch (err) {
            log.error('Python error:', (err as Error).message);
            throw err;
        }
    }

    return router;
};
