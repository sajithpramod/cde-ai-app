"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../services/db"));
const validationRules_1 = require("../middlewares/validationRules");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const debugLogger_1 = require("../utils/debugLogger");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const azureBlobService_1 = __importDefault(require("../services/azureBlobService"));
const router = express_1.default.Router();
const log = (0, debugLogger_1.createModuleLogger)('dashboard');
function applyFilters(query, filters) {
    const { marketType, marketModel, dataType, duration } = filters;
    if (marketType) {
        const clean = marketType.replace(/[^a-zA-Z0-9\s\-_&]/g, '');
        const likePattern = '%' + clean + '%';
        query.where((q) => {
            q.whereRaw("LOWER(ufp.form_data->>'marketType') = LOWER(?)", [clean])
                .orWhereRaw("ufp.form_data->>'marketType' LIKE ?", [likePattern]);
        });
    }
    if (marketModel) {
        const clean = marketModel.replace(/[^a-zA-Z0-9\s\-_&]/g, '');
        const likePattern = '%' + clean + '%';
        query.where((q) => {
            q.whereRaw("LOWER(ufp.form_data->>'marketModel') = LOWER(?)", [clean])
                .orWhereRaw("ufp.form_data->>'marketModel' LIKE ?", [likePattern]);
        });
    }
    if (dataType) {
        const allowed = ['iwsr', 'retail'];
        const clean = dataType.toLowerCase();
        if (allowed.includes(clean)) {
            query.whereRaw("ufp.form_data->>'dataType' = ?", [clean]);
        }
    }
    if (duration) {
        const clean = String(duration).replace(/[^0-9]/g, '');
        if (clean) {
            query.whereRaw("ufp.form_data->>'forcastDuration' = ?", [clean]);
        }
    }
    return query;
}
router.get('/', authMiddleware_1.ensureAuthenticated, validationRules_1.validateDashboardFilters, async (req, res) => {
    try {
        const { marketType = '', marketModel = '', dataType = '', duration = '', page = 1 } = req.query;
        const limit = 10;
        const offset = (Number(page) - 1) * limit;
        let query = (0, db_1.default)('user_forecast_progress as ufp')
            .leftJoin('users as u', 'ufp.user_id', 'u.id')
            .select('ufp.id', 'ufp.user_id', 'ufp.form_data', 'ufp.country_selection', 'ufp.created_at', 'ufp.is_published', 'ufp.published_at', 'u.email')
            .where('ufp.is_complete', true)
            .where('ufp.is_published', true);
        applyFilters(query, req.query);
        query.orderBy('ufp.published_at', 'desc');
        let countQuery = (0, db_1.default)('user_forecast_progress as ufp')
            .leftJoin('users as u', 'ufp.user_id', 'u.id')
            .where('ufp.is_complete', true)
            .where('ufp.is_published', true);
        applyFilters(countQuery, req.query);
        log.debug("MAIN QUERY:", query.toSQL().toNative());
        log.debug("COUNT QUERY:", countQuery.toSQL().toNative());
        const countResult = await countQuery.count({ count: 1 });
        const totalCount = (countResult && countResult[0]?.count) ? Number(countResult[0].count) : 0;
        const results = await query.limit(limit).offset(offset);
        const marketIds = results
            .map(r => parseInt(r.form_data?.marketSelect))
            .filter(id => !isNaN(id));
        let marketNamesMap = {};
        if (marketIds.length > 0) {
            const markets = await (0, db_1.default)('markets')
                .whereIn('id', marketIds)
                .select('id', 'name');
            marketNamesMap = Object.fromEntries(markets.map(m => [m.id, m.name]));
        }
        const reportData = results.map(record => {
            const formData = record.form_data || {};
            const countrySel = record.country_selection || {};
            const countries = Array.isArray(countrySel.countryNames)
                ? countrySel.countryNames
                : [];
            const reportName = countries.length > 0
                ? `${formData.dataType || 'Forecast'} - ${countries.slice(0, 2).join(', ')}${countries.length > 2 ? '...' : ''}`
                : `Forecast Report #${record.id}`;
            let typeOfMarket = 'N/A';
            const marketVal = formData.marketSelect;
            if (marketVal) {
                const id = parseInt(marketVal);
                typeOfMarket = !isNaN(id)
                    ? marketNamesMap[id] || marketVal
                    : marketVal;
            }
            return {
                id: record.id,
                reportName,
                forecastedBy: record.email || 'Unknown',
                dataType: formData.dataType || 'N/A',
                marketModel: formData.marketModel || formData.typeOfModel || 'N/A',
                typeOfMarket,
                publishedDate: new Date(record.published_at || record.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                uploaderFolderPath: formData.validatedFilePath || null
            };
        });
        const totalPages = Math.ceil(Number(totalCount) / limit);
        res.render('dashboard', {
            reportData,
            pagination: {
                currentPage: Number(page),
                totalPages,
                prevPage: Number(page) > 1 ? Number(page) - 1 : null,
                nextPage: Number(page) < totalPages ? Number(page) + 1 : null
            },
            filters: { marketType, marketModel, dataType, duration }
        });
    }
    catch (error) {
        log.error('Error fetching dashboard data:', error);
        res.render('dashboard', {
            reportData: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                prevPage: null,
                nextPage: null
            },
            filters: { marketType: '', marketModel: '', dataType: '', duration: '' }
        });
    }
});
router.get('/view-report/:id', authMiddleware_1.ensureAuthenticated, validationRules_1.validateViewReport, async (req, res) => {
    try {
        const reportId = parseInt(req.params.id || '0', 10);
        const currentUserId = req.session?.user?.id || req.user?.id || '';
        const record = await (0, db_1.default)('user_forecast_progress')
            .where('id', reportId)
            .where('is_complete', true)
            .first();
        if (!record)
            return res.status(404).send('Report not found');
        if (!record.is_published && record.user_id !== currentUserId) {
            log.error('Unauthorized access attempt', {
                reportId,
                requestingUserId: currentUserId,
                ownerId: record.user_id
            });
            return res.status(403).send('Access denied.');
        }
        const formData = record.form_data || {};
        const uploaderFolderPath = formData.validatedFilePath;
        if (!uploaderFolderPath)
            return res.status(400).send('folder path not found');
        if (record.is_published && record.blob_storage_path) {
            if (!fs_1.default.existsSync(uploaderFolderPath)) {
                log.info(`Downloading report ${reportId} from blob storage...`);
                const result = await azureBlobService_1.default.downloadFolder(record.blob_storage_path, uploaderFolderPath);
                if (!result.success) {
                    log.error('Blob download failed:', result.error);
                    return res.status(500).send('Failed to load report. Try later.');
                }
            }
            else {
                log.info(`Using local cached folder for report ${reportId}`);
            }
        }
        req.session.userUploadFolerPath = uploaderFolderPath;
        req.session.currentReportId = reportId;
        const reportName = path_1.default.basename(uploaderFolderPath) || 'forecast';
        return res.redirect(`/reports/${reportName}`);
    }
    catch (error) {
        log.error('Error viewing report:', error);
        return res.status(500).send('Error loading report');
    }
});
module.exports = router;
//# sourceMappingURL=dashboard.js.map