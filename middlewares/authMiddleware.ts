// Authentication Middleware - Enhanced with Security Logging
import { Request, Response, NextFunction } from 'express';
import { logSecurityViolation } from '../utils/securityLogger';

/**
 * Require authentication for routes
 * Redirects to login page if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    // Check session-based authentication
    if (req.session && req.session.user) {
        return next();
    }

    // Check passport authentication (fallback)
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    logSecurityViolation('unauthorized_access_attempt', {
        path: req.path,
        method: req.method
    }, req);

    // Redirect to login for browser requests
    if (req.accepts('html')) {
        res.redirect('/auth/login');
        return;
    }

    // Return JSON for API requests
    res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
    });
}

/**
 * Require authentication for API routes
 * Returns JSON error if not authenticated
 */
export function requireAuthAPI(req: Request, res: Response, next: NextFunction): void {
    if (req.session && req.session.user) {
        return next();
    }

    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    logSecurityViolation('unauthorized_api_access_attempt', {
        path: req.path,
        method: req.method
    }, req);

    res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
    });
}

/**
 * Optional authentication
 * Continues even if not authenticated, but sets req.user if authenticated
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    } else if (req.user) {
        // Already set by passport
    }
    next();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(req: Request): boolean {
    return (req.session && !!req.session.user) || (req.isAuthenticated && req.isAuthenticated());
}

/**
 * Get current user from session
 */
export function getCurrentUser(req: Request): Express.User | null {
    return req.session?.user || req.user || null;
}

/**
 * Get current user ID from session
 */
export function getUserId(req: Request): number | undefined | null {
    return req.session?.user?.id || (req.user as any)?.id || null;
}

// Backward compatibility - default export
export default requireAuth;

// Named exports alias
export const ensureAuthenticated = requireAuth;
