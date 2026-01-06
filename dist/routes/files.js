"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const securityLogger_1 = require("../utils/securityLogger");
const debugLogger_1 = require("../utils/debugLogger");
const router = express_1.default.Router();
const log = (0, debugLogger_1.createModuleLogger)('files');
function isValidFilePath(filePath) {
    const uploadsDir = path_1.default.resolve(__dirname, '..', 'uploads');
    log.debug('uploadsDir', uploadsDir);
    const resolvedPath = path_1.default.resolve(filePath);
    return resolvedPath.startsWith(uploadsDir);
}
router.post('/download', authMiddleware_1.requireAuth, (req, res) => {
    const { path: filePath, file_name } = req.body;
    const fullFilePAth = path_1.default.join(__dirname, '..', filePath, file_name);
    if (!filePath || !file_name) {
        return res.status(400).json({ error: 'Missing file path or name' });
    }
    try {
        log.debug('file PATH', fullFilePAth);
        if (!isValidFilePath(fullFilePAth)) {
            (0, securityLogger_1.logSecurityViolation)('path_traversal_attempt', {
                attemptedPath: filePath,
                fileName: file_name
            }, req);
            return res.status(403).json({ error: 'Access denied: Invalid file path' });
        }
        log.debug('file PATH', fullFilePAth);
        if (!fs_1.default.existsSync(fullFilePAth)) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.download(fullFilePAth, file_name, (err) => {
            if (err) {
                log.error('Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading file' });
                }
            }
        });
    }
    catch (err) {
        log.error('File download error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
module.exports = router;
//# sourceMappingURL=files.js.map