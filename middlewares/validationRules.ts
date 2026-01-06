import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            errors: errors.array(),
            error: 'Validation failed'
        });
        return;
    }
    next();
};

// Report Name Validation - alphanumeric, hyphens, underscores only
export const validateReportName = [
    param('name')
        .trim()
        .notEmpty().withMessage('Report name is required')
        .custom((value: string) => {
            // Check for path traversal attempts
            if (value.includes('..')) {
                throw new Error('Path traversal not allowed');
            }
            // Check for path separators
            if (value.includes('/') || value.includes('\\')) {
                throw new Error('Invalid characters in report name');
            }
            // Check for null bytes (both actual and URL-encoded)
            if (value.includes('\0') || value.includes('%00')) {
                throw new Error('Null bytes not allowed');
            }
            // Check if it matches the allowed pattern
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                throw new Error('Report name can only contain alphanumeric characters, hyphens, and underscores');
            }
            return true;
        }),
    handleValidationErrors
];

// Report ID Validation
export const validateReportId = [
    param('id')
        .isInt({ min: 1 }).withMessage('Report ID must be a positive integer')
        .toInt(),
    handleValidationErrors
];

// Weights Update Validation
export const validateWeightsUpdate = [
    body('topdown')
        .notEmpty().withMessage('Topdown parameter is required')
        .isNumeric().withMessage('Topdown must be numeric')
        .isFloat({ min: 0, max: 100 }).withMessage('Topdown must be between 0 and 100')
        .toFloat(),
    body('bottomup')
        .notEmpty().withMessage('Bottomup parameter is required')
        .isNumeric().withMessage('Bottomup must be numeric')
        .isFloat({ min: 0, max: 100 }).withMessage('Bottomup must be between 0 and 100')
        .toFloat(),
    body('market')
        .notEmpty().withMessage('Market parameter is required')
        .trim()
        .custom((value: string) => {
            // Block path traversal sequences
            if (value.includes('..')) {
                throw new Error('Path traversal not allowed');
            }
            // Block null bytes
            if (value.includes('\0') || value.includes('%00')) {
                throw new Error('Null bytes not allowed');
            }
            // Allow all other characters - they will be sanitized before use in file paths
            // This ensures that malicious input is accepted but properly sanitized
            // preventing command injection and path traversal in the route handler
            return true;
        }),
    body().custom((_value, { req }) => {
        const { topdown, bottomup } = req.body;
        if (parseFloat(topdown) + parseFloat(bottomup) !== 100) {
            throw new Error('Topdown and bottomup must sum to 100');
        }
        return true;
    }),
    handleValidationErrors
];

// File Download Validation
export const validateFileDownload = [
    param('name')
        .trim()
        .notEmpty().withMessage('File name is required')
        .matches(/^[a-zA-Z0-9_\-. ]+\.(csv|xlsx|xls|txt|json|r|py)$/i).withMessage('Invalid file name or extension')
        .not().contains('..').withMessage('Path traversal not allowed')
        .not().contains('/').withMessage('Invalid characters in file name')
        .not().contains('\\').withMessage('Invalid characters in file name'),
    handleValidationErrors
];

// Dashboard Filters Validation
export const validateDashboardFilters = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    query('marketType')
        .optional()
        .trim(),
    // Note: We don't validate the value here because the database uses parameterized queries
    // which safely handle any input including SQL injection attempts
    query('marketModel')
        .optional()
        .trim(),
    // Note: We don't validate the value here because the database uses parameterized queries
    query('dataType')
        .optional()
        .trim(),
    // Note: We don't validate the value here because the database uses parameterized queries
    query('duration')
        .optional()
        .trim(),
    // Note: We accept any value here as the database uses parameterized queries
    handleValidationErrors
];

// Dashboard View Report Validation
export const validateViewReport = [
    param('id')
        .isInt({ min: 1 }).withMessage('Report ID must be a positive integer')
        .toInt(),
    handleValidationErrors
];

// Market Type Validation
export const validateMarketType = [
    query('marketName')
        .optional()
        .trim()
        .notEmpty().withMessage('Market name cannot be empty')
        .matches(/^[a-zA-Z0-9\s\-_,]+$/).withMessage('Market name contains invalid characters'),
    handleValidationErrors
];

// Chart Type Validation
export const validateChartType = [
    param('type')
        .trim()
        .isIn(['current', 'forecasted', 'mekko', 'bubble']).withMessage('Invalid chart type'),
    handleValidationErrors
];

// Region Markets Validation
export const validateRegionMarkets = [
    query('region')
        .notEmpty().withMessage('Region parameter is required')
        .trim()
        .matches(/^[a-zA-Z0-9\s\-_().]+$/).withMessage('Region name contains invalid characters'),
    query('markets')
        .notEmpty().withMessage('Markets parameter is required')
        .trim(),
    handleValidationErrors
];

// Region Validation
export const validateRegion = [
    query('region')
        .notEmpty().withMessage('Region parameter is required')
        .trim()
        .matches(/^[a-zA-Z0-9\s\-_().]+$/).withMessage('Region name contains invalid characters'),
    handleValidationErrors
];

// Environment Variables Validation
export const validateEnvironmentVariables = (): boolean => {
    const requiredEnvVars = [
        'DATABASE_HOST',
        'DATABASE_USER',
        'DATABASE_PASSWORD',
        'DATABASE_NAME',
        'SESSION_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return true;
};
