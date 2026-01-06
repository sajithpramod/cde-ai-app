/**
 * Security Improvements Configuration
 * Apply these configurations to server.js for enhanced security
 */

const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { createModuleLogger } = require('../utils/debugLogger');
const log = createModuleLogger('rscriptService'); // Use your module name

// ============================================
// 1. ENHANCED SESSION CONFIGURATION
// ============================================

/**
 * Secure session configuration
 * Apply this to replace current session() middleware
 */
const secureSessionConfig = {
    secret: process.env.SESSION_SECRET,
    name: 'sessionId', // Don't use default 'connect.sid' - makes fingerprinting harder
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // Prevent XSS access to cookies
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // CHANGED from 'lax' to 'strict' for better CSRF protection
        maxAge: 1800000, // 30 minutes (CHANGED from 3 hours)
        domain: process.env.COOKIE_DOMAIN || undefined // Set in production
    },
    rolling: true, // Reset expiration on every response
    proxy: true // Trust first proxy
};

// ============================================
// 2. IMPROVED CONTENT SECURITY POLICY
// ============================================

/**
 * Generate nonce for inline scripts
 * Use this middleware before CSP
 */
function nonceMiddleware(req, res, next) {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
}

/**
 * Improved CSP configuration
 * Removes unsafe-eval and restricts unsafe-inline
 */
function improvedCSP(req, res, next) {
    const nonce = res.locals.nonce;

    const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            `'nonce-${nonce}'`,
            // External CDNs - use SRI hashes in production instead
            "https://cdn.datatables.net",
            "https://code.jquery.com",
            "https://cdn.jsdelivr.net",
            "https://cdn.plot.ly"
        ],
        styleSrc: [
            "'self'",
            `'nonce-${nonce}'`,
            "https://cdn.datatables.net"
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"], // Prevent clickjacking
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        mediaSrc: ["'self'"]
    };

    // Generate CSP header
    const cspHeader = Object.entries(cspDirectives)
        .map(([key, values]) => {
            const directive = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            return `${directive} ${values.join(' ')}`;
        })
        .join('; ');

    res.setHeader('Content-Security-Policy', cspHeader);
    next();
}

// ============================================
// 3. COMPREHENSIVE RATE LIMITING
// ============================================

/**
 * Rate limiter for authentication endpoints
 */
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many authentication attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        log.error({
            event: 'rate_limit_exceeded',
            type: 'auth',
            ip: req.ip,
            path: req.path,
            timestamp: new Date().toISOString()
        });
        res.status(429).json({
            error: 'Too many requests',
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

/**
 * Rate limiter for file upload endpoints
 */
const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.UPLOAD_RATE_LIMIT) || 30,
    message: 'Too many upload requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * Rate limiter for forecast/script execution
 */
const forecastRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.FORECAST_RATE_LIMIT) || 10,
    message: 'Too many forecast requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter for API endpoints (general)
 */
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// 4. SECURITY HEADERS
// ============================================

/**
 * Enhanced security headers middleware
 */
function securityHeaders(req, res, next) {
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection (legacy, but doesn't hurt)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // HSTS - Force HTTPS for 2 years
    if (process.env.NODE_ENV === 'production') {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=63072000; includeSubDomains; preload'
        );
    }

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy - disable unnecessary features
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
}

// ============================================
// 5. INPUT VALIDATION HELPERS
// ============================================

/**
 * Validate and sanitize file path to prevent path traversal
 */
function validateFilePath(basePath, userPath) {
    const path = require('path');

    // Resolve the full path
    const fullPath = path.resolve(basePath, userPath);

    // Ensure it starts with the base path
    if (!fullPath.startsWith(path.resolve(basePath))) {
        throw new Error('Invalid file path: path traversal detected');
    }

    return fullPath;
}

/**
 * Validate session user ID
 */
function validateUserId(req) {
    const userId = req.session?.user?.id;

    if (!userId || typeof userId !== 'number') {
        throw new Error('Invalid or missing user ID in session');
    }

    return userId;
}

/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename) {
    // Remove path components
    const basename = require('path').basename(filename);

    // Remove or replace dangerous characters
    const sanitized = basename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 255); // Limit length

    if (!sanitized || sanitized === '.' || sanitized === '..') {
        throw new Error('Invalid filename');
    }

    return sanitized;
}

// ============================================
// 6. HTTPS ENFORCEMENT
// ============================================

/**
 * Redirect HTTP to HTTPS in production
 */
function enforceHTTPS(req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
    }
    next();
}

// ============================================
// 7. ERROR HANDLING
// ============================================

/**
 * Safe error handler that doesn't leak sensitive information
 */
function errorHandler(err, req, res) {
    // Log full error for debugging
    log.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        user: req.session?.user?.id,
        timestamp: new Date().toISOString()
    });

    // Send sanitized error to client
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : err.message;

    res.status(statusCode).json({
        error: true,
        message: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

// ============================================
// 8. AUDIT LOGGING
// ============================================

/**
 * Audit log for security-relevant events
 */
function auditLog(event, details, req) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event: event,
        user: req?.session?.user?.email || 'anonymous',
        userId: req?.session?.user?.id || null,
        ip: req?.ip || 'unknown',
        userAgent: req?.get('user-agent') || 'unknown',
        ...details
    };

    // In production, send to SIEM or log aggregation service
    log.debug('[AUDIT]', JSON.stringify(logEntry));

    // TODO: Send to logging service (e.g., CloudWatch, ELK, Splunk)
}

// ============================================
// USAGE IN SERVER.JS
// ============================================

/**
 * Example usage in server.js:
 *
 * const {
 *     secureSessionConfig,
 *     nonceMiddleware,
 *     improvedCSP,
 *     authRateLimiter,
 *     uploadRateLimiter,
 *     forecastRateLimiter,
 *     apiRateLimiter,
 *     securityHeaders,
 *     enforceHTTPS,
 *     errorHandler,
 *     auditLog
 * } = require('./config/security-improvements');
 *
 * // Early middleware
 * app.use(enforceHTTPS);
 * app.use(securityHeaders);
 * app.use(nonceMiddleware);
 * app.use(improvedCSP);
 *
 * // Session
 * app.use(session(secureSessionConfig));
 *
 * // Routes with rate limiting
 * app.use('/auth', authRateLimiter, authRoutes);
 * app.use('/upload', uploadRateLimiter, uploadRoutes);
 * app.use('/forecast', forecastRateLimiter, forecastRoutes);
 * app.use('/api', apiRateLimiter, apiRoutes);
 *
 * // Error handler (last)
 * app.use(errorHandler);
 */

module.exports = {
    secureSessionConfig,
    nonceMiddleware,
    improvedCSP,
    authRateLimiter,
    uploadRateLimiter,
    forecastRateLimiter,
    apiRateLimiter,
    securityHeaders,
    validateFilePath,
    validateUserId,
    sanitizeFilename,
    enforceHTTPS,
    errorHandler,
    auditLog
};
