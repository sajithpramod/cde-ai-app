import express, { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { runPythonScript } from '../services/pythonScriptService';
import { runRScript } from '../services/rScriptService';
import path from 'path';
import { ensureAuthenticated } from '../middlewares/authMiddleware';
import { createModuleLogger } from '../utils/debugLogger';

const log: any = createModuleLogger('above-market');

export = (io: SocketIOServer): Router => {
    const router: Router = express.Router();

    /**
   * Above-Market Forecast trigger
   */
    router.post('/above-market', ensureAuthenticated, async (_req: Request, res: Response) => {
        // Send immediate response so frontend doesn't hang
        res.json({ success: true, message: 'Forecast started' });

        const AboveMarketInputFilePath = path.join(__dirname, '../AboveMarketFiles');
        const AboveMarketStaticFilePath = path.join(__dirname, '../AboveMarketFiles/aboveMarket-StaticFiles');

        try {
            function delay(ms: number): Promise<void> {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            await delay(200);
            io.emit('forecast-progress', '🟢 Starting Above-Market Forecast...');

            // Step 1: Python
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nBrands in CCF data being mapped to suitable Price Tiers...');
            const response = await runPythonScript('AboveMarket/main4.py', [AboveMarketInputFilePath]);
            log.debug('response', response);
            if (!response.success) throw new Error('Python script failed');
            io.emit('forecast-progress', '✅ Python script completed.');

            // Step 2: R script 1
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nCreating forecasts for countries with BGS data...');
            const response1 = await runRScript('AboveMarket/BGS/04_Dataprep_BGS.R', [AboveMarketInputFilePath, AboveMarketStaticFilePath], io);
            log.debug('response Rscxript1', response1);
            if (!response1.success) throw new Error('R script 1 failed');
            io.emit('forecast-progress', '✅ R script 1 completed.');

            // Step 3: R script 2
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\nCreating forecasts for countries with Ad-Hoc data...');
            const response2 = await runRScript('AboveMarket/Adhoc/04_Dataprep.R', [AboveMarketInputFilePath, AboveMarketStaticFilePath], io);
            log.debug('response2', response2);
            if (!response2.success) throw new Error('R script 2 failed');
            io.emit('forecast-progress', '✅ R script 2 completed.');

            // Step 4: R script 3
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nCombining all results together and generating output...');
            const response3 = await runRScript('AboveMarket/BGS-Adhoc Stitch.R', [AboveMarketInputFilePath], io);
            log.debug('response3', response3);
            if (!response3.success) throw new Error('R script 3 failed');
            io.emit('forecast-progress', '✅ R script 3 completed.');

            // Step 5: Python Bubble Chart
            io.emit('forecast-progress', 'Preparing your visual insights…\nSit back and relax while we do the heavy lifting.\n\nGenerating bubble graph...');
            const response4 = await runPythonScript('AboveMarket/bubble_chart_v6.py', [AboveMarketInputFilePath]);
            log.debug('response4', response4);
            if (!response4.success) throw new Error('Bubble chart generation failed');
            io.emit('forecast-progress', '✅ Bubble chart created successfully.');

            io.emit('forecast-progress', '🎉 All scripts completed successfully!');
            io.emit('forecast-complete', true);

        } catch (err) {
            log.error('Forecast process error:', err);
            io.emit('forecast-progress', `❌ Error: 'An error occurred}`);
        }
    });

    return router;
};
