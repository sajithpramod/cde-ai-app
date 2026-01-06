// Upload Controller - TypeScript Version
// Handles forecast form submission, file uploads, and R script execution

import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { runRScript } from '../services/rScriptService';
import { createModuleLogger } from '../utils/debugLogger';
import db from '../services/db';

const log = createModuleLogger('upload');

interface CagrDataRow {
    country: string;
    tier: string;
    cagr: string | number;
}

interface CountryData {
    country_name: string;
    bgs_adhoc: 'BGS' | 'ADHOC';
}

interface ForecastFormBody {
    cagrData: CagrDataRow[];
    selectedGrowthType: 'CAGR' | string;
    clusterName?: string;
    forcastDuration: string;
    countryNames?: string | string[];
    countryMultiSelect?: 'MultipleCountries' | string;
    marketNames?: string | string[] | { data: string[] | string[][] };
}

/**
 * Helper function to safely parse array input
 */
function safeParseArray(input: any): string[] {
    if (Array.isArray(input)) return input; // Already an array
    try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return []; // Fallback to empty array if invalid JSON
    }
}

/**
 * Helper function to extract country/market names from various formats
 */
const extractNames = (val: any): string[] => {
    if (!val) return [];

    // Cases:
    // ['Greece']
    // [['Greece']]
    // {data: [['Greece']]}
    // {data: ['Greece']}
    // {data: []}
    if (Array.isArray(val)) return val.flat().filter(Boolean);

    if (val.data && Array.isArray(val.data)) {
        return val.data.flat().filter(Boolean);
    }

    return [];
};

/**
 * Helper function to copy file if it exists
 */
const copyIfExists = async (src: string, dest: string): Promise<void> => {
    try {
        if (fs.existsSync(src)) {
            await fs.promises.copyFile(src, dest);
            log.info(`Copied: ${dest}`);
        } else {
            log.warn(`Missing source: ${src}`);
        }
    } catch (err) {
        log.error(`Error copying ${src}:`, { reason: (err as Error).message });
    }
};

/**
 * Main handler for forecast form submission
 */
export const handleForecastForm = async (req: Request, res: Response, io?: SocketIOServer): Promise<void> => {
    try {
        const {
            cagrData,
            selectedGrowthType,
            clusterName,
            forcastDuration,
            countryNames: rowCountryNames,
            countryMultiSelect,
            marketNames
        } = req.body as ForecastFormBody;

        log.info('cagrData', cagrData);

        if (!Array.isArray(cagrData)) {
            res.status(400).json({ success: false, error: 'Invalid input format' });
            return;
        }

        let countryNames: string[] = [];

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

        // Group cagrData by country
        const growthFiles: string[] = [];
        const groupedByCountry = cagrData.reduce((acc: Record<string, CagrDataRow[]>, row) => {
            const country = row.country;
            if (!country) return acc;
            if (!acc[country]) acc[country] = [];
            acc[country].push(row);
            return acc;
        }, {});

        log.info('groupedByCountry', groupedByCountry);

        // Write one CSV file per country
        for (const [country, rows] of Object.entries(groupedByCountry)) {
            const safeCountryName = country.replace(/\s+/g, '-'); // avoid spaces in file name
            const fileName = `${safeCountryName.toLowerCase()}_pt_growth_input_filled.csv`;
            const cagrCsvPath = path.join(folderPath, fileName);
            growthFiles.push(fileName);
            const cagrCsv =
                `price.tier,${userValueColumnName}\n` +
                rows.map(r => `${r.tier},${r.cagr}`).join('\n') +
                '\n';

            fs.writeFileSync(cagrCsvPath, cagrCsv, 'utf8');
            log.info(`CSV written: ${cagrCsvPath}`);
        }

        if (req.session.staticMappingFile === 'static') {
            const sourceFile = path.join(__dirname, '../uploads/mapped_latest_year_data.csv');
            const destFile = path.join(folderPath, 'mapped_latest_year_data.csv');

            try {
                fs.copyFileSync(sourceFile, destFile);
                log.info(`File copied to ${destFile}`);
            } catch (err) {
                log.error('Error copying file:', { reason: err });
            }
            req.session.staticMappingFile = '';
        }

        // Check required input files exist
        const requiredFiles = [
            'forecast_tf_generated.csv',
            'base_period.csv',
            'price_tier_rename_filled.csv',
        ];

        const requiredBGSFiles = [
            'price_tier_rename_filled.csv',
        ];

        // Determine which files to check based on bgs_adhoc from database
        let reqFiles = requiredFiles; // default to ADHOC files

        if (countryNames && countryNames.length) {
            const countriesData = await db('countries')
                .whereIn('country_name', countryNames)
                .select('bgs_adhoc') as Array<{ bgs_adhoc: 'BGS' | 'ADHOC' }>;

            // Check if all countries are BGS
            const allBGS = countriesData.every(c => c.bgs_adhoc === 'BGS');
            const anyBGS = countriesData.some(c => c.bgs_adhoc === 'BGS');

            if (allBGS) {
                reqFiles = requiredBGSFiles;
            } else if (anyBGS) {
                // For mixed, we need BGS files at minimum (BGS is less strict)
                reqFiles = requiredBGSFiles;
            }
        }

        for (const file of reqFiles) {
            const filePath = path.join(folderPath, file);
            if (!fs.existsSync(filePath)) {
                res.status(400).json({
                    success: false,
                    error: `Missing required input file: ${file}`
                });
                return;
            }
        }

        try {
            let result: any;
            log.info('MARKET NAME', marketNames);

            // Determine script type based on bgs_adhoc column from database
            let scriptType: 'ADHOC' | 'BGS' | 'MIXED' = 'ADHOC'; // default
            let hasBGS = false;
            let hasADHOC = false;
            let bgsCountries: string[] = [];
            let adhocCountries: string[] = [];

            const extractedCountries = extractNames(countryNames);
            const extractedMarkets = extractNames(marketNames);

            let processedCountries: string[] = [];

            if (extractedCountries.length > 0) {
                processedCountries = extractedCountries;
            } else if (extractedMarkets.length > 0) {
                processedCountries = extractedMarkets;
            } else {
                processedCountries = [];
            }

            console.log('Final Country List:', processedCountries);
            console.log('Country Names', processedCountries);

            if (processedCountries && processedCountries.length) {
                // Query database to get bgs_adhoc values for selected countries
                const countriesData = await db('countries')
                    .whereIn('country_name', processedCountries)
                    .select('country_name', 'bgs_adhoc') as CountryData[];

                log.info('Countries data from DB:', countriesData);
                console.log('Country Data', countriesData);

                // Check what types we have and separate countries
                countriesData.forEach(country => {
                    if (country.bgs_adhoc === 'BGS') {
                        hasBGS = true;
                        bgsCountries.push(country.country_name);
                    } else if (country.bgs_adhoc === 'ADHOC') {
                        hasADHOC = true;
                        adhocCountries.push(country.country_name);
                    }
                });

                // Determine script type
                if (hasBGS && hasADHOC) {
                    scriptType = 'MIXED'; // Both BGS and ADHOC countries
                } else if (hasBGS) {
                    scriptType = 'BGS'; // All BGS
                    bgsCountries = processedCountries; // Use all countryNames if all are BGS
                } else {
                    scriptType = 'ADHOC'; // All ADHOC
                    adhocCountries = processedCountries; // Use all countryNames if all are ADHOC
                }

                log.info('Script type determined:', scriptType);

                // Copy files based on country/market names (original logic)
                if (processedCountries.includes('Indonesia')) {
                    const basePath = {
                        '4': '../uploads/indonesia/4Tiers',
                        '5': '../uploads/indonesia/5Tiers'
                    }[req.session.staticTBAMapping as string] || '../uploads/indonesia';

                    const sourceFile = path.join(__dirname, `${basePath}/mapped_back_data.csv`);
                    const sourceFile2 = path.join(__dirname, `${basePath}/mapped_latest_year_data.csv`);
                    const destFile = path.join(folderPath, 'mapped_back_data.csv');
                    const destFile2 = path.join(folderPath, 'mapped_latest_year_data.csv');

                    await copyIfExists(sourceFile, destFile);
                    await copyIfExists(sourceFile2, destFile2);
                } else if (marketNames && extractedMarkets.includes('South LAC')) {
                    const countryMap: Record<string, [string, string]> = {
                        Argentina: ['Argentina/mapped_back_data.csv', 'Argentina/mapped_latest_year_data.csv'],
                        Chile: ['Chile/mapped_back_data.csv', 'Chile/mapped_latest_year_data.csv'],
                        Peru: ['Peru/mapped_back_data.csv', 'Peru/mapped_latest_year_data.csv']
                    };
                    const selected = countryNames.find(c => countryMap[c]);
                    if (selected && countryMap[selected]) {
                        const [backFile, latestFile] = countryMap[selected];
                        log.info('backFile', backFile);
                        log.info('latestFile', latestFile);
                        await copyIfExists(
                            path.join(__dirname, `../uploads/southLac/${backFile}`),
                            path.join(folderPath, 'mapped_back_data.csv')
                        );
                        await copyIfExists(
                            path.join(__dirname, `../uploads/southLac/${latestFile}`),
                            path.join(folderPath, 'mapped_latest_year_data.csv')
                        );
                    }
                }

                // Execute scripts based on bgs_adhoc type
                if (scriptType === 'BGS' || scriptType === 'MIXED') {
                    const bgsScript = 'BGS/04_Dataprep_BGS.R';
                    result = await runRScript(
                        bgsScript,
                        [folderPath, forcastDuration, requiredBGSFiles[0] || '', JSON.stringify(growthFiles), JSON.stringify(bgsCountries)],
                        io
                    );
                    log.info('BGS script execution completed');
                }

                if (scriptType === 'ADHOC' || scriptType === 'MIXED') {
                    const adhocScript = '04_Dataprep.R';
                    result = await runRScript(
                        adhocScript,
                        [folderPath, requiredFiles[0] || '', requiredFiles[1] || '', requiredFiles[2] || '', JSON.stringify(growthFiles), JSON.stringify(adhocCountries)],
                        io
                    );
                    log.info('ADHOC script execution completed');
                }
            } else {
                // No country names - use cluster logic
                const script = '04_Dataprep.R';
                if (marketNames && extractedMarkets.includes('South LAC')) {
                    await copyIfExists(
                        path.join(__dirname, '../uploads/hub/mapped_back_data.csv'),
                        path.join(folderPath, 'mapped_back_data.csv')
                    );
                    await copyIfExists(
                        path.join(__dirname, '../uploads/hub/mapped_latest_year_data.csv'),
                        path.join(folderPath, 'mapped_latest_year_data.csv')
                    );
                }
                result = await runRScript(
                    script,
                    [folderPath, requiredFiles[0] || '', requiredFiles[1] || '', requiredFiles[2] || '', JSON.stringify(growthFiles), clusterName || ''],
                    io
                );
            }

            // Mark forecast as complete in user_forecast_progress
            const userId = req.session.user?.id;
            await db('user_forecast_progress')
                .where({ user_id: userId })
                .update({ is_complete: true });

            log.info('Forecast result', { reason: result });

            res.json({ result });
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                log.error('R script error:', { reason: (err as Error).message });
                res.status(500).json({ success: false, error: (err as Error).message });
            } else {
                res.status(500).json({ success: false, error: 'An error occurred' });
            }
        }
    } catch (err) {
        log.error('Forecast handler error:', { reason: err });
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
