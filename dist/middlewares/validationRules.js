"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironmentVariables = exports.validateRegion = exports.validateRegionMarkets = exports.validateChartType = exports.validateMarketType = exports.validateViewReport = exports.validateDashboardFilters = exports.validateFileDownload = exports.validateWeightsUpdate = exports.validateReportId = exports.validateReportName = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
exports.handleValidationErrors = handleValidationErrors;
exports.validateReportName = [
    (0, express_validator_1.param)('name')
        .trim()
        .notEmpty().withMessage('Report name is required')
        .custom((value) => {
        if (value.includes('..')) {
            throw new Error('Path traversal not allowed');
        }
        if (value.includes('/') || value.includes('\\')) {
            throw new Error('Invalid characters in report name');
        }
        if (value.includes('\0') || value.includes('%00')) {
            throw new Error('Null bytes not allowed');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            throw new Error('Report name can only contain alphanumeric characters, hyphens, and underscores');
        }
        return true;
    }),
    exports.handleValidationErrors
];
exports.validateReportId = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 }).withMessage('Report ID must be a positive integer')
        .toInt(),
    exports.handleValidationErrors
];
exports.validateWeightsUpdate = [
    (0, express_validator_1.body)('topdown')
        .notEmpty().withMessage('Topdown parameter is required')
        .isNumeric().withMessage('Topdown must be numeric')
        .isFloat({ min: 0, max: 100 }).withMessage('Topdown must be between 0 and 100')
        .toFloat(),
    (0, express_validator_1.body)('bottomup')
        .notEmpty().withMessage('Bottomup parameter is required')
        .isNumeric().withMessage('Bottomup must be numeric')
        .isFloat({ min: 0, max: 100 }).withMessage('Bottomup must be between 0 and 100')
        .toFloat(),
    (0, express_validator_1.body)('market')
        .notEmpty().withMessage('Market parameter is required')
        .trim()
        .custom((value) => {
        if (value.includes('..')) {
            throw new Error('Path traversal not allowed');
        }
        if (value.includes('\0') || value.includes('%00')) {
            throw new Error('Null bytes not allowed');
        }
        return true;
    }),
    (0, express_validator_1.body)().custom((_value, { req }) => {
        const { topdown, bottomup } = req.body;
        if (parseFloat(topdown) + parseFloat(bottomup) !== 100) {
            throw new Error('Topdown and bottomup must sum to 100');
        }
        return true;
    }),
    exports.handleValidationErrors
];
exports.validateFileDownload = [
    (0, express_validator_1.param)('name')
        .trim()
        .notEmpty().withMessage('File name is required')
        .matches(/^[a-zA-Z0-9_\-. ]+\.(csv|xlsx|xls|txt|json|r|py)$/i).withMessage('Invalid file name or extension')
        .not().contains('..').withMessage('Path traversal not allowed')
        .not().contains('/').withMessage('Invalid characters in file name')
        .not().contains('\\').withMessage('Invalid characters in file name'),
    exports.handleValidationErrors
];
exports.validateDashboardFilters = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    (0, express_validator_1.query)('marketType')
        .optional()
        .trim(),
    (0, express_validator_1.query)('marketModel')
        .optional()
        .trim(),
    (0, express_validator_1.query)('dataType')
        .optional()
        .trim(),
    (0, express_validator_1.query)('duration')
        .optional()
        .trim(),
    exports.handleValidationErrors
];
exports.validateViewReport = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 }).withMessage('Report ID must be a positive integer')
        .toInt(),
    exports.handleValidationErrors
];
exports.validateMarketType = [
    (0, express_validator_1.query)('marketName')
        .optional()
        .trim()
        .notEmpty().withMessage('Market name cannot be empty')
        .matches(/^[a-zA-Z0-9\s\-_,]+$/).withMessage('Market name contains invalid characters'),
    exports.handleValidationErrors
];
exports.validateChartType = [
    (0, express_validator_1.param)('type')
        .trim()
        .isIn(['current', 'forecasted', 'mekko', 'bubble']).withMessage('Invalid chart type'),
    exports.handleValidationErrors
];
exports.validateRegionMarkets = [
    (0, express_validator_1.query)('region')
        .notEmpty().withMessage('Region parameter is required')
        .trim()
        .matches(/^[a-zA-Z0-9\s\-_().]+$/).withMessage('Region name contains invalid characters'),
    (0, express_validator_1.query)('markets')
        .notEmpty().withMessage('Markets parameter is required')
        .trim(),
    exports.handleValidationErrors
];
exports.validateRegion = [
    (0, express_validator_1.query)('region')
        .notEmpty().withMessage('Region parameter is required')
        .trim()
        .matches(/^[a-zA-Z0-9\s\-_().]+$/).withMessage('Region name contains invalid characters'),
    exports.handleValidationErrors
];
const validateEnvironmentVariables = () => {
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
exports.validateEnvironmentVariables = validateEnvironmentVariables;
//# sourceMappingURL=validationRules.js.map