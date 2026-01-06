#!/usr/bin/env node
"use strict";
const path = require('path');
const fs = require('fs');
const { runRScript } = require('../services/rScriptService');
const { runPythonScript } = require('../services/pythonScriptService');
const { createModuleLogger } = require('../utils/debugLogger');
const log = createModuleLogger('aboveMarketScheduler');
async function executeAboveMarketForecast() {
    try {
        log.info('='.repeat(80));
        log.info('Above Market "Create Forecast" Scheduler');
        log.info(`Start Time: ${new Date().toISOString()}`);
        log.info('='.repeat(80));
        log.info('');
        const AboveMarketInputFilePath = path.join(__dirname, '..', 'AboveMarketFiles');
        const AboveMarketStaticFilePath = path.join(__dirname, '..', 'AboveMarketFiles', 'aboveMarket-StaticFiles');
        if (!fs.existsSync(AboveMarketInputFilePath)) {
            throw new Error(`AboveMarketFiles directory not found: ${AboveMarketInputFilePath}`);
        }
        if (!fs.existsSync(AboveMarketStaticFilePath)) {
            throw new Error(`Static files directory not found: ${AboveMarketStaticFilePath}`);
        }
        const overallStartTime = Date.now();
        log.info('[Step 1/5] Python: Mapping brands to price tiers...');
        const pythonStartTime = Date.now();
        const pythonResponse = await runPythonScript('AboveMarket/main4.py', [AboveMarketInputFilePath]);
        const pythonDuration = ((Date.now() - pythonStartTime) / 1000 / 60).toFixed(2);
        if (!pythonResponse.success) {
            throw new Error('Python script (main4.py) failed: ' + pythonResponse.error);
        }
        log.info(`✓ Step 1 completed in ${pythonDuration} minutes`);
        log.info('');
        log.info('[Step 2/5] R Script: Creating forecasts for BGS countries...');
        const r1StartTime = Date.now();
        const r1Response = await runRScript('AboveMarket/BGS/04_Dataprep_BGS.R', [AboveMarketInputFilePath, AboveMarketStaticFilePath], null);
        const r1Duration = ((Date.now() - r1StartTime) / 1000 / 60).toFixed(2);
        if (!r1Response.success) {
            throw new Error('R script 1 (BGS) failed: ' + r1Response.error);
        }
        log.info(`✓ Step 2 completed in ${r1Duration} minutes`);
        log.info('');
        log.info('[Step 3/5] R Script: Creating forecasts for Ad-Hoc countries...');
        const r2StartTime = Date.now();
        const r2Response = await runRScript('AboveMarket/Adhoc/04_Dataprep.R', [AboveMarketInputFilePath, AboveMarketStaticFilePath], null);
        const r2Duration = ((Date.now() - r2StartTime) / 1000 / 60).toFixed(2);
        if (!r2Response.success) {
            throw new Error('R script 2 (Adhoc) failed: ' + r2Response.error);
        }
        log.info(`✓ Step 3 completed in ${r2Duration} minutes`);
        log.info('');
        log.info('[Step 4/5] R Script: Combining BGS and Adhoc results...');
        const r3StartTime = Date.now();
        const r3Response = await runRScript('AboveMarket/BGS-Adhoc Stitch.R', [AboveMarketInputFilePath], null);
        const r3Duration = ((Date.now() - r3StartTime) / 1000 / 60).toFixed(2);
        if (!r3Response.success) {
            throw new Error('R script 3 (Stitch) failed: ' + r3Response.error);
        }
        log.info(`✓ Step 4 completed in ${r3Duration} minutes`);
        log.info('');
        log.info('[Step 5/5] Python: Generating bubble chart...');
        const bubbleStartTime = Date.now();
        try {
            const bubbleResponse = await runPythonScript('AboveMarket/bubble_chart_v6.py', [AboveMarketInputFilePath]);
            const bubbleDuration = ((Date.now() - bubbleStartTime) / 1000 / 60).toFixed(2);
            if (!bubbleResponse.success) {
                log.warn(`Bubble chart generation failed (non-critical): ${bubbleResponse.error}`);
                log.warn('Main forecast data was generated successfully');
            }
            else {
                log.info(`✓ Step 5 completed in ${bubbleDuration} minutes`);
            }
        }
        catch (bubbleError) {
            log.warn('Bubble chart generation failed (non-critical):', bubbleError.message);
            log.warn('Main forecast data was generated successfully');
        }
        const totalDuration = ((Date.now() - overallStartTime) / 1000 / 60).toFixed(2);
        log.info('');
        log.info('='.repeat(80));
        log.info('✓ Above Market "Create Forecast" completed successfully!');
        log.info('');
        log.info('Execution Summary:');
        log.info(`  Step 1 (Price Tier Mapping): ${pythonDuration} min`);
        log.info(`  Step 2 (BGS Forecast):        ${r1Duration} min`);
        log.info(`  Step 3 (Adhoc Forecast):      ${r2Duration} min`);
        log.info(`  Step 4 (Combine Results):     ${r3Duration} min`);
        log.info(`  Total Duration:               ${totalDuration} min`);
        log.info('');
        log.info(`End Time: ${new Date().toISOString()}`);
        log.info('='.repeat(80));
        return {
            success: true,
            duration: totalDuration,
            message: 'Above Market forecast created successfully',
            steps: {
                priceTierMapping: pythonDuration,
                bgsForecast: r1Duration,
                adhocForecast: r2Duration,
                combineResults: r3Duration,
                totalDuration: totalDuration
            }
        };
    }
    catch (error) {
        log.error('='.repeat(80));
        log.error('✗ Above Market "Create Forecast" FAILED');
        log.error('');
        log.error('Error:', error.message);
        log.error('Stack:', error.stack);
        log.error('');
        log.error(`Timestamp: ${new Date().toISOString()}`);
        log.error('='.repeat(80));
        return {
            success: false,
            error: error.message
        };
    }
}
async function main() {
    log.info('Starting Above Market Forecast Scheduler...');
    log.info('');
    log.info('NOTE: This runs the INITIAL forecast creation (long process).');
    log.info('      Ensemble weight updates should be done via the web interface.');
    log.info('');
    const result = await executeAboveMarketForecast();
    if (result.success) {
        log.info('Scheduler execution completed successfully');
        process.exit(0);
    }
    else {
        log.error('Scheduler execution failed');
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(error => {
        log.error('Unhandled error in scheduler:', error);
        process.exit(1);
    });
}
module.exports = { executeAboveMarketForecast };
//# sourceMappingURL=aboveMarketScheduler.js.map