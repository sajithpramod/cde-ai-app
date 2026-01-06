"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleForecastForm = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const rScriptService_1 = require("../services/rScriptService");
const debugLogger_1 = require("../utils/debugLogger");
const db_1 = __importDefault(require("../services/db"));
const log = (0, debugLogger_1.createModuleLogger)('upload');
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
const extractNames = (val) => {
    if (!val)
        return [];
    if (Array.isArray(val))
        return val.flat().filter(Boolean);
    if (val.data && Array.isArray(val.data)) {
        return val.data.flat().filter(Boolean);
    }
    return [];
};
const copyIfExists = async (src, dest) => {
    try {
        if (fs_1.default.existsSync(src)) {
            await fs_1.default.promises.copyFile(src, dest);
            log.info(`Copied: ${dest}`);
        }
        else {
            log.warn(`Missing source: ${src}`);
        }
    }
    catch (err) {
        log.error(`Error copying ${src}:`, { reason: err.message });
    }
};
const handleForecastForm = async (req, res, io) => {
    try {
        const { cagrData, selectedGrowthType, clusterName, forcastDuration, countryNames: rowCountryNames, countryMultiSelect, marketNames } = req.body;
        log.info('cagrData', cagrData);
        if (!Array.isArray(cagrData)) {
            res.status(400).json({ success: false, error: 'Invalid input format' });
            return;
        }
        let countryNames = [];
        if (countryMultiSelect === 'MultipleCountries') {
            countryNames = safeParseArray(rowCountryNames);
        }
        const folderPath = req.session.userUploadFolerPath;
        if (!folderPath) {
            res.status(400).json({ success: false, error: 'Upload folder path not found in session' });
            return;
        }
        req.session.forcastDuration = forcastDuration;
        log.info('FOLDER PATH', folderPath);
        const userValueColumnName = selectedGrowthType === 'CAGR' ? 'user_value_per' : 'user_value_B100';
        const growthFiles = [];
        const groupedByCountry = cagrData.reduce((acc, row) => {
            const country = row.country;
            if (!country)
                return acc;
            if (!acc[country])
                acc[country] = [];
            acc[country].push(row);
            return acc;
        }, {});
        log.info('groupedByCountry', groupedByCountry);
        for (const [country, rows] of Object.entries(groupedByCountry)) {
            const safeCountryName = country.replace(/\s+/g, '-');
            const fileName = `${safeCountryName.toLowerCase()}_pt_growth_input_filled.csv`;
            const cagrCsvPath = path_1.default.join(folderPath, fileName);
            growthFiles.push(fileName);
            const cagrCsv = `price.tier,${userValueColumnName}\n` +
                rows.map(r => `${r.tier},${r.cagr}`).join('\n') +
                '\n';
            fs_1.default.writeFileSync(cagrCsvPath, cagrCsv, 'utf8');
            log.info(`CSV written: ${cagrCsvPath}`);
        }
        if (req.session.staticMappingFile === 'static') {
            const sourceFile = path_1.default.join(__dirname, '../uploads/mapped_latest_year_data.csv');
            const destFile = path_1.default.join(folderPath, 'mapped_latest_year_data.csv');
            try {
                fs_1.default.copyFileSync(sourceFile, destFile);
                log.info(`File copied to ${destFile}`);
            }
            catch (err) {
                log.error('Error copying file:', { reason: err });
            }
            req.session.staticMappingFile = '';
        }
        const requiredFiles = [
            'forecast_tf_generated.csv',
            'base_period.csv',
            'price_tier_rename_filled.csv',
        ];
        const requiredBGSFiles = [
            'price_tier_rename_filled.csv',
        ];
        let reqFiles = requiredFiles;
        if (countryNames && countryNames.length) {
            const countriesData = await (0, db_1.default)('countries')
                .whereIn('country_name', countryNames)
                .select('bgs_adhoc');
            const allBGS = countriesData.every(c => c.bgs_adhoc === 'BGS');
            const anyBGS = countriesData.some(c => c.bgs_adhoc === 'BGS');
            if (allBGS) {
                reqFiles = requiredBGSFiles;
            }
            else if (anyBGS) {
                reqFiles = requiredBGSFiles;
            }
        }
        for (const file of reqFiles) {
            const filePath = path_1.default.join(folderPath, file);
            if (!fs_1.default.existsSync(filePath)) {
                res.status(400).json({
                    success: false,
                    error: `Missing required input file: ${file}`
                });
                return;
            }
        }
        try {
            let result;
            log.info('MARKET NAME', marketNames);
            let scriptType = 'ADHOC';
            let hasBGS = false;
            let hasADHOC = false;
            let bgsCountries = [];
            let adhocCountries = [];
            const extractedCountries = extractNames(countryNames);
            const extractedMarkets = extractNames(marketNames);
            let processedCountries = [];
            if (extractedCountries.length > 0) {
                processedCountries = extractedCountries;
            }
            else if (extractedMarkets.length > 0) {
                processedCountries = extractedMarkets;
            }
            else {
                processedCountries = [];
            }
            console.log('Final Country List:', processedCountries);
            console.log('Country Names', processedCountries);
            if (processedCountries && processedCountries.length) {
                const countriesData = await (0, db_1.default)('countries')
                    .whereIn('country_name', processedCountries)
                    .select('country_name', 'bgs_adhoc');
                log.info('Countries data from DB:', countriesData);
                console.log('Country Data', countriesData);
                countriesData.forEach(country => {
                    if (country.bgs_adhoc === 'BGS') {
                        hasBGS = true;
                        bgsCountries.push(country.country_name);
                    }
                    else if (country.bgs_adhoc === 'ADHOC') {
                        hasADHOC = true;
                        adhocCountries.push(country.country_name);
                    }
                });
                if (hasBGS && hasADHOC) {
                    scriptType = 'MIXED';
                }
                else if (hasBGS) {
                    scriptType = 'BGS';
                    bgsCountries = processedCountries;
                }
                else {
                    scriptType = 'ADHOC';
                    adhocCountries = processedCountries;
                }
                log.info('Script type determined:', scriptType);
                if (processedCountries.includes('Indonesia')) {
                    const basePath = {
                        '4': '../uploads/indonesia/4Tiers',
                        '5': '../uploads/indonesia/5Tiers'
                    }[req.session.staticTBAMapping] || '../uploads/indonesia';
                    const sourceFile = path_1.default.join(__dirname, `${basePath}/mapped_back_data.csv`);
                    const sourceFile2 = path_1.default.join(__dirname, `${basePath}/mapped_latest_year_data.csv`);
                    const destFile = path_1.default.join(folderPath, 'mapped_back_data.csv');
                    const destFile2 = path_1.default.join(folderPath, 'mapped_latest_year_data.csv');
                    await copyIfExists(sourceFile, destFile);
                    await copyIfExists(sourceFile2, destFile2);
                }
                else if (marketNames && extractedMarkets.includes('South LAC')) {
                    const countryMap = {
                        Argentina: ['Argentina/mapped_back_data.csv', 'Argentina/mapped_latest_year_data.csv'],
                        Chile: ['Chile/mapped_back_data.csv', 'Chile/mapped_latest_year_data.csv'],
                        Peru: ['Peru/mapped_back_data.csv', 'Peru/mapped_latest_year_data.csv']
                    };
                    const selected = countryNames.find(c => countryMap[c]);
                    if (selected && countryMap[selected]) {
                        const [backFile, latestFile] = countryMap[selected];
                        log.info('backFile', backFile);
                        log.info('latestFile', latestFile);
                        await copyIfExists(path_1.default.join(__dirname, `../uploads/southLac/${backFile}`), path_1.default.join(folderPath, 'mapped_back_data.csv'));
                        await copyIfExists(path_1.default.join(__dirname, `../uploads/southLac/${latestFile}`), path_1.default.join(folderPath, 'mapped_latest_year_data.csv'));
                    }
                }
                if (scriptType === 'BGS' || scriptType === 'MIXED') {
                    const bgsScript = 'BGS/04_Dataprep_BGS.R';
                    result = await (0, rScriptService_1.runRScript)(bgsScript, [folderPath, forcastDuration, requiredBGSFiles[0] || '', JSON.stringify(growthFiles), JSON.stringify(bgsCountries)], io);
                    log.info('BGS script execution completed');
                }
                if (scriptType === 'ADHOC' || scriptType === 'MIXED') {
                    const adhocScript = '04_Dataprep.R';
                    result = await (0, rScriptService_1.runRScript)(adhocScript, [folderPath, requiredFiles[0] || '', requiredFiles[1] || '', requiredFiles[2] || '', JSON.stringify(growthFiles), JSON.stringify(adhocCountries)], io);
                    log.info('ADHOC script execution completed');
                }
            }
            else {
                const script = '04_Dataprep.R';
                if (marketNames && extractedMarkets.includes('South LAC')) {
                    await copyIfExists(path_1.default.join(__dirname, '../uploads/hub/mapped_back_data.csv'), path_1.default.join(folderPath, 'mapped_back_data.csv'));
                    await copyIfExists(path_1.default.join(__dirname, '../uploads/hub/mapped_latest_year_data.csv'), path_1.default.join(folderPath, 'mapped_latest_year_data.csv'));
                }
                result = await (0, rScriptService_1.runRScript)(script, [folderPath, requiredFiles[0] || '', requiredFiles[1] || '', requiredFiles[2] || '', JSON.stringify(growthFiles), clusterName || ''], io);
            }
            const userId = req.session.user?.id;
            await (0, db_1.default)('user_forecast_progress')
                .where({ user_id: userId })
                .update({ is_complete: true });
            log.info('Forecast result', { reason: result });
            res.json({ result });
        }
        catch (err) {
            if (process.env.NODE_ENV === 'development') {
                log.error('R script error:', { reason: err.message });
                res.status(500).json({ success: false, error: err.message });
            }
            else {
                res.status(500).json({ success: false, error: 'An error occurred' });
            }
        }
    }
    catch (err) {
        log.error('Forecast handler error:', { reason: err });
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.handleForecastForm = handleForecastForm;
//# sourceMappingURL=uploadController.js.map