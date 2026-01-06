"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderFilterPage = exports.getAboveMarketsByType = exports.getAllRegions = exports.getAllCountriesByCluster = exports.getAllMarkets = void 0;
const db_1 = __importDefault(require("../services/db"));
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('market');
const getAllMarkets = async (_req, res) => {
    try {
        const markets = await (0, db_1.default)('markets')
            .select('id', 'name', 'market_type', 'model_type')
            .orderBy('name');
        res.json({ success: true, markets });
    }
    catch (err) {
        log.error('DB error fetching markets:', { reason: err });
        res.status(500).json({ success: false, error: 'Database error' });
    }
};
exports.getAllMarkets = getAllMarkets;
const getAllCountriesByCluster = async (req, res) => {
    const marketName = req.query.marketName;
    try {
        let query = (0, db_1.default)('countries')
            .select('id', 'country_name', 'cluster_name');
        if (marketName) {
            query = query.where('cluster_name', marketName);
        }
        const markets = await query.orderBy('country_name');
        res.json({ success: true, markets });
    }
    catch (err) {
        log.error('DB error fetching markets by cluster:', { reason: err });
        res.status(500).json({ success: false, error: 'Database error' });
    }
};
exports.getAllCountriesByCluster = getAllCountriesByCluster;
const getAllRegions = async (_req, res) => {
    try {
        const regions = await (0, db_1.default)('regions')
            .select('id', 'name')
            .orderBy('name');
        res.render('markets', { regions });
    }
    catch (err) {
        log.error('DB error fetching regions:', { reason: err });
        res.status(500).send('Server error');
    }
};
exports.getAllRegions = getAllRegions;
const getAboveMarketsByType = async (req, res) => {
    const { marketType } = req.query;
    if (!marketType) {
        res.status(400).json({ success: false, error: 'marketType is required' });
        return;
    }
    try {
        const markets = await (0, db_1.default)('above_markets')
            .where('market_type', marketType)
            .select('id', 'market_name')
            .orderBy('market_name');
        res.json({ success: true, markets });
    }
    catch (err) {
        log.error('DB error fetching above markets:', { reason: err });
        res.status(500).json({ success: false, error: 'Database error' });
    }
};
exports.getAboveMarketsByType = getAboveMarketsByType;
const renderFilterPage = async (_req, res) => {
    try {
        const regions = await (0, db_1.default)('regions').select('id', 'name').orderBy('name');
        const marketTypes = ['FP&A', 'MGF'];
        res.render('above-market', {
            title: 'Above Market Reports',
            regions,
            marketTypes
        });
    }
    catch (err) {
        log.error('Error rendering filter page:', { reason: err });
        res.status(500).send('Server error while loading filter page');
    }
};
exports.renderFilterPage = renderFilterPage;
//# sourceMappingURL=marketController.js.map