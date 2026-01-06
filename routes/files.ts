// routes/files.ts
import express, { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middlewares/authMiddleware';
import { logSecurityViolation } from '../utils/securityLogger';
import { createModuleLogger } from '../utils/debugLogger';

const router: Router = express.Router();
const log: any = createModuleLogger('files');

// Helper function to validate file path is within uploads directory
function isValidFilePath(filePath: string): boolean {
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    log.debug('uploadsDir', uploadsDir);
    const resolvedPath = path.resolve(filePath);

    // Check if the resolved path starts with the uploads directory
    return resolvedPath.startsWith(uploadsDir);
}

router.post('/download', requireAuth, (req: Request, res: Response): any => {
    const { path: filePath, file_name } = req.body;

    const fullFilePAth = path.join(__dirname, '..', filePath, file_name);

    if (!filePath || !file_name) {
        return res.status(400).json({ error: 'Missing file path or name' });
    }

    try {
        log.debug('file PATH', fullFilePAth);
        // Security: Validate that file path is within uploads directory
        if (!isValidFilePath(fullFilePAth)) {
            logSecurityViolation('path_traversal_attempt', {
                attemptedPath: filePath,
                fileName: file_name
            }, req as any);
            return res.status(403).json({ error: 'Access denied: Invalid file path' });
        }

        log.debug('file PATH', fullFilePAth);

        if (!fs.existsSync(fullFilePAth)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(fullFilePAth, file_name, (err: Error | null) => {
            if (err) {
                log.error('Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading file' });
                }
            }
        });
    } catch (err) {
        log.error('File download error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

export = router;
