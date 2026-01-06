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
const csv_parser_1 = __importDefault(require("csv-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const marketController_1 = require("../controllers/marketController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const inputValidation_1 = require("../middlewares/inputValidation");
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('market');
const downloadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { success: false, error: 'Too many download requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
const router = express_1.default.Router();
function formatInMillions(value) {
    if (value === null || value === undefined || value === '') {
        return value;
    }
    const num = parseFloat(value.toString());
    if (isNaN(num)) {
        return value;
    }
    return (num / 1000000).toFixed(2) + 'M';
}
router.get('/', authMiddleware_1.ensureAuthenticated, async (req, res) => {
    await (0, marketController_1.getAllMarkets)(req, res);
});
router.get('/countries', authMiddleware_1.ensureAuthenticated, [
    (0, express_validator_1.query)('marketName')
        .exists().withMessage('marketName query parameter is required')
        .bail()
        .custom((value, { req }) => {
        const names = Array.isArray(req.query.marketName) ? req.query.marketName : [req.query.marketName];
        if (names.some((name) => typeof name !== 'string' || name.trim() === '')) {
            throw new Error('All marketName values must be non-empty strings');
        }
        return true;
    })
], (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
    }
    (0, marketController_1.getAllCountriesByCluster)(req, res);
});
router.get('/regions', authMiddleware_1.ensureAuthenticated, marketController_1.getAllRegions);
router.get('/above-markets', authMiddleware_1.ensureAuthenticated, marketController_1.getAboveMarketsByType);
const relaxCorsForIframes = (_req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
};
router.get('/above-market-reports', authMiddleware_1.ensureAuthenticated, relaxCorsForIframes, marketController_1.renderFilterPage);
router.get('/final-category-result', authMiddleware_1.ensureAuthenticated, (0, inputValidation_1.validateRequest)(inputValidation_1.finalCategoryResultSchema, 'query'), async (req, res) => {
    try {
        const { marketType, region, markets, category, useEnsembleResults } = req.query;
        if (!marketType || !region || !markets) {
            res.status(400).json({ success: false, message: 'Missing parameters' });
            return;
        }
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const marketName = marketType.toUpperCase().includes('MGF') ? 'MGF Market' : 'FP&A Market';
        const defaultFilePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Category Result-Default.csv');
        const ensembleFilePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Results.csv');
        let filePath;
        let source;
        if (useEnsembleResults === 'true' && fs_1.default.existsSync(ensembleFilePath)) {
            filePath = ensembleFilePath;
            source = 'Final Results.csv';
            log.info('Using Final Results.csv (ensemble confirmed):', ensembleFilePath);
        }
        else {
            filePath = defaultFilePath;
            source = 'Final Category Result-Default.csv';
            log.info('Using default file (before ensemble confirmation):', defaultFilePath);
        }
        const resolvedFilePath = path_1.default.resolve(filePath);
        const allowedBaseDir = path_1.default.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');
        if (!resolvedFilePath.startsWith(allowedBaseDir)) {
            log.error('Path traversal attempt detected', {
                filePath: resolvedFilePath,
                allowedBaseDir: allowedBaseDir
            });
            res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
            return;
        }
        log.debug('Resolved file path:', resolvedFilePath);
        log.debug('File exists?', fs_1.default.existsSync(resolvedFilePath));
        log.debug('marketType,region, markets', marketType, region, markets);
        if (!fs_1.default.existsSync(resolvedFilePath)) {
            log.debug('comes here no file found', resolvedFilePath);
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }
        fs_1.default.createReadStream(resolvedFilePath)
            .on('error', (err) => log.error('Stream error:', err))
            .on('open', () => log.info('Stream opened successfully'))
            .pipe((0, csv_parser_1.default)({ bom: true }))
            .on('headers', (headers) => log.debug('CSV headers:', headers))
            .on('data', (row) => log.info('Row:', row))
            .on('end', () => log.info('Finished reading CSV file'));
        const selectedMarkets = markets.split(',').map((m) => m.trim());
        const filteredRows = [];
        fs_1.default.createReadStream(resolvedFilePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            const regionCsv = row['Region']?.trim().toLowerCase();
            const marketCsv = row[marketName]?.trim().toLowerCase();
            const matchesRegion = regionCsv === region.trim().toLowerCase();
            const matchesMarket = selectedMarkets
                .map((m) => m.trim().toLowerCase())
                .includes(marketCsv);
            let matchesCategory = true;
            if (category) {
                const categoryCsv = row['Category']?.trim() || '';
                matchesCategory = categoryCsv === category.trim();
            }
            if (matchesRegion && matchesMarket && matchesCategory) {
                if (row['Current Size']) {
                    row['Current Size'] = formatInMillions(row['Current Size']);
                }
                if (row['Future Size']) {
                    row['Future Size'] = formatInMillions(row['Future Size']);
                }
                if (row['Category Current Size']) {
                    row['Category Current Size'] = formatInMillions(row['Category Current Size']);
                }
                if (row['Incremental RSV Growth']) {
                    row['Incremental RSV Growth'] = formatInMillions(row['Incremental RSV Growth']);
                }
                filteredRows.push(row);
            }
        })
            .on('end', () => {
            log.debug('filteredRows count:', filteredRows.length);
            res.json({
                success: true,
                data: filteredRows,
                source: source
            });
        })
            .on('error', (err) => {
            log.error('Error reading CSV:', err);
            res.status(500).json({ success: false, message: 'Error reading CSV' });
        });
    }
    catch (err) {
        log.error('Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/ensemble-category-result', authMiddleware_1.ensureAuthenticated, (0, inputValidation_1.validateRequest)(inputValidation_1.finalCategoryResultSchema, 'query'), async (req, res) => {
    try {
        const { marketType, region, markets, ensembleWeight, category } = req.query;
        if (!marketType || !region || !markets || !ensembleWeight) {
            res.status(400).json({ success: false, message: 'Missing required parameters' });
            return;
        }
        const validWeights = ['100-0', '75-25', '50-50'];
        if (!validWeights.includes(ensembleWeight)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ensemble weight. Must be one of: 100-0, 75-25, 50-50'
            });
            return;
        }
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const marketName = marketType.toUpperCase().includes('MGF') ? 'MGF Market' : 'FP&A Market';
        const filePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, `Final Category Result-${ensembleWeight}.csv`);
        const resolvedFilePath = path_1.default.resolve(filePath);
        const allowedBaseDir = path_1.default.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');
        if (!resolvedFilePath.startsWith(allowedBaseDir)) {
            log.error('Path traversal attempt detected', {
                filePath: resolvedFilePath,
                allowedBaseDir: allowedBaseDir
            });
            res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
            return;
        }
        log.debug('Ensemble file path:', resolvedFilePath);
        log.debug('File exists?', fs_1.default.existsSync(resolvedFilePath));
        if (!fs_1.default.existsSync(resolvedFilePath)) {
            log.debug('Ensemble file not found:', resolvedFilePath);
            res.status(404).json({
                success: false,
                message: `Ensemble data file not found for weight: ${ensembleWeight}`
            });
            return;
        }
        const selectedMarkets = markets.split(',').map((m) => m.trim());
        const filteredRows = [];
        fs_1.default.createReadStream(resolvedFilePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            const regionCsv = row['Region']?.trim().toLowerCase();
            const marketCsv = row[marketName]?.trim().toLowerCase();
            const matchesRegion = regionCsv === region.trim().toLowerCase();
            const matchesMarket = selectedMarkets
                .map((m) => m.trim().toLowerCase())
                .includes(marketCsv);
            let matchesCategory = true;
            if (category) {
                const categoryCsv = row['Category']?.trim() || '';
                matchesCategory = categoryCsv === category.trim();
            }
            if (matchesRegion && matchesMarket && matchesCategory) {
                filteredRows.push(row);
            }
        })
            .on('end', () => {
            log.debug('Ensemble filteredRows count:', filteredRows.length);
            res.json({ success: true, data: filteredRows, ensembleWeight });
        })
            .on('error', (err) => {
            log.error('Error reading ensemble CSV:', err);
            res.status(500).json({ success: false, message: 'Error reading ensemble CSV file' });
        });
    }
    catch (err) {
        log.error('Error in ensemble-category-result:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.post('/execute-ensemble-script', authMiddleware_1.ensureAuthenticated, async (req, res) => {
    try {
        const { marketType, ensembleSelections } = req.body;
        if (!marketType || !ensembleSelections || Object.keys(ensembleSelections).length === 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid parameters. marketType and ensembleSelections are required'
            });
            return;
        }
        const validWeights = ['100-0', '75-25', '50-50', 'Default'];
        for (const [market, weight] of Object.entries(ensembleSelections)) {
            if (!validWeights.includes(weight)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid ensemble weight "${weight}" for market "${market}"`
                });
                return;
            }
        }
        log.info('Executing R script with ensemble selections:', ensembleSelections);
        const AboveMarketBasePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles');
        const AboveMarketStaticFilePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'aboveMarket-StaticFiles');
        const mkt = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const combinationString = Object.entries(ensembleSelections)
            .map(([market, weight]) => `${market}:${weight}`)
            .join(',');
        const args4 = JSON.stringify([combinationString]);
        const { runRScript } = await Promise.resolve().then(() => __importStar(require('../services/rScriptService')));
        const scriptArgs = [
            AboveMarketBasePath,
            AboveMarketStaticFilePath,
            mkt,
            args4
        ];
        log.debug('R script arguments:', scriptArgs);
        try {
            const resultPath = path_1.default.join(AboveMarketBasePath, 'Result');
            const resultMktPath = path_1.default.join(resultPath, mkt);
            if (fs_1.default.existsSync(resultPath)) {
                fs_1.default.chmodSync(resultPath, 0o777);
                log.debug('Set permissions on Result folder:', resultPath);
            }
            if (fs_1.default.existsSync(resultMktPath)) {
                fs_1.default.chmodSync(resultMktPath, 0o777);
                log.debug('Set permissions on market folder:', resultMktPath);
            }
        }
        catch (permError) {
            log.warn('Failed to set permissions on Result folder:', permError.message);
        }
        const result = await runRScript('AboveMarket/Default Alternate Results Stitch.R', scriptArgs, req.app.get('io'));
        if (result.success) {
            log.info('Ensemble R script executed successfully');
            try {
                const { runPythonScript } = await Promise.resolve().then(() => __importStar(require('../services/pythonScriptService')));
                const AboveMarketInputFilePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles');
                log.info('Executing Python bubble chart script...');
                log.debug('Input folder path:', AboveMarketInputFilePath);
                const pythonResult = await runPythonScript('AboveMarket/bubble_chart_v6.py', [AboveMarketInputFilePath]);
                log.info('Python bubble chart script executed successfully');
                log.debug('Python output:', pythonResult.stdout);
                res.json({
                    success: true,
                    message: 'Ensemble weights applied successfully and bubble charts generated',
                    output: {
                        rScript: result.output,
                        pythonScript: pythonResult.stdout
                    }
                });
                return;
            }
            catch (pythonError) {
                log.error('Python bubble chart script execution failed:', pythonError);
                res.status(207).json({
                    success: true,
                    message: 'Ensemble weights applied successfully, but bubble chart generation failed',
                    output: result.output,
                    warning: 'Bubble chart generation failed: ' + (pythonError.error || pythonError.message)
                });
                return;
            }
        }
        else {
            log.error('Ensemble R script execution failed:', result.error);
            res.status(500).json({
                success: false,
                message: 'R script execution failed',
                error: result.error
            });
            return;
        }
    }
    catch (err) {
        log.error('Error in execute-ensemble-script:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while executing R script',
            error: err.message
        });
    }
});
router.post('/trigger-scheduled-forecast', authMiddleware_1.ensureAuthenticated, async (req, res) => {
    try {
        log.info('Manual trigger of scheduled "Create Forecast":', { user: req.user?.email });
        const { executeAboveMarketForecast } = await Promise.resolve().then(() => __importStar(require('../schedulers/aboveMarketScheduler')));
        executeAboveMarketForecast()
            .then((result) => {
            if (result.success) {
                log.info('Scheduled forecast completed successfully:', result);
            }
            else {
                log.error('Scheduled forecast failed:', result.error);
            }
        })
            .catch((error) => {
            log.error('Scheduled forecast error:', error);
        });
        res.json({
            success: true,
            message: 'Above Market "Create Forecast" started in background. Check logs for progress.',
            info: 'This runs the complete forecast creation process (all 5 steps). It may take several minutes to hours depending on data size. Use the web interface for ensemble weight updates.'
        });
    }
    catch (err) {
        log.error('Error triggering scheduled forecast:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger scheduled forecast',
            error: err.message
        });
    }
});
router.get('/top-incremental-growth', authMiddleware_1.ensureAuthenticated, (0, inputValidation_1.validateRequest)(inputValidation_1.marketTypeSchema, 'query'), async (req, res) => {
    const { marketType } = req.query;
    const results = [];
    log.debug('marketType', marketType);
    const folderName = marketType && marketType.toUpperCase().includes('mga') ? 'MGA' : 'FP&A';
    const filePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Top 10 Incremental Growth.csv');
    const resolvedFilePath = path_1.default.resolve(filePath);
    const allowedBaseDir = path_1.default.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');
    if (!resolvedFilePath.startsWith(allowedBaseDir)) {
        log.error('Path traversal attempt detected', {
            filePath: resolvedFilePath,
            allowedBaseDir: allowedBaseDir
        });
        res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
        return;
    }
    fs_1.default.createReadStream(resolvedFilePath)
        .pipe((0, csv_parser_1.default)())
        .on('data', (row) => {
        row['Incremental Growth'] = parseFloat(row['Incremental Growth']);
        results.push(row);
    })
        .on('end', () => {
        const top10 = results
            .sort((a, b) => b['Incremental Growth'] - a['Incremental Growth'])
            .slice(0, 10);
        const chartData = top10.map((r) => ({
            label: `${r.Motivation} - ${r['Price Tier']}`,
            value: r['Incremental Growth'],
            motivation: r.Motivation,
        }));
        res.json({ success: true, data: chartData });
    })
        .on('error', (err) => {
        log.error('Error reading CSV:', err);
        res.status(500).json({ success: false, message: 'Error reading data.csv' });
    });
});
router.get('/future-valuepools', authMiddleware_1.ensureAuthenticated, (0, inputValidation_1.validateRequest)(inputValidation_1.finalCategoryResultSchema, 'query'), async (req, res) => {
    const { region, markets, marketType, valuepool, priceTier } = req.query;
    if (!marketType || !region || !markets) {
        res.status(400).json({ success: false, message: 'Region and markets are required' });
        return;
    }
    const results = [];
    const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
    const filePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Biggest Future Valuepools.csv');
    const resolvedFilePath = path_1.default.resolve(filePath);
    const allowedBaseDir = path_1.default.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');
    if (!resolvedFilePath.startsWith(allowedBaseDir)) {
        log.error('Path traversal attempt detected', {
            filePath: resolvedFilePath,
            allowedBaseDir: allowedBaseDir
        });
        res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
        return;
    }
    log.debug('Resolved file path:', resolvedFilePath);
    log.debug('File exists?', fs_1.default.existsSync(resolvedFilePath));
    if (!fs_1.default.existsSync(resolvedFilePath)) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
    }
    fs_1.default.createReadStream(resolvedFilePath)
        .pipe((0, csv_parser_1.default)())
        .on('data', (row) => {
        row['Future Size'] = parseFloat(row['Future Size']);
        let matchesValuepool = true;
        if (valuepool) {
            const rowMotivation = row.Motivation?.trim();
            matchesValuepool = rowMotivation === valuepool.trim();
        }
        let matchesPriceTier = true;
        if (priceTier) {
            const rowPriceTier = row['Price Tier']?.trim();
            matchesPriceTier = rowPriceTier === priceTier.trim();
        }
        if (matchesValuepool && matchesPriceTier) {
            results.push(row);
        }
    })
        .on('end', () => {
        if (!results.length) {
            log.warn('No matching records found for', valuepool || 'all valuepools', priceTier || 'all price tiers');
            res.json({ success: false, message: 'No data found for selected filters' });
            return;
        }
        const top10 = results
            .sort((a, b) => b['Future Size'] - a['Future Size'])
            .slice(0, 10);
        const chartData = top10.map((r) => ({
            label: r.Market,
            value: r['Future Size'],
            motivation: r.Motivation,
            market: r.Market,
            priceTier: r['Price Tier'],
        }));
        res.json({ success: true, data: chartData });
    })
        .on('error', (err) => {
        log.error('Error reading CSV:', err);
        res.status(500).json({ success: false, message: 'Error reading file' });
    });
});
router.get('/greatest-incrementality-valuepool', authMiddleware_1.ensureAuthenticated, async (req, res) => {
    const { region, markets, marketType, valuepool, priceTier } = req.query;
    if (!marketType || !region || !markets) {
        res.status(400).json({ success: false, message: 'Region and markets are required' });
        return;
    }
    const results = [];
    const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
    const filePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Greatest Incrementality Valuepool.csv');
    log.debug('Resolved file path:', filePath);
    log.debug('File exists?', fs_1.default.existsSync(filePath));
    if (!fs_1.default.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
    }
    fs_1.default.createReadStream(filePath)
        .pipe((0, csv_parser_1.default)())
        .on('data', (row) => {
        row['Incremental Growth'] = parseFloat(row['Incremental Growth']);
        let matchesValuepool = true;
        if (valuepool) {
            const rowOccasion = row.Occasion?.trim();
            matchesValuepool = rowOccasion === valuepool.trim();
        }
        let matchesPriceTier = true;
        if (priceTier) {
            const rowPriceTier = row['Price Tier']?.trim();
            matchesPriceTier = rowPriceTier === priceTier.trim();
        }
        if (matchesValuepool && matchesPriceTier) {
            results.push(row);
        }
    })
        .on('end', () => {
        if (!results.length) {
            log.warn('No matching records found for', valuepool || 'all valuepools', priceTier || 'all price tiers');
            res.json({ success: false, message: 'No data found for selected filters' });
            return;
        }
        const top10 = results
            .sort((a, b) => b['Incremental Growth'] - a['Incremental Growth'])
            .slice(0, 10);
        const chartData = top10.map((r) => ({
            label: r.Market,
            value: r['Incremental Growth'],
            occasion: r.Occasion,
            market: r.Market,
            priceTier: r['Price Tier'],
        }));
        res.json({ success: true, data: chartData });
    })
        .on('error', (err) => {
        log.error('Error reading CSV:', err);
        res.status(500).json({ success: false, message: 'Error reading file' });
    });
});
router.get('/mekko-chart', authMiddleware_1.ensureAuthenticated, async (req, res) => {
    try {
        const { marketType, chartType } = req.query;
        if (!marketType || !chartType) {
            res.status(400).json({ success: false, message: 'marketType and chartType are required' });
            return;
        }
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        let fileName;
        if (chartType === 'current') {
            fileName = 'Current Value Pool.html';
        }
        else if (chartType === 'forecasted') {
            fileName = 'Forecasted Value Pool.html';
        }
        else {
            res.status(400).json({ success: false, message: 'Invalid chartType. Use "current" or "forecasted"' });
            return;
        }
        const filePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, fileName);
        log.debug('Mekko chart file path:', filePath);
        log.debug('File exists?', fs_1.default.existsSync(filePath));
        const VALID_MARKET_TYPES = ['MGF', 'FP&A'];
        if (!VALID_MARKET_TYPES.includes(folderName)) {
            log.error('Invalid market type resolved:', folderName, 'from', marketType);
            res.status(400).json({ success: false, message: 'Invalid market type' });
            return;
        }
        const VALID_FILE_NAMES = ['Current Value Pool.html', 'Forecasted Value Pool.html'];
        if (!VALID_FILE_NAMES.includes(fileName)) {
            res.status(400).json({ success: false, message: 'Invalid chart type' });
            return;
        }
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'Mekko chart file not found' });
            return;
        }
        res.removeHeader("Cross-Origin-Embedder-Policy");
        res.removeHeader("Cross-Origin-Opener-Policy");
        res.removeHeader("Cross-Origin-Resource-Policy");
        res.removeHeader("X-Frame-Options");
        res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Security-Policy", "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "frame-src 'self'; " +
            "frame-ancestors 'self';");
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        fs_1.default.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                log.error('Error reading Mekko chart file:', err);
                res.status(500).json({ success: false, message: 'Error reading Mekko chart file' });
                return;
            }
            res.type('html').send(data);
        });
    }
    catch (err) {
        log.error('Error serving Mekko chart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/bubble-chart', authMiddleware_1.ensureAuthenticated, async (req, res) => {
    try {
        const { marketType } = req.query;
        if (!marketType) {
            res.status(400).json({ success: false, message: 'marketType is required' });
            return;
        }
        const VALID_MARKET_TYPES = ['MGF', 'FP&A', 'mga', 'fp&a'];
        const normalizedMarketType = marketType.trim();
        if (!VALID_MARKET_TYPES.some((valid) => normalizedMarketType.toUpperCase().includes(valid.toUpperCase()))) {
            log.error('Invalid market type attempt:', { marketType, ip: req.ip, user: req.session?.user?.id });
            res.status(400).json({ success: false, message: 'Invalid market type' });
            return;
        }
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const fileName = 'bubble_chart.html';
        const filePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, fileName);
        const resolvedFilePath = path_1.default.resolve(filePath);
        const allowedBaseDir = path_1.default.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');
        if (!resolvedFilePath.startsWith(allowedBaseDir)) {
            log.error('Path traversal attempt detected', {
                filePath: resolvedFilePath,
                allowedBaseDir: allowedBaseDir,
                ip: req.ip,
                user: req.session?.user?.id
            });
            res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
            return;
        }
        if (!resolvedFilePath.endsWith('bubble_chart.html')) {
            log.error('Invalid file access attempt:', { resolvedFilePath, ip: req.ip });
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }
        if (!fs_1.default.existsSync(resolvedFilePath)) {
            res.status(404).json({ success: false, message: 'Bubble chart file not found' });
            return;
        }
        res.removeHeader("Content-Security-Policy");
        res.removeHeader("Cross-Origin-Embedder-Policy");
        res.removeHeader("Cross-Origin-Opener-Policy");
        res.removeHeader("Cross-Origin-Resource-Policy");
        res.removeHeader("X-Frame-Options");
        res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Content-Security-Policy", "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plot.ly https://cdn.jsdelivr.net; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.datatables.net; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "frame-src 'self'; " +
            "frame-ancestors 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self';");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        fs_1.default.readFile(resolvedFilePath, 'utf8', (err, data) => {
            if (err) {
                log.error('Error reading Bubble chart file:', err);
                res.status(500).json({ success: false, message: 'Error reading Bubble chart file' });
                return;
            }
            res.type('html').send(data);
        });
    }
    catch (err) {
        log.error('Error serving Bubble chart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/download-excel', authMiddleware_1.ensureAuthenticated, downloadLimiter, async (req, res) => {
    try {
        const { marketType, region, markets, category } = req.query;
        if (!marketType || !region || !markets) {
            res.status(400).json({ success: false, message: 'Missing required parameters: marketType, region, markets' });
            return;
        }
        const ExcelJS = await Promise.resolve().then(() => __importStar(require('exceljs')));
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const marketName = marketType.toUpperCase().includes('MGF') ? 'MGF Market' : 'FP&A Market';
        const ensembleFilePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Results.csv');
        const defaultFilePath = path_1.default.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Category Result-Default.csv');
        let filePath = ensembleFilePath;
        if (!fs_1.default.existsSync(ensembleFilePath)) {
            log.info('Download: Final Results.csv not found, using default file:', defaultFilePath);
            filePath = defaultFilePath;
        }
        else {
            log.info('Download: Using Final Results.csv (ensemble weights applied):', ensembleFilePath);
        }
        log.debug('Excel download - Resolved file path:', filePath);
        log.debug('File exists?', fs_1.default.existsSync(filePath));
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'Data file not found' });
            return;
        }
        const selectedMarkets = markets.split(',').map((m) => m.trim());
        const filteredRows = [];
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            const regionCsv = row['Region']?.trim().toLowerCase();
            const marketCsv = row[marketName]?.trim().toLowerCase();
            const matchesRegion = regionCsv === region.trim().toLowerCase();
            const matchesMarket = selectedMarkets
                .map((m) => m.trim().toLowerCase())
                .includes(marketCsv);
            let matchesCategory = true;
            if (category) {
                const categoryCsv = row['Category']?.trim() || '';
                matchesCategory = categoryCsv === category.trim();
            }
            if (matchesRegion && matchesMarket && matchesCategory) {
                if (row['Current Size']) {
                    row['Current Size'] = formatInMillions(row['Current Size']);
                }
                if (row['Future Size']) {
                    row['Future Size'] = formatInMillions(row['Future Size']);
                }
                if (row['Category Current Size']) {
                    row['Category Current Size'] = formatInMillions(row['Category Current Size']);
                }
                if (row['Incremental RSV Growth']) {
                    row['Incremental RSV Growth'] = formatInMillions(row['Incremental RSV Growth']);
                }
                filteredRows.push(row);
            }
        })
            .on('end', async () => {
            if (filteredRows.length === 0) {
                res.status(404).json({ success: false, message: 'No data found for the selected filters' });
                return;
            }
            const workbook = new ExcelJS.default.Workbook();
            workbook.creator = 'Above Market Forecasting';
            workbook.created = new Date();
            const worksheet = workbook.addWorksheet('Filtered Data');
            const headers = Object.keys(filteredRows[0]);
            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            filteredRows.forEach((row) => {
                const values = headers.map((header) => row[header]);
                worksheet.addRow(values);
            });
            worksheet.columns.forEach((column, index) => {
                const header = headers[index];
                if (!header)
                    return;
                let maxLength = header.length;
                filteredRows.forEach((row) => {
                    const value = row[header];
                    if (value && value.toString().length > maxLength) {
                        maxLength = value.toString().length;
                    }
                });
                column.width = Math.min(maxLength + 2, 50);
            });
            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            const fileName = `Above_Market_Report_${marketType}_${region}_${Date.now()}.xlsx`;
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            await workbook.xlsx.write(res);
            res.end();
        })
            .on('error', (err) => {
            log.error('Error reading CSV for Excel download:', err);
            res.status(500).json({ success: false, message: 'Error reading data file' });
        });
    }
    catch (err) {
        log.error('Error generating Excel file:', err);
        res.status(500).json({ success: false, message: 'Server error while generating Excel' });
    }
});
module.exports = router;
//# sourceMappingURL=markets.js.map