/**
 * Input validation middleware and schemas
 * Provides validation utilities for request inputs
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationResult, ValidationErrorDetail, ValidationSchema } from '../types';

/**
 * Generic validation function
 * @param schema - Validation schema to apply
 * @param data - Data to validate
 * @returns Validation result with isValid and errors
 */
export const validate = (schema: ValidationSchema, data: Record<string, unknown>): ValidationResult => {
    const errors: ValidationErrorDetail[] = [];

    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        // Check required fields
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push({
                field,
                message: `${field} is required`
            });
            continue;
        }

        // Skip validation if field is optional and not provided
        if (!rules.required && (value === undefined || value === null || value === '')) {
            continue;
        }

        // Type validation
        if (rules.type) {
            const actualType = typeof value;
            if (actualType !== rules.type) {
                errors.push({
                    field,
                    message: `${field} must be of type ${rules.type}`
                });
            }
        }

        // Pattern validation
        if (rules.pattern && typeof value === 'string') {
            if (!rules.pattern.test(value)) {
                errors.push({
                    field,
                    message: rules.message || `${field} format is invalid`
                });
            }
        }

        // Min/Max validation for numbers
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

        // Custom validation function
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

/**
 * Schema for forecast request validation
 */
export const forecastSchema: ValidationSchema = {
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

/**
 * Schema for file path validation
 */
export const filePathSchema: ValidationSchema = {
    filePath: {
        required: true,
        type: 'string',
        validator: (value: string) => {
            // Check for path traversal
            if (value.includes('..') || value.includes('//')) {
                return 'Path traversal not allowed';
            }
            // Check for absolute paths (optional - depending on your requirements)
            if (value.startsWith('/') && !value.startsWith('/var/www/html/')) {
                return 'Invalid file path';
            }
            // Check for null bytes
            if (value.includes('\0') || value.includes('%00')) {
                return 'Null bytes not allowed';
            }
            return true;
        }
    }
};

/**
 * Schema for report name validation
 */
export const reportNameSchema: ValidationSchema = {
    reportName: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9_-]+$/,
        message: 'Report name can only contain alphanumeric characters, hyphens, and underscores'
    }
};

/**
 * Schema for market parameter validation
 */
export const marketSchema: ValidationSchema = {
    market: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z0-9\s\-_().,'&]+$/,
        message: 'Market name contains invalid characters'
    }
};

/**
 * Schema for marketType validation
 */
export const marketTypeSchema: ValidationSchema = {
    marketType: {
        required: true,
        type: 'string',
        validator: (value: string) => {
            const validTypes = ['MGF', 'FP&A', 'MGA', 'mgf', 'fp&a', 'mga', 'MGF Market', 'FP&A Market'];
            if (!validTypes.some(type => value.toUpperCase().includes(type.toUpperCase()))) {
                return 'Invalid market type';
            }
            return true;
        }
    }
};

/**
 * Schema for region validation
 */
export const regionSchema: ValidationSchema = {
    region: {
        required: true,
        type: 'string',
        pattern: /^[a-zA-Z\s\-_(),.'&]+$/,
        message: 'Region name contains invalid characters'
    }
};

/**
 * Schema for final category result validation
 */
export const finalCategoryResultSchema: ValidationSchema = {
    marketType: {
        required: true,
        type: 'string',
        validator: (value: string) => {
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

/**
 * Schema for file download validation
 */
export const fileDownloadSchema: ValidationSchema = {
    file: {
        required: true,
        type: 'string',
        validator: (value: string) => {
            // Must not contain path traversal
            if (value.includes('..') || value.includes('/') || value.includes('\\')) {
                return 'Invalid file name';
            }
            // Must be a CSV file
            if (!value.endsWith('.csv')) {
                return 'Access to this file is not allowed';
            }
            // Must match allowed file pattern
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
        validator: (value: string) => {
            if (!value) return true;
            // Must not contain path traversal
            if (value.includes('..') || value.includes('/') || value.includes('\\')) {
                return 'Invalid file or folder path';
            }
            return true;
        }
    }
};

interface ValidateRequestOptions {
    statusCode?: number;
}

/**
 * Middleware factory to validate request data
 * @param schema - Validation schema
 * @param source - Source of data ('body', 'query', 'params')
 * @param options - Options for validation (e.g., { statusCode: 403 })
 * @returns Express middleware
 */
export const validateRequest = (
    schema: ValidationSchema,
    source: 'body' | 'query' | 'params' = 'body',
    options: ValidateRequestOptions = {}
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const data = req[source];
        const result = validate(schema, data);

        if (!result.isValid) {
            // Check if any validation errors are security-related
            const isSecurityViolation = result.errors.some(error =>
                error.message && (
                    error.message.includes('path traversal') ||
                    error.message.includes('Invalid file name') ||
                    error.message.includes('Invalid file or folder path') ||
                    error.message.includes('not allowed')
                )
            );

            // Use 403 for security violations, 400 for other validation errors
            const statusCode = options.statusCode || (isSecurityViolation ? 403 : 400);

            // Format error message to be more user-friendly
            let errorMessage = result.errors[0]?.message || 'Validation failed';
            // Convert field names to more descriptive messages
            if (errorMessage.includes('file is required')) {
                errorMessage = 'File parameter is required';
            } else if (errorMessage.includes('folder is required')) {
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

/**
 * Sanitize string input by removing potentially dangerous characters
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: unknown): unknown => {
    if (typeof input !== 'string') return input;

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Remove excessive whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    return sanitized;
};

/**
 * Middleware to sanitize all string inputs in request
 */
export const sanitizeInputs = (req: Request, _res: Response, next: NextFunction): void => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]) as string;
            }
        });
    }

    // Sanitize query
    if (req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach(key => {
            const sanitized = sanitizeString(req.query[key]);
            if (typeof sanitized === 'string') {
                req.query[key] = sanitized;
            }
        });
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
        Object.keys(req.params).forEach(key => {
            if (typeof req.params[key] === 'string') {
                req.params[key] = sanitizeString(req.params[key]) as string;
            }
        });
    }

    next();
};
