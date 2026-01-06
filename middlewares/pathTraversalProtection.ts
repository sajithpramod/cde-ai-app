/**
 * Middleware to detect and prevent path traversal attacks
 */

import { Request, Response, NextFunction } from 'express';

interface ParsedUrl {
    pathname?: string;
    [key: string]: unknown;
}

interface RequestWithParsedUrl extends Request {
    _parsedUrl?: ParsedUrl;
}

const pathTraversalProtection = (req: Request, res: Response, next: NextFunction): void => {
    // Check originalUrl, url, path, and params
    const urlPath = req.originalUrl || req.url;
    const decodedPath = decodeURIComponent(urlPath);

    // Also check URL path component
    const parsedPath = req.path || (req as RequestWithParsedUrl)._parsedUrl?.pathname || '';

    // Check for common path traversal patterns
    const pathTraversalPatterns = [
        /\.\./,           // .. sequences
        /%2e%2e/i,        // URL-encoded ..
        /%252e/i,         // Double URL-encoded dots
        /\.%2e/i,         // Mixed encoded dots
        /%00/i,           // Null bytes
        /\0/,             // Actual null bytes
        /\\/,             // Backslashes
        /%5c/i            // URL-encoded backslashes
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

    // Additional check for suspicious normalized paths
    // This catches paths that were normalized but still contain suspicious patterns
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

export default pathTraversalProtection;
