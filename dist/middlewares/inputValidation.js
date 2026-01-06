"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInputs = exports.sanitizeString = exports.validateRequest = exports.fileDownloadSchema = exports.finalCategoryResultSchema = exports.regionSchema = exports.marketTypeSchema = exports.marketSchema = exports.reportNameSchema = exports.filePathSchema = exports.forecastSchema = exports.validate = void 0;
const validate = (schema, data) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push({
                field,
                message: `${field} is required`
            });
            continue;
        }
        if (!rules.required && (value === undefined || value === null || value === '')) {
            continue;
        }
        if (rules.type) {
            const actualType = typeof value;
            if (actualType !== rules.type) {
                errors.push({
                    field,
                    message: `${field} must be of type ${rules.type}`
                });
            }
        }
        if (rules.pattern && typeof value === 'string') {
            if (!rules.pattern.test(value)) {
                errors.push({
                    field,
                    message: rules.message || `${field} format is invalid`
                });
            }
        }
        if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
            errors.push({
                field,
                message: `${field} must be at least ${rules.min}`
            });
        }
        if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
            errors.push({
                field,
                message: `${field} must be at most ${rules.max}`
            });
        }
        if (rules.validator && typeof rules.validator === 'function') {
            const result = rules.validator(value);
            if (result !== true) {
                errors.push({
                    field,
                    message: result || `${field} is invalid`
                });
            }
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validate = validate;
exports.forecastSchema = {
    market: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9\s\-_().]+$/,
        message: 'Market name contains invalid characters'
    },
    dataType: {
        required: false,
        type: 'string'
    },
    duration: {
        required: false,
        type: 'string'
    }
};
exports.filePathSchema = {
    filePath: {
        required: true,
        type: 'string',
        validator: (value) => {
            if (value.includes('..') || value.includes('//')) {
                return 'Path traversal not allowed';
            }
            if (value.startsWith('/') && !value.startsWith('/var/www/html/')) {
                return 'Invalid file path';
            }
            if (value.includes('\0') || value.includes('%00')) {
                return 'Null bytes not allowed';
            }
            return true;
        }
    }
};
exports.reportNameSchema = {
    reportName: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9_-]+$/,
        message: 'Report name can only contain alphanumeric characters, hyphens, and underscores'
    }
};
exports.marketSchema = {
    market: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9\s\-_().,'&]+$/,
        message: 'Market name contains invalid characters'
    }
};
exports.marketTypeSchema = {
    marketType: {
        required: true,
        type: 'string',
        validator: (value) => {
            const validTypes = ['MGF', 'FP&A', 'MGA', 'mgf', 'fp&a', 'mga', 'MGF Market', 'FP&A Market'];
            if (!validTypes.some(type => value.toUpperCase().includes(type.toUpperCase()))) {
                return 'Invalid market type';
            }
            return true;
        }
    }
};
exports.regionSchema = {
    region: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z\s\-_(),.'&]+$/,
        message: 'Region name contains invalid characters'
    }
};
exports.finalCategoryResultSchema = {
    marketType: {
        required: true,
        type: 'string',
        validator: (value) => {
            const validTypes = ['MGF', 'FP&A', 'MGA', 'mgf', 'fp&a', 'mga', 'MGF Market', 'FP&A Market'];
            if (!validTypes.some(type => value.toUpperCase().includes(type.toUpperCase()))) {
                return 'Invalid market type';
            }
            return true;
        }
    },
    region: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z\s\-_(),.']+$/,
        message: 'Region name contains invalid characters'
    },
    markets: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9\s\-_/(),.',]+$/,
        message: 'Markets parameter contains invalid characters'
    }
};
exports.fileDownloadSchema = {
    file: {
        required: true,
        type: 'string',
        validator: (value) => {
            if (value.includes('..') || value.includes('/') || value.includes('\\')) {
                return 'Invalid file name';
            }
            if (!value.endsWith('.csv')) {
                return 'Access to this file is not allowed';
            }
            const allowedPattern = /^[a-zA-Z0-9_\-]+\.csv$/;
            if (!allowedPattern.test(value)) {
                return 'File name contains invalid characters';
            }
            return true;
        }
    },
    folder: {
        required: false,
        type: 'string',
        validator: (value) => {
            if (!value)
                return true;
            if (value.includes('..') || value.includes('/') || value.includes('\\')) {
                return 'Invalid file or folder path';
            }
            return true;
        }
    }
};
const validateRequest = (schema, source = 'body', options = {}) => {
    return (req, res, next) => {
        const data = req[source];
        const result = (0, exports.validate)(schema, data);
        if (!result.isValid) {
            const isSecurityViolation = result.errors.some(error => error.message && (error.message.includes('path traversal') ||
                error.message.includes('Invalid file name') ||
                error.message.includes('Invalid file or folder path') ||
                error.message.includes('not allowed')));
            const statusCode = options.statusCode || (isSecurityViolation ? 403 : 400);
            let errorMessage = result.errors[0]?.message || 'Validation failed';
            if (errorMessage.includes('file is required')) {
                errorMessage = 'File parameter is required';
            }
            else if (errorMessage.includes('folder is required')) {
                errorMessage = 'Folder parameter is required';
            }
            console.log('errorMessage', errorMessage);
            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                details: result.errors
            });
            return;
        }
        next();
    };
};
exports.validateRequest = validateRequest;
const sanitizeString = (input) => {
    if (typeof input !== 'string')
        return input;
    let sanitized = input.replace(/\0/g, '');
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
    return sanitized;
};
exports.sanitizeString = sanitizeString;
const sanitizeInputs = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = (0, exports.sanitizeString)(req.body[key]);
            }
        });
    }
    if (req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach(key => {
            const sanitized = (0, exports.sanitizeString)(req.query[key]);
            if (typeof sanitized === 'string') {
                req.query[key] = sanitized;
            }
        });
    }
    if (req.params && typeof req.params === 'object') {
        Object.keys(req.params).forEach(key => {
            if (typeof req.params[key] === 'string') {
                req.params[key] = (0, exports.sanitizeString)(req.params[key]);
            }
        });
    }
    next();
};
exports.sanitizeInputs = sanitizeInputs;
//# sourceMappingURL=inputValidation.js.map