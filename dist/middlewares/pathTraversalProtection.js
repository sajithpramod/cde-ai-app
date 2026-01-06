"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pathTraversalProtection = (req, res, next) => {
    const urlPath = req.originalUrl || req.url;
    const decodedPath = decodeURIComponent(urlPath);
    const parsedPath = req.path || req._parsedUrl?.pathname || '';
    const pathTraversalPatterns = [
        /\.\./,
        /%2e%2e/i,
        /%252e/i,
        /\.%2e/i,
        /%00/i,
        /\0/,
        /\\/,
        /%5c/i
    ];
    const pathsToCheck = [urlPath, decodedPath, parsedPath];
    for (const pathToCheck of pathsToCheck) {
        for (const pattern of pathTraversalPatterns) {
            if (pattern.test(pathToCheck)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid request path'
                });
                return;
            }
        }
    }
    const suspiciousPatterns = [
        /etc\/passwd/,
        /windows\/system32/,
        /config\.js/
    ];
    for (const pathToCheck of pathsToCheck) {
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(pathToCheck)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid request path'
                });
                return;
            }
        }
    }
    next();
};
exports.default = pathTraversalProtection;
//# sourceMappingURL=pathTraversalProtection.js.map