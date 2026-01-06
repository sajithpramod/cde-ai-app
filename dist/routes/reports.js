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
const express = __importStar(require("express"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const reportController = __importStar(require("../controllers/reportController"));
const rScriptService_1 = require("../services/rScriptService");
const { validateReportName, validateWeightsUpdate } = require('../middlewares/validationRules');
const pathTraversalProtection_1 = __importDefault(require("../middlewares/pathTraversalProtection"));
const debugLogger_1 = require("../utils/debugLogger");
const db_1 = __importDefault(require("../services/db"));
const azureBlobService_1 = __importDefault(require("../services/azureBlobService"));
const { ensureAuthenticated } = require('../middlewares/authMiddleware');
const log = (0, debugLogger_1.createModuleLogger)('reports');
const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');
router.use(pathTraversalProtection_1.default);
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
router.get('/excel', ensureAuthenticated, reportController.downloadExcelReport);
router.get('/:name', ensureAuthenticated, validateReportName, reportController.viewCsvReport);
router.get('/:name/data', ensureAuthenticated, validateReportName, reportController.getCsvReportData);
router.get('/:name/type/chart', ensureAuthenticated, validateReportName, reportController.getMekkoChart);
router.post('/update-weights', ensureAuthenticated, validateWeightsUpdate, async (req, res) => {
    try {
        const { topdown, bottomup, market } = req.body;
        const validMarket = await (0, db_1.default)('markets')
            .select('name')
            .where('name', market)
            .first();
        if (!validMarket) {
            const validCountry = await (0, db_1.default)('countries')
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
        const safeCountryName = market
            .replace(/[^a-zA-Z0-9\s\-_]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        const growthFilledFileName = `${safeCountryName.toLowerCase()}_pt_growth_input_filled.csv`;
        const ensembleWeightsFileName = 'Ensemble-weights-inp.csv';
        const requiredFiles = [
            ensembleWeightsFileName,
            'price_tier_rename_filled.csv',
            growthFilledFileName,
        ];
        const folderPath = req.session?.userUploadFolerPath;
        if (!folderPath) {
            res.status(400).json({ success: false, error: 'Session folder path not found' });
            return;
        }
        const csvPath = path.join(folderPath, ensembleWeightsFileName);
        const csvContent = `topdown,bottomup\n${topdown}%,${bottomup}%\n`;
        fs.writeFileSync(csvPath, csvContent);
        const result = await (0, rScriptService_1.runRScript)("ensemble_automated.R", [folderPath, market, requiredFiles[0] || '', requiredFiles[1] || '', requiredFiles[2] || '']);
        log.debug('message', result.success);
        if (result.success) {
            res.status(200).json({ success: true });
        }
        else {
            res.status(500).json({ success: false, error: 'Failed to update the wightage' });
        }
    }
    catch (err) {
        log.error("Error updating weights:", err);
        res.status(500).json({ success: false, error: 'An error occurred while updating weights' });
    }
});
router.post('/publish/:reportId', ensureAuthenticated, async (req, res) => {
    try {
        const reportId = parseInt(req.params.reportId || '0', 10);
        if (!reportId || isNaN(reportId)) {
            res.status(400).json({ success: false, error: 'Invalid report ID' });
            return;
        }
        const record = await (0, db_1.default)('user_forecast_progress')
            .where('id', reportId)
            .where('is_complete', true)
            .first();
        if (!record) {
            res.status(404).json({ success: false, error: 'Report not found' });
            return;
        }
        if (record.is_published) {
            res.status(400).json({ success: false, error: 'Report is already published' });
            return;
        }
        const formData = record.form_data || {};
        const uploaderFolderPath = formData.validatedFilePath;
        if (!uploaderFolderPath) {
            res.status(400).json({ success: false, error: 'Report folder path not found' });
            return;
        }
        if (!fs.existsSync(uploaderFolderPath)) {
            res.status(400).json({ success: false, error: 'Report folder not found on server' });
            return;
        }
        const blobFolderPrefix = `reports/${reportId}/${path.basename(uploaderFolderPath)}/`;
        log.info(`Publishing report ${reportId} to blob storage: ${blobFolderPrefix}`);
        const uploadResult = await azureBlobService_1.default.uploadFolder(uploaderFolderPath, blobFolderPrefix);
        if (!uploadResult.success) {
            log.error(`Failed to upload report ${reportId} to blob storage:`, uploadResult.error);
            res.status(500).json({
                success: false,
                error: uploadResult.error || 'Failed to upload report to Azure Blob Storage'
            });
            return;
        }
        await (0, db_1.default)('user_forecast_progress')
            .where('id', reportId)
            .update({
            is_published: true,
            blob_storage_path: blobFolderPrefix,
            published_at: db_1.default.fn.now()
        });
        log.info(`Report ${reportId} published successfully`);
        res.json({
            success: true,
            message: 'Report published successfully',
            blobPath: blobFolderPrefix
        });
    }
    catch (err) {
        log.error('Error publishing report:', err);
        res.status(500).json({ success: false, error: 'An error occurred while publishing the report' });
    }
});
module.exports = router;
//# sourceMappingURL=reports.js.map