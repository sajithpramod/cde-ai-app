// Report routes - TypeScript Version
// forecasting-app/routes/reports.ts

import * as express from 'express';
import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as reportController from '../controllers/reportController';
import { runRScript } from '../services/rScriptService';
const { validateReportName, validateWeightsUpdate } = require('../middlewares/validationRules');
import pathTraversalProtection from '../middlewares/pathTraversalProtection';
import { createModuleLogger } from '../utils/debugLogger';
import db from '../services/db';
import azureBlobService from '../services/azureBlobService';
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

const log = createModuleLogger('reports');
const router: Router = express.Router();
const uploadDir: string = path.join(__dirname, '..', 'uploads');

// ============================================
// TYPE DEFINITIONS
// ============================================

// Extend express-session with custom properties
declare module 'express-session' {
    interface SessionData {
        userUploadFolerPath?: string;
    }
}

interface WeightsUpdateBody {
    topdown: string | number;
    bottomup: string | number;
    market: string;
}

interface MarketRecord {
    name: string;
}

interface CountryRecord {
    country_name: string;
}

interface ForecastRecord {
    id: number;
    is_complete: boolean;
    is_published: boolean;
    form_data: any;
}

// ============================================
// SETUP
// ============================================

// Apply path traversal protection to all routes
router.use(pathTraversalProtection);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ============================================
// ROUTES
// ============================================

// Excel report download
router.get('/excel', ensureAuthenticated, reportController.downloadExcelReport);

// View CSV report
router.get('/:name', ensureAuthenticated, validateReportName, reportController.viewCsvReport);

// Get CSV report data
router.get('/:name/data', ensureAuthenticated, validateReportName, reportController.getCsvReportData);

// Get Mekko chart
router.get('/:name/type/chart', ensureAuthenticated, validateReportName, reportController.getMekkoChart);

// Update weights endpoint
router.post('/update-weights', ensureAuthenticated, validateWeightsUpdate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { topdown, bottomup, market } = req.body as WeightsUpdateBody;

        // SECURITY: Validate market name against database to prevent command injection
        // Only allow markets that exist in our database
        const validMarket: MarketRecord | undefined = await db('markets')
            .select('name')
            .where('name', market)
            .first();

        if (!validMarket) {
            // If not in markets table, check countries table
            const validCountry: CountryRecord | undefined = await db('countries')
                .select('country_name')
                .where('country_name', 'ILIKE', market)
                .first();

            if (!validCountry) {
                log.error('Invalid market/country name attempted:', market);
                res.status(400).json({
                    success: false,
                    error: 'Invalid market or country name'
                });
                return;
            }
        }

        // Sanitize market name - remove all special characters except letters, numbers, spaces, hyphens, and underscores
        // This prevents command injection and path traversal attacks
        const safeCountryName: string = market
            .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Collapse multiple hyphens

        const growthFilledFileName: string = `${safeCountryName.toLowerCase()}_pt_growth_input_filled.csv`;

        // Sanitized filename without spaces
        const ensembleWeightsFileName: string = 'Ensemble-weights-inp.csv';

        const requiredFiles: string[] = [
            ensembleWeightsFileName,
            'price_tier_rename_filled.csv',
            growthFilledFileName,
        ];

        const folderPath: string | undefined = req.session?.userUploadFolerPath;
        if (!folderPath) {
            res.status(400).json({ success: false, error: 'Session folder path not found' });
            return;
        }
        const csvPath: string = path.join(folderPath, ensembleWeightsFileName);

        // Save CSV file
        const csvContent: string = `topdown,bottomup\n${topdown}%,${bottomup}%\n`;
        fs.writeFileSync(csvPath, csvContent);

        // Call your R script (adjust args as per your existing logic)
        const result = await runRScript("ensemble_automated.R", [folderPath, market, requiredFiles[0] || '', requiredFiles[1] || '', requiredFiles[2] || '']);

        log.debug('message', result.success);
        if (result.success) {
            // Refresh the report using your existing controller
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ success: false, error: 'Failed to update the wightage' });
        }

    } catch (err) {
        log.error("Error updating weights:", err);
        // Don't expose internal error details to client
        res.status(500).json({ success: false, error: 'An error occurred while updating weights' });
    }
});

// Publish report endpoint
router.post('/publish/:reportId', ensureAuthenticated, async (req: Request, res: Response): Promise<void> => {
    try {
        const reportId: number = parseInt(req.params.reportId || '0', 10);

        if (!reportId || isNaN(reportId)) {
            res.status(400).json({ success: false, error: 'Invalid report ID' });
            return;
        }

        // Fetch the forecast record
        const record: ForecastRecord | undefined = await db('user_forecast_progress')
            .where('id', reportId)
            .where('is_complete', true)
            .first();

        if (!record) {
            res.status(404).json({ success: false, error: 'Report not found' });
            return;
        }

        // Check if already published
        if (record.is_published) {
            res.status(400).json({ success: false, error: 'Report is already published' });
            return;
        }

        const formData: any = record.form_data || {};
        const uploaderFolderPath: string | undefined = formData.validatedFilePath;

        if (!uploaderFolderPath) {
            res.status(400).json({ success: false, error: 'Report folder path not found' });
            return;
        }

        // Check if folder exists locally
        if (!fs.existsSync(uploaderFolderPath)) {
            res.status(400).json({ success: false, error: 'Report folder not found on server' });
            return;
        }

        // Generate blob storage path
        const blobFolderPrefix: string = `reports/${reportId}/${path.basename(uploaderFolderPath)}/`;

        log.info(`Publishing report ${reportId} to blob storage: ${blobFolderPrefix}`);

        // Upload folder to Azure Blob Storage
        const uploadResult = await azureBlobService.uploadFolder(uploaderFolderPath, blobFolderPrefix);

        if (!uploadResult.success) {
            log.error(`Failed to upload report ${reportId} to blob storage:`, uploadResult.error);
            res.status(500).json({
                success: false,
                error: uploadResult.error || 'Failed to upload report to Azure Blob Storage'
            });
            return;
        }

        // Update database record
        await db('user_forecast_progress')
            .where('id', reportId)
            .update({
                is_published: true,
                blob_storage_path: blobFolderPrefix,
                published_at: db.fn.now()
            });

        log.info(`Report ${reportId} published successfully`);

        res.json({
            success: true,
            message: 'Report published successfully',
            blobPath: blobFolderPrefix
        });

    } catch (err) {
        log.error('Error publishing report:', err);
        res.status(500).json({ success: false, error: 'An error occurred while publishing the report' });
    }
});

export = router;
