// market routes
// forecasting-app/routes/markets.ts
import csv from 'csv-parser';
import path from 'path';
import fs from 'fs';
import express, { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { query, validationResult, ValidationChain } from 'express-validator';
import {
    getAllMarkets,
    getAllCountriesByCluster,
    getAllRegions,
    getAboveMarketsByType,
    renderFilterPage
} from '../controllers/marketController';
import { ensureAuthenticated } from '../middlewares/authMiddleware';
import { validateRequest, marketTypeSchema, finalCategoryResultSchema } from '../middlewares/inputValidation';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('market');

// Rate limiter for download endpoints
const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: { success: false, error: 'Too many download requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const router: Router = express.Router();

// Helper function to format numbers in millions
function formatInMillions(value: string | number | null | undefined): string | number | null | undefined {
    if (value === null || value === undefined || value === '') {
        return value;
    }
    const num = parseFloat(value.toString());
    if (isNaN(num)) {
        return value;
    }
    // Convert to millions and round to 2 decimal places
    return (num / 1000000).toFixed(2) + 'M';
}

// router.get('/', async (req, res) => {
//   try {
//     const markets = await getAllMarkets();
//     res.json({ success: true, markets });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

router.get('/', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    await getAllMarkets(req, res);
});

router.get('/countries', ensureAuthenticated, [
    query('marketName')
        .exists().withMessage('marketName query parameter is required')
        .bail()
        // @ts-ignore - express-validator .custom() type compatibility
        .custom((value: any, { req }: { req: Request }) => {
            const names = Array.isArray(req.query.marketName) ? req.query.marketName : [req.query.marketName];
            if (names.some((name: any) => typeof name !== 'string' || name.trim() === '')) {
                throw new Error('All marketName values must be non-empty strings');
            }
            return true;
        })
] as ValidationChain[], (req: Request, res: Response): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
    }

    getAllCountriesByCluster(req, res);
});

// Render page with regions + dropdowns
router.get('/regions', ensureAuthenticated, getAllRegions);

// Fetch above markets by type (AJAX)
router.get('/above-markets', ensureAuthenticated, getAboveMarketsByType);

// Middleware to relax CORS headers for iframe embedding
const relaxCorsForIframes = (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
};

router.get('/above-market-reports', ensureAuthenticated, relaxCorsForIframes, renderFilterPage);


router.get('/final-category-result', ensureAuthenticated, validateRequest(finalCategoryResultSchema, 'query') as any, async (req: Request, res: Response): Promise<void> => {
    try {
        const { marketType, region, markets, category, useEnsembleResults } = req.query as {
            marketType?: string;
            region?: string;
            markets?: string;
            category?: string;
            useEnsembleResults?: string;
        };

        if (!marketType || !region || !markets) {
            res.status(400).json({ success: false, message: 'Missing parameters' });
            return;
        }



        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';

        const marketName = marketType.toUpperCase().includes('MGF') ? 'MGF Market' : 'FP&A Market';

        // Determine which file to use based on ensemble confirmation
        const defaultFilePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Category Result-Default.csv');
        const ensembleFilePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Results.csv');

        let filePath: string;
        let source: string;

        // If useEnsembleResults=true AND Final Results.csv exists, use it
        // Otherwise, ALWAYS use default file
        if (useEnsembleResults === 'true' && fs.existsSync(ensembleFilePath)) {
            filePath = ensembleFilePath;
            source = 'Final Results.csv';
            log.info('Using Final Results.csv (ensemble confirmed):', ensembleFilePath);
        } else {
            filePath = defaultFilePath;
            source = 'Final Category Result-Default.csv';
            log.info('Using default file (before ensemble confirmation):', defaultFilePath);
        }

        // Enhanced path traversal protection with path.resolve()
        const resolvedFilePath = path.resolve(filePath);
        const allowedBaseDir = path.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');

        // Verify the resolved path is still within the allowed directory
        if (!resolvedFilePath.startsWith(allowedBaseDir)) {
            log.error('Path traversal attempt detected', {
                filePath: resolvedFilePath,
                allowedBaseDir: allowedBaseDir
            });
            res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
            return;
        }

        log.debug('Resolved file path:', resolvedFilePath);
        log.debug('File exists?', fs.existsSync(resolvedFilePath));

        log.debug('marketType,region, markets', marketType, region, markets);

        if (!fs.existsSync(resolvedFilePath)) {
            log.debug('comes here no file found', resolvedFilePath);
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }
        fs.createReadStream(resolvedFilePath)
            .on('error', (err: Error) => log.error('Stream error:', err))
            .on('open', () => log.info('Stream opened successfully'))
            // @ts-ignore - csv-parser type compatibility for bom option
            .pipe(csv({ bom: true }))
            .on('headers', (headers: string[]) => log.debug('CSV headers:', headers))
            .on('data', (row: any) => log.info('Row:', row))
            .on('end', () => log.info('Finished reading CSV file'));

        const selectedMarkets = markets.split(',').map((m: string) => m.trim());
        const filteredRows: any[] = [];



        fs.createReadStream(resolvedFilePath)
            .pipe(csv())
            .on('data', (row: any) => {
                const regionCsv = row['Region']?.trim().toLowerCase();
                const marketCsv = row[marketName]?.trim().toLowerCase();

                const matchesRegion = regionCsv === region.trim().toLowerCase();
                const matchesMarket = selectedMarkets
                    .map((m: string) => m.trim().toLowerCase())
                    .includes(marketCsv);

                // Add category filter
                let matchesCategory = true;
                if (category) {
                    const categoryCsv = row['Category']?.trim() || '';
                    matchesCategory = categoryCsv === category.trim();
                }

                if (matchesRegion && matchesMarket && matchesCategory) {
                    // Format monetary values in millions
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
            .on('error', (err: Error) => {
                log.error('Error reading CSV:', err);
                res.status(500).json({ success: false, message: 'Error reading CSV' });
            });


    } catch (err) {
        log.error('Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Fetch ensemble-specific category result data
router.get('/ensemble-category-result', ensureAuthenticated, validateRequest(finalCategoryResultSchema, 'query') as any, async (req: Request, res: Response): Promise<void> => {
    try {
        const { marketType, region, markets, ensembleWeight, category } = req.query as {
            marketType?: string;
            region?: string;
            markets?: string;
            ensembleWeight?: string;
            category?: string;
        };

        if (!marketType || !region || !markets || !ensembleWeight) {
            res.status(400).json({ success: false, message: 'Missing required parameters' });
            return;
        }

        // Validate ensemble weight
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
        const filePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, `Final Category Result-${ensembleWeight}.csv`);

        // Enhanced path traversal protection
        const resolvedFilePath = path.resolve(filePath);
        const allowedBaseDir = path.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');

        if (!resolvedFilePath.startsWith(allowedBaseDir)) {
            log.error('Path traversal attempt detected', {
                filePath: resolvedFilePath,
                allowedBaseDir: allowedBaseDir
            });
            res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
            return;
        }

        log.debug('Ensemble file path:', resolvedFilePath);
        log.debug('File exists?', fs.existsSync(resolvedFilePath));

        if (!fs.existsSync(resolvedFilePath)) {
            log.debug('Ensemble file not found:', resolvedFilePath);
            res.status(404).json({
                success: false,
                message: `Ensemble data file not found for weight: ${ensembleWeight}`
            });
            return;
        }

        const selectedMarkets = markets.split(',').map((m: string) => m.trim());
        const filteredRows: any[] = [];

        fs.createReadStream(resolvedFilePath)
            .pipe(csv())
            .on('data', (row: any) => {
                const regionCsv = row['Region']?.trim().toLowerCase();
                const marketCsv = row[marketName]?.trim().toLowerCase();

                const matchesRegion = regionCsv === region.trim().toLowerCase();
                const matchesMarket = selectedMarkets
                    .map((m: string) => m.trim().toLowerCase())
                    .includes(marketCsv);

                // Add category filter
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
            .on('error', (err: Error) => {
                log.error('Error reading ensemble CSV:', err);
                res.status(500).json({ success: false, message: 'Error reading ensemble CSV file' });
            });

    } catch (err) {
        log.error('Error in ensemble-category-result:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Execute R script with ensemble parameters
router.post('/execute-ensemble-script', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const { marketType, ensembleSelections } = req.body as {
            marketType?: string;
            ensembleSelections?: Record<string, string>;
        };

        if (!marketType || !ensembleSelections || Object.keys(ensembleSelections).length === 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid parameters. marketType and ensembleSelections are required'
            });
            return;
        }

        // Validate ensemble weights
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

        // Prepare arguments for Default Alternate Results Stitch.R
        // args[1]: path_name - base path to AboveMarketFiles (parent of Result directory)
        const AboveMarketBasePath = path.join(__dirname, '..', 'AboveMarketFiles');

        // args[2]: user_input_path - full path to "Static Input Files" directory
        const AboveMarketStaticFilePath = path.join(__dirname, '..', 'AboveMarketFiles', 'aboveMarket-StaticFiles');

        // args[3]: mkt - market type (FP&A or MGF)
        const mkt = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';

        // args[4]: JSON array containing a single string with comma-separated "Market:Weight" pairs
        const combinationString = Object.entries(ensembleSelections)
            .map(([market, weight]) => `${market}:${weight}`)
            .join(',');

        // Format as JSON array string to match the expected format
        const args4 = JSON.stringify([combinationString]);

        // Use rScriptService to execute the R script
        const { runRScript } = await import('../services/rScriptService');

        const scriptArgs = [
            AboveMarketBasePath,
            AboveMarketStaticFilePath,
            mkt,
            args4
        ];

        log.debug('R script arguments:', scriptArgs);

        // Set permissions on Result folder before running the R script
        try {
            const resultPath = path.join(AboveMarketBasePath, 'Result');
            const resultMktPath = path.join(resultPath, mkt);

            // Ensure Result directory exists and has write permissions
            if (fs.existsSync(resultPath)) {
                fs.chmodSync(resultPath, 0o777);
                log.debug('Set permissions on Result folder:', resultPath);
            }

            // Ensure market-specific directory has write permissions
            if (fs.existsSync(resultMktPath)) {
                fs.chmodSync(resultMktPath, 0o777);
                log.debug('Set permissions on market folder:', resultMktPath);
            }
        } catch (permError: any) {
            log.warn('Failed to set permissions on Result folder:', permError.message);
            // Continue anyway - the script might still work
        }

        const result = await runRScript(
            'AboveMarket/Default Alternate Results Stitch.R',
            scriptArgs,
            (req as any).app.get('io') // Pass socket.io instance if available
        );

        if (result.success) {
            log.info('Ensemble R script executed successfully');

            // After R script succeeds, call the Python bubble chart script
            try {
                const { runPythonScript } = await import('../services/pythonScriptService');
                const AboveMarketInputFilePath = path.join(__dirname, '..', 'AboveMarketFiles');

                log.info('Executing Python bubble chart script...');
                log.debug('Input folder path:', AboveMarketInputFilePath);

                const pythonResult = await runPythonScript(
                    'AboveMarket/bubble_chart_v6.py',
                    [AboveMarketInputFilePath]
                );

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

            } catch (pythonError: any) {
                log.error('Python bubble chart script execution failed:', pythonError);
                // R script succeeded but Python failed - still return partial success
                res.status(207).json({
                    success: true,
                    message: 'Ensemble weights applied successfully, but bubble chart generation failed',
                    output: result.output,
                    warning: 'Bubble chart generation failed: ' + (pythonError.error || pythonError.message)
                });
                return;
            }
        } else {
            log.error('Ensemble R script execution failed:', result.error);
            res.status(500).json({
                success: false,
                message: 'R script execution failed',
                error: result.error
            });
            return;
        }

    } catch (err: any) {
        log.error('Error in execute-ensemble-script:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while executing R script',
            error: err.message
        });
    }
});

// Optional: Trigger scheduled "Create Forecast" manually via API
router.post('/trigger-scheduled-forecast', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        log.info('Manual trigger of scheduled "Create Forecast":', { user: (req as any).user?.email });

        // Import and execute scheduler function
        const { executeAboveMarketForecast } = await import('../schedulers/aboveMarketScheduler');

        // Execute in background (don't wait for completion)
        executeAboveMarketForecast()
            .then((result: any) => {
                if (result.success) {
                    log.info('Scheduled forecast completed successfully:', result);
                } else {
                    log.error('Scheduled forecast failed:', result.error);
                }
            })
            .catch((error: Error) => {
                log.error('Scheduled forecast error:', error);
            });

        // Return immediately to user
        res.json({
            success: true,
            message: 'Above Market "Create Forecast" started in background. Check logs for progress.',
            info: 'This runs the complete forecast creation process (all 5 steps). It may take several minutes to hours depending on data size. Use the web interface for ensemble weight updates.'
        });

    } catch (err: any) {
        log.error('Error triggering scheduled forecast:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger scheduled forecast',
            error: err.message
        });
    }
});

router.get('/top-incremental-growth', ensureAuthenticated, validateRequest(marketTypeSchema, 'query') as any, async (req: Request, res: Response): Promise<void> => {
    const { marketType } = req.query as { marketType?: string };
    const results: any[] = [];

    log.debug('marketType', marketType);

    const folderName = marketType && marketType.toUpperCase().includes('mga') ? 'MGA' : 'FP&A';

    const filePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Top 10 Incremental Growth.csv');

    // Enhanced path traversal protection with path.resolve()
    const resolvedFilePath = path.resolve(filePath);
    const allowedBaseDir = path.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');

    // Verify the resolved path is still within the allowed directory
    if (!resolvedFilePath.startsWith(allowedBaseDir)) {
        log.error('Path traversal attempt detected', {
            filePath: resolvedFilePath,
            allowedBaseDir: allowedBaseDir
        });
        res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
        return;
    }

    fs.createReadStream(resolvedFilePath)
        .pipe(csv())
        .on('data', (row: any) => {
            row['Incremental Growth'] = parseFloat(row['Incremental Growth']);
            results.push(row);
        })
        .on('end', () => {
            // Sort descending
            const top10 = results
                .sort((a, b) => b['Incremental Growth'] - a['Incremental Growth'])
                .slice(0, 10);

            // Prepare for frontend
            const chartData = top10.map((r: any) => ({
                label: `${r.Motivation} - ${r['Price Tier']}`,
                value: r['Incremental Growth'],
                motivation: r.Motivation,
            }));

            res.json({ success: true, data: chartData });
        })
        .on('error', (err: Error) => {
            log.error('Error reading CSV:', err);
            res.status(500).json({ success: false, message: 'Error reading data.csv' });
        });
});

router.get('/future-valuepools', ensureAuthenticated, validateRequest(finalCategoryResultSchema, 'query') as any, async (req: Request, res: Response): Promise<void> => {
    const { region, markets, marketType, valuepool, priceTier } = req.query as {
        region?: string;
        markets?: string;
        marketType?: string;
        category?: string;
        valuepool?: string;
        priceTier?: string;
    };

    if (!marketType || !region || !markets) {
        res.status(400).json({ success: false, message: 'Region and markets are required' });
        return;
    }

    // const _selectedMarkets = markets.split(',').map((m: string) => m.trim());
    const results: any[] = [];

    const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
    const filePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Biggest Future Valuepools.csv');

    // Enhanced path traversal protection with path.resolve()
    const resolvedFilePath = path.resolve(filePath);
    const allowedBaseDir = path.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');

    // Verify the resolved path is still within the allowed directory
    if (!resolvedFilePath.startsWith(allowedBaseDir)) {
        log.error('Path traversal attempt detected', {
            filePath: resolvedFilePath,
            allowedBaseDir: allowedBaseDir
        });
        res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
        return;
    }

    log.debug('Resolved file path:', resolvedFilePath);
    log.debug('File exists?', fs.existsSync(resolvedFilePath));

    if (!fs.existsSync(resolvedFilePath)) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
    }

    fs.createReadStream(resolvedFilePath)
        .pipe(csv())
        .on('data', (row: any) => {
            // Convert to number safely
            row['Future Size'] = parseFloat(row['Future Size']);

            // Normalize and compare (case/space insensitive)
            // const _rowRegion = row.Region?.trim().toLowerCase();
            // const _regionParam = region ? region.trim().toLowerCase() : '';

            // Add category filter (currently not used in filtering logic)
            // let matchesCategory = true;
            // if (category) {
            //     const categoryCsv = row['Category']?.trim() || '';
            //     matchesCategory = categoryCsv === category.trim();
            // }

            // Add valuepool (Motivation) filter - REQUIRED for this endpoint
            let matchesValuepool = true;
            if (valuepool) {
                const rowMotivation = row.Motivation?.trim();
                matchesValuepool = rowMotivation === valuepool.trim();
            }

            // Add price tier filter - REQUIRED for this endpoint
            let matchesPriceTier = true;
            if (priceTier) {
                const rowPriceTier = row['Price Tier']?.trim();
                matchesPriceTier = rowPriceTier === priceTier.trim();
            }

            // Filter by region, category, valuepool, and price tier (NOT by selected markets)
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

            const chartData = top10.map((r: any) => ({
                label: r.Market,
                value: r['Future Size'],
                motivation: r.Motivation,
                market: r.Market,
                priceTier: r['Price Tier'],
            }));

            res.json({ success: true, data: chartData });
        })
        .on('error', (err: Error) => {
            log.error('Error reading CSV:', err);
            res.status(500).json({ success: false, message: 'Error reading file' });
        });
});


router.get('/greatest-incrementality-valuepool', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const { region, markets, marketType, valuepool, priceTier } = req.query as {
        region?: string;
        markets?: string;
        marketType?: string;
        category?: string;
        valuepool?: string;
        priceTier?: string;
    };


    if (!marketType || !region || !markets) {
        res.status(400).json({ success: false, message: 'Region and markets are required' });
        return;
    }

    // const _selectedMarkets = markets.split(',').map((m: string) => m.trim());
    const results: any[] = [];

    const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
    const filePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Greatest Incrementality Valuepool.csv');

    log.debug('Resolved file path:', filePath);
    log.debug('File exists?', fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'File not found' });
        return;
    }

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
            // Convert to number safely
            row['Incremental Growth'] = parseFloat(row['Incremental Growth']);

            // Normalize and compare (case/space insensitive)
            // const _rowRegion = row.Region?.trim().toLowerCase();
            // const _regionParam = region ? region.trim().toLowerCase() : '';

            // Add category filter (currently not used in filtering logic)
            // let matchesCategory = true;
            // if (category) {
            //     const categoryCsv = row['Category']?.trim() || '';
            //     matchesCategory = categoryCsv === category.trim();
            // }

            // Add valuepool (Occasion) filter - REQUIRED for this endpoint
            let matchesValuepool = true;
            if (valuepool) {
                const rowOccasion = row.Occasion?.trim();
                matchesValuepool = rowOccasion === valuepool.trim();
            }

            // Add price tier filter - REQUIRED for this endpoint
            let matchesPriceTier = true;
            if (priceTier) {
                const rowPriceTier = row['Price Tier']?.trim();
                matchesPriceTier = rowPriceTier === priceTier.trim();
            }

            // Filter by region, category, valuepool, and price tier (NOT by selected markets)
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

            const chartData = top10.map((r: any) => ({
                label: r.Market,
                value: r['Incremental Growth'],
                occasion: r.Occasion,
                market: r.Market,
                priceTier: r['Price Tier'],
            }));

            res.json({ success: true, data: chartData });
        })
        .on('error', (err: Error) => {
            log.error('Error reading CSV:', err);
            res.status(500).json({ success: false, message: 'Error reading file' });
        });
});

// Route to serve Mekko chart HTML files
router.get('/mekko-chart', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const { marketType, chartType } = req.query as {
            marketType?: string;
            chartType?: string;
        };

        if (!marketType || !chartType) {
            res.status(400).json({ success: false, message: 'marketType and chartType are required' });
            return;
        }

        // Determine folder based on market type (MGF or FP&A)
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';

        // Determine file name based on chart type
        let fileName: string;
        if (chartType === 'current') {
            fileName = 'Current Value Pool.html';
        } else if (chartType === 'forecasted') {
            fileName = 'Forecasted Value Pool.html';
        } else {
            res.status(400).json({ success: false, message: 'Invalid chartType. Use "current" or "forecasted"' });
            return;
        }

        const filePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, fileName);

        log.debug('Mekko chart file path:', filePath);
        log.debug('File exists?', fs.existsSync(filePath));


        // Validate the resolved folder name
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

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'Mekko chart file not found' });
            return;
        }

        // Remove restrictive headers
        res.removeHeader("Cross-Origin-Embedder-Policy");
        res.removeHeader("Cross-Origin-Opener-Policy");
        res.removeHeader("Cross-Origin-Resource-Policy");
        res.removeHeader("X-Frame-Options");

        // Override with relaxed values to allow iframe embedding
        res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

        // Read the HTML file and serve with permissive CSP for iframe content
        // Note: This is safe because the content is served from same origin and loaded in iframe
        res.setHeader("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "frame-src 'self'; " +
            "frame-ancestors 'self';"
        );
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.readFile(filePath, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                log.error('Error reading Mekko chart file:', err);
                res.status(500).json({ success: false, message: 'Error reading Mekko chart file' });
                return;
            }

            // Send the HTML content directly
            res.type('html').send(data);
        });

    } catch (err) {
        log.error('Error serving Mekko chart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


router.get('/bubble-chart', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const { marketType } = req.query as { marketType?: string };

        if (!marketType) {
            res.status(400).json({ success: false, message: 'marketType is required' });
            return;
        }

        // Enhanced validation: Strict whitelist validation for marketType
        const VALID_MARKET_TYPES = ['MGF', 'FP&A', 'mga', 'fp&a'];
        const normalizedMarketType = marketType.trim();

        if (!VALID_MARKET_TYPES.some((valid: string) => normalizedMarketType.toUpperCase().includes(valid.toUpperCase()))) {
            log.error('Invalid market type attempt:', { marketType, ip: req.ip, user: (req as any).session?.user?.id });
            res.status(400).json({ success: false, message: 'Invalid market type' });
            return;
        }

        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const fileName = 'bubble_chart.html';
        const filePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, fileName);

        // Enhanced path traversal protection with path.resolve()
        const resolvedFilePath = path.resolve(filePath);
        const allowedBaseDir = path.resolve(__dirname, '..', 'AboveMarketFiles', 'Result');

        // Verify the resolved path is still within the allowed directory
        if (!resolvedFilePath.startsWith(allowedBaseDir)) {
            log.error('Path traversal attempt detected', {
                filePath: resolvedFilePath,
                allowedBaseDir: allowedBaseDir,
                ip: req.ip,
                user: (req as any).session?.user?.id
            });
            res.status(403).json({ success: false, message: 'Access denied: Invalid file path' });
            return;
        }

        // Verify exact filename to prevent directory traversal
        if (!resolvedFilePath.endsWith('bubble_chart.html')) {
            log.error('Invalid file access attempt:', { resolvedFilePath, ip: req.ip });
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        if (!fs.existsSync(resolvedFilePath)) {
            res.status(404).json({ success: false, message: 'Bubble chart file not found' });
            return;
        }

        // Remove default headers
        res.removeHeader("Content-Security-Policy");
        res.removeHeader("Cross-Origin-Embedder-Policy");
        res.removeHeader("Cross-Origin-Opener-Policy");
        res.removeHeader("Cross-Origin-Resource-Policy");
        res.removeHeader("X-Frame-Options");

        // Override with relaxed values to allow iframe embedding
        res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

        // Relaxed CSP just for this route
        res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plot.ly https://cdn.jsdelivr.net; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.datatables.net; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "frame-src 'self'; " +
            "frame-ancestors 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self';"
        );
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Allow iframe embedding from same origin
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.readFile(resolvedFilePath, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                log.error('Error reading Bubble chart file:', err);
                res.status(500).json({ success: false, message: 'Error reading Bubble chart file' });
                return;
            }

            // Optional: Sanitize the HTML content to ensure no script injection
            // For now, we trust the file content as it's server-generated
            // In production, consider adding HTML sanitization here

            // Send the HTML content directly
            res.type('html').send(data);
        });
    } catch (err) {
        log.error('Error serving Bubble chart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Route to download Excel report for filtered above-market data
router.get('/download-excel', ensureAuthenticated, downloadLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const { marketType, region, markets, category } = req.query as {
            marketType?: string;
            region?: string;
            markets?: string;
            category?: string;
        };

        if (!marketType || !region || !markets) {
            res.status(400).json({ success: false, message: 'Missing required parameters: marketType, region, markets' });
            return;
        }

        const ExcelJS = await import('exceljs');
        const folderName = marketType.toUpperCase().includes('MGF') ? 'MGF' : 'FP&A';
        const marketName = marketType.toUpperCase().includes('MGF') ? 'MGF Market' : 'FP&A Market';

        // Check for "Final Results.csv" first (created after ensemble weight application)
        const ensembleFilePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Results.csv');
        const defaultFilePath = path.join(__dirname, '..', 'AboveMarketFiles', 'Result', folderName, 'Final Category Result-Default.csv');

        // Use ensemble file if it exists, otherwise use default
        let filePath = ensembleFilePath;
        // let _usingEnsembleFile = false;
        if (!fs.existsSync(ensembleFilePath)) {
            log.info('Download: Final Results.csv not found, using default file:', defaultFilePath);
            filePath = defaultFilePath;
        } else {
            log.info('Download: Using Final Results.csv (ensemble weights applied):', ensembleFilePath);
            // _usingEnsembleFile = true;
        }

        log.debug('Excel download - Resolved file path:', filePath);
        log.debug('File exists?', fs.existsSync(filePath));

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'Data file not found' });
            return;
        }

        const selectedMarkets = markets.split(',').map((m: string) => m.trim());
        const filteredRows: any[] = [];

        // Read and filter CSV data
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: any) => {
                const regionCsv = row['Region']?.trim().toLowerCase();
                const marketCsv = row[marketName]?.trim().toLowerCase();

                const matchesRegion = regionCsv === region.trim().toLowerCase();
                const matchesMarket = selectedMarkets
                    .map((m: string) => m.trim().toLowerCase())
                    .includes(marketCsv);

                // Add category filter
                let matchesCategory = true;
                if (category) {
                    const categoryCsv = row['Category']?.trim() || '';
                    matchesCategory = categoryCsv === category.trim();
                }

                if (matchesRegion && matchesMarket && matchesCategory) {
                    // Format monetary values in millions for Excel
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

                // Create Excel workbook
                const workbook = new ExcelJS.default.Workbook();
                workbook.creator = 'Above Market Forecasting';
                workbook.created = new Date();

                const worksheet = workbook.addWorksheet('Filtered Data');

                // Get headers from the first row
                const headers = Object.keys(filteredRows[0]);

                // Add header row with styling
                const headerRow = worksheet.addRow(headers);
                headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' }
                };
                headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

                // Add data rows
                filteredRows.forEach((row: any) => {
                    const values = headers.map((header: string) => row[header]);
                    worksheet.addRow(values);
                });

                // Auto-fit columns
                worksheet.columns.forEach((column: any, index: number) => {
                    const header = headers[index];
                    if (!header) return; // Skip if header is undefined

                    let maxLength = header.length;
                    filteredRows.forEach((row: any) => {
                        const value = row[header];
                        if (value && value.toString().length > maxLength) {
                            maxLength = value.toString().length;
                        }
                    });
                    column.width = Math.min(maxLength + 2, 50);
                });

                // Add borders to all cells
                worksheet.eachRow((row: any) => {
                    row.eachCell((cell: any) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });
                });

                // Set response headers
                const fileName = `Above_Market_Report_${marketType}_${region}_${Date.now()}.xlsx`;
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

                // Write to response
                await workbook.xlsx.write(res);
                res.end();
            })
            .on('error', (err: Error) => {
                log.error('Error reading CSV for Excel download:', err);
                res.status(500).json({ success: false, message: 'Error reading data file' });
            });

    } catch (err) {
        log.error('Error generating Excel file:', err);
        res.status(500).json({ success: false, message: 'Server error while generating Excel' });
    }
});

export = router;
