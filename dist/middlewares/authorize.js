"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
exports.authorizeOwner = authorizeOwner;
exports.authorizeAny = authorizeAny;
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('auth');
function authorize(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            res.status(401).json({
                error: 'Not authenticated',
                message: 'Please log in to access this resource'
            });
            return;
        }
        const user = req.session.user;
        if (allowedRoles.length === 0) {
            return next();
        }
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
        next();
    };
}
function authorizeOwner(getResourceOwnerId) {
    return async (req, res, next) => {
        if (!req.session || !req.session.user) {
            res.status(401).json({
                error: 'Not authenticated'
            });
            return;
        }
        const user = req.session.user;
        if (user.role === 'admin') {
            return next();
        }
        try {
            const ownerId = await getResourceOwnerId(req);
            if (user.id !== ownerId) {
                log.debug(`Ownership check failed for ${user.email}: resource owned by user ${ownerId}`);
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'You can only access your own resources'
                });
                return;
            }
            next();
        }
        catch (error) {
            log.error('Authorization error:', { reason: error });
            res.status(500).json({
                error: 'Authorization check failed'
            });
        }
    };
}
function authorizeAny(middlewares) {
    return async (req, res, next) => {
        let lastError = null;
        for (const middleware of middlewares) {
            try {
                await new Promise((resolve, reject) => {
                    middleware(req, res, ((err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    }));
                });
                return next();
            }
            catch (error) {
                lastError = error;
            }
        }
        if (lastError) {
            return next(lastError);
        }
        res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this resource'
        });
    };
}
//# sourceMappingURL=authorize.js.map