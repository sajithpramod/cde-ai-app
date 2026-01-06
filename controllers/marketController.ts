// Market Controller - TypeScript Version
// Handles market-related operations including fetching markets, countries, regions, and above markets

import { Request, Response } from 'express';
import db from '../services/db';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('market');

/**
 * Get all markets from the database
 */
export const getAllMarkets = async (_req: Request, res: Response): Promise<void> => {
    try {
        const markets = await db('markets')
            .select('id', 'name', 'market_type', 'model_type')
            .orderBy('name');

        res.json({ success: true, markets });
    } catch (err) {
        log.error('DB error fetching markets:', { reason: err });
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

/**
 * Get all countries filtered by cluster name
 */
export const getAllCountriesByCluster = async (req: Request, res: Response): Promise<void> => {
    const marketName = req.query.marketName as string | undefined;

    try {
        // Build the query - store the query builder, not the terminated chain
        let query = db('countries')
            .select('id', 'country_name', 'cluster_name');

        // Apply filter if marketName is provided
        if (marketName) {
            query = query.where('cluster_name', marketName);
        }

        // Order by must come after where clause
        const markets = await query.orderBy('country_name');

        res.json({ success: true, markets });
    } catch (err) {
        log.error('DB error fetching markets by cluster:', { reason: err });
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

/**
 * Get regions for dropdown (renders EJS page)
 */
export const getAllRegions = async (_req: Request, res: Response): Promise<void> => {
    try {
        const regions = await db('regions')
            .select('id', 'name')
            .orderBy('name');

        // Render EJS template (you can change to JSON if needed)
        res.render('markets', { regions });
    } catch (err) {
        log.error('DB error fetching regions:', { reason: err });
        res.status(500).send('Server error');
    }
};

/**
 * Get above markets by type (AJAX endpoint)
 */
export const getAboveMarketsByType = async (req: Request, res: Response): Promise<void> => {
    const { marketType } = req.query as { marketType?: string };

    if (!marketType) {
        res.status(400).json({ success: false, error: 'marketType is required' });
        return;
    }

    try {
        const markets = await db('above_markets')
            .where('market_type', marketType)
            .select('id', 'market_name')
            .orderBy('market_name');

        res.json({ success: true, markets });
    } catch (err) {
        log.error('DB error fetching above markets:', { reason: err });
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

/**
 * Render the filter page for above market reports
 */
export const renderFilterPage = async (_req: Request, res: Response): Promise<void> => {
    try {
        const regions = await db('regions').select('id', 'name').orderBy('name');
        const marketTypes = ['FP&A', 'MGF'];

        res.render('above-market', {
            title: 'Above Market Reports',
            regions,
            marketTypes
        });
    } catch (err) {
        log.error('Error rendering filter page:', { reason: err });
        res.status(500).send('Server error while loading filter page');
    }
};
