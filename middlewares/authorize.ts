// Authorization Middleware for Role-Based Access Control (RBAC)

import { Request, Response, NextFunction } from 'express';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('auth');

/**
 * Middleware to check if user has required role(s)
 * @param allowedRoles - Array of roles that can access the route
 * @returns Express middleware function
 *
 * Usage:
 * router.get('/admin/users', authorize(['admin']), (req, res) => {...});
 * router.post('/reports', authorize(['admin', 'user']), (req, res) => {...});
 */
export function authorize(allowedRoles: string[] = []) {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            res.status(401).json({
                error: 'Not authenticated',
                message: 'Please log in to access this resource'
            });
            return;
        }

        const user = req.session.user;

        // If no specific roles required, just check authentication
        if (allowedRoles.length === 0) {
            return next();
        }

        // Check if user has one of the allowed roles
        const userRole = user.role || 'user';
        const hasPermission = allowedRoles.includes(userRole);

        if (!hasPermission) {
            log.debug(`Authorization denied for ${user.email}: required ${allowedRoles.join(' or ')}, has ${userRole}`);
            res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to access this resource'
            });
            return;
        }

        // User has permission, proceed
        next();
    };
}

/**
 * Middleware to check if user owns the resource
 * @param getResourceOwnerId - Function that extracts owner ID from request
 * @returns Express middleware function
 *
 * Usage:
 * router.delete('/forecast/:id',
 *   authorizeOwner(async (req) => {
 *     const forecast = await db('user_forecast_progress').where({id: req.params.id}).first();
 *     return forecast.user_id;
 *   }),
 *   (req, res) => {...}
 * );
 */
export function authorizeOwner(getResourceOwnerId: (req: Request) => Promise<number | undefined>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Check if user is authenticated
        if (!req.session || !req.session.user) {
            res.status(401).json({
                error: 'Not authenticated'
            });
            return;
        }

        const user = req.session.user;

        // Admins can access everything
        if (user.role === 'admin') {
            return next();
        }

        try {
            // Get the resource owner ID
            const ownerId = await getResourceOwnerId(req);

            // Check if user is the owner
            if (user.id !== ownerId) {
                log.debug(`Ownership check failed for ${user.email}: resource owned by user ${ownerId}`);
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'You can only access your own resources'
                });
                return;
            }

            next();
        } catch (error) {
            log.error('Authorization error:', { reason: error });
            res.status(500).json({
                error: 'Authorization check failed'
            });
        }
    };
}

/**
 * Middleware to check multiple conditions
 * User must satisfy ALL conditions
 *
 * Usage:
 * router.post('/forecast/:id/publish',
 *   authorizeAny([
 *     authorize(['admin']),
 *     authorizeOwner(getForecastOwnerId)
 *   ]),
 *   (req, res) => {...}
 * );
 */
export function authorizeAny(middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        let lastError: unknown = null;

        for (const middleware of middlewares) {
            try {
                // Try each middleware
                await new Promise<void>((resolve, reject) => {
                    middleware(req, res, ((err?: unknown) => {
                        if (err) reject(err);
                        else resolve();
                    }) as NextFunction);
                });
                // If any middleware succeeds, allow access
                return next();
            } catch (error) {
                lastError = error;
                // Continue to next middleware
            }
        }

        // All middlewares failed
        if (lastError) {
            return next(lastError);
        }

        res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this resource'
        });
    };
}
