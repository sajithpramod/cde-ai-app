// forecasting-app/routes/dashboard.ts
import express, { Router, Request, Response } from 'express';
import { Knex } from 'knex';
import db from '../services/db';
import { validateDashboardFilters, validateViewReport } from '../middlewares/validationRules';
import { ensureAuthenticated } from '../middlewares/authMiddleware';
import { createModuleLogger } from '../utils/debugLogger';
import path from 'path';
import fs from 'fs';
import azureBlobService from '../services/azureBlobService';

const router: Router = express.Router();
const log: any = createModuleLogger('dashboard');

interface FilterOptions {
    marketType?: string;
    marketModel?: string;
    dataType?: string;
    duration?: string;
}

// ------------------------------------------------------------
// 🧹 Reusable Filter Function (removes 70+ duplicated lines)
// ------------------------------------------------------------
function applyFilters(query: Knex.QueryBuilder, filters: FilterOptions): Knex.QueryBuilder {
    const { marketType, marketModel, dataType, duration } = filters;

    if (marketType) {
        const clean = marketType.replace(/[^a-zA-Z0-9\s\-_&]/g, '');
        const likePattern = '%' + clean + '%';
        query.where((q: Knex.QueryBuilder) => {
            q.whereRaw("LOWER(ufp.form_data->>'marketType') = LOWER(?)", [clean])
                .orWhereRaw("ufp.form_data->>'marketType' LIKE ?", [likePattern]);
        });
    }

    if (marketModel) {
        const clean = marketModel.replace(/[^a-zA-Z0-9\s\-_&]/g, '');
        const likePattern = '%' + clean + '%';
        query.where((q: Knex.QueryBuilder) => {
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



// ------------------------------------------------------------
// 📄 Dashboard Page with Filters + Pagination
// ------------------------------------------------------------
router.get('/', ensureAuthenticated, validateDashboardFilters, async (req: Request, res: Response) => {
    try {
        const { marketType = '', marketModel = '', dataType = '', duration = '', page = 1 } = req.query;
        const limit = 10;
        const offset = (Number(page) - 1) * limit;

        // -------- Main Query --------
        let query = db('user_forecast_progress as ufp')
            .leftJoin('users as u', 'ufp.user_id', 'u.id')
            .select(
                'ufp.id',
                'ufp.user_id',
                'ufp.form_data',
                'ufp.country_selection',
                'ufp.created_at',
                'ufp.is_published',
                'ufp.published_at',
                'u.email'
            )
            .where('ufp.is_complete', true)
            .where('ufp.is_published', true);

        applyFilters(query, req.query as FilterOptions);
        query.orderBy('ufp.published_at', 'desc');


        // -------- Count Query --------
        let countQuery = db('user_forecast_progress as ufp')
            .leftJoin('users as u', 'ufp.user_id', 'u.id')
            .where('ufp.is_complete', true)
            .where('ufp.is_published', true);

        applyFilters(countQuery, req.query as FilterOptions);

        log.debug("MAIN QUERY:", query.toSQL().toNative());
        log.debug("COUNT QUERY:", countQuery.toSQL().toNative());

        const countResult = await countQuery.count({ count: 1 });
        const totalCount = (countResult && countResult[0]?.count) ? Number(countResult[0].count) : 0;
        const results: any[] = await query.limit(limit).offset(offset);


        // ------------------------------------------------------------
        // Fetch Market Names (efficient)
        // ------------------------------------------------------------
        const marketIds = results
            .map(r => parseInt(r.form_data?.marketSelect))
            .filter(id => !isNaN(id));

        let marketNamesMap: Record<number, string> = {};

        if (marketIds.length > 0) {
            const markets: any[] = await db('markets')
                .whereIn('id', marketIds)
                .select('id', 'name');

            marketNamesMap = Object.fromEntries(markets.map(m => [m.id, m.name]));
        }


        // ------------------------------------------------------------
        // Format Result Data
        // ------------------------------------------------------------
        const reportData = results.map(record => {
            const formData = record.form_data || {};
            const countrySel = record.country_selection || {};

            const countries = Array.isArray(countrySel.countryNames)
                ? countrySel.countryNames
                : [];

            const reportName =
                countries.length > 0
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


        // -------- Render Dashboard --------
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

    } catch (error) {
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



// ------------------------------------------------------------
// 🔍 View Report (Published or Unpublished)
// ------------------------------------------------------------
router.get('/view-report/:id', ensureAuthenticated, validateViewReport, async (req: Request, res: Response): Promise<any> => {
    try {
        const reportId = parseInt(req.params.id || '0', 10);
        const currentUserId: string = req.session?.user?.id || (req.user as any)?.id || '';

        const record: any = await db('user_forecast_progress')
            .where('id', reportId)
            .where('is_complete', true)
            .first();

        if (!record) return res.status(404).send('Report not found');

        // ACCESS CONTROL
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

        // ------------------------------------------------------------
        // Download from Blob Storage if published and missing locally
        // ------------------------------------------------------------
        if (record.is_published && record.blob_storage_path) {
            if (!fs.existsSync(uploaderFolderPath)) {
                log.info(`Downloading report ${reportId} from blob storage...`);

                const result = await azureBlobService.downloadFolder(
                    record.blob_storage_path,
                    uploaderFolderPath
                );

                if (!result.success) {
                    log.error('Blob download failed:', result.error);
                    return res.status(500).send('Failed to load report. Try later.');
                }
            } else {
                log.info(`Using local cached folder for report ${reportId}`);
            }
        }

        // Save reference in session
        req.session.userUploadFolerPath = uploaderFolderPath;
        req.session.currentReportId = reportId;

        // Determine Report Folder Name
        const reportName = path.basename(uploaderFolderPath) || 'forecast';

        return res.redirect(`/reports/${reportName}`);

    } catch (error) {
        log.error('Error viewing report:', error);
        return res.status(500).send('Error loading report');
    }
});



export = router;
