"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = __importDefault(require("express"));
const pythonScriptService_1 = require("../services/pythonScriptService");
const rScriptService_1 = require("../services/rScriptService");
const path_1 = __importDefault(require("path"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('above-market');
module.exports = (io) => {
    const router = express_1.default.Router();
    router.post('/above-market', authMiddleware_1.ensureAuthenticated, async (_req, res) => {
        res.json({ success: true, message: 'Forecast started' });
        const AboveMarketInputFilePath = path_1.default.join(__dirname, '../AboveMarketFiles');
        const AboveMarketStaticFilePath = path_1.default.join(__dirname, '../AboveMarketFiles/aboveMarket-StaticFiles');
        try {
            function delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await delay(200);
            io.emit('forecast-progress', '🟢 Starting Above-Market Forecast...');
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nBrands in CCF data being mapped to suitable Price Tiers...');
            const response = await (0, pythonScriptService_1.runPythonScript)('AboveMarket/main4.py', [AboveMarketInputFilePath]);
            log.debug('response', response);
            if (!response.success)
                throw new Error('Python script failed');
            io.emit('forecast-progress', '✅ Python script completed.');
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nCreating forecasts for countries with BGS data...');
            const response1 = await (0, rScriptService_1.runRScript)('AboveMarket/BGS/04_Dataprep_BGS.R', [AboveMarketInputFilePath, AboveMarketStaticFilePath], io);
            log.debug('response Rscxript1', response1);
            if (!response1.success)
                throw new Error('R script 1 failed');
            io.emit('forecast-progress', '✅ R script 1 completed.');
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\nCreating forecasts for countries with Ad-Hoc data...');
            const response2 = await (0, rScriptService_1.runRScript)('AboveMarket/Adhoc/04_Dataprep.R', [AboveMarketInputFilePath, AboveMarketStaticFilePath], io);
            log.debug('response2', response2);
            if (!response2.success)
                throw new Error('R script 2 failed');
            io.emit('forecast-progress', '✅ R script 2 completed.');
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nCombining all results together and generating output...');
            const response3 = await (0, rScriptService_1.runRScript)('AboveMarket/BGS-Adhoc Stitch.R', [AboveMarketInputFilePath], io);
            log.debug('response3', response3);
            if (!response3.success)
                throw new Error('R script 3 failed');
            io.emit('forecast-progress', '✅ R script 3 completed.');
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nGenerating bubble graph...');
            const response4 = await (0, pythonScriptService_1.runPythonScript)('AboveMarket/bubble_chart_v6.py', [AboveMarketInputFilePath]);
            log.debug('response4', response4);
            if (!response4.success)
                throw new Error('Bubble chart generation failed');
            io.emit('forecast-progress', '✅ Bubble chart created successfully.');
            io.emit('forecast-progress', '🎉 All scripts completed successfully!');
            io.emit('forecast-complete', true);
        }
        catch (err) {
            log.error('Forecast process error:', err);
            io.emit('forecast-progress', `❌ Error: 'An error occurred}`);
        }
    });
    return router;
};
//# sourceMappingURL=forecast.js.map