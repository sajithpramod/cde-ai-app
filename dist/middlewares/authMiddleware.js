"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuthenticated = void 0;
exports.requireAuth = requireAuth;
exports.requireAuthAPI = requireAuthAPI;
exports.optionalAuth = optionalAuth;
exports.isAuthenticated = isAuthenticated;
exports.getCurrentUser = getCurrentUser;
exports.getUserId = getUserId;
const securityLogger_1 = require("../utils/securityLogger");
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    (0, securityLogger_1.logSecurityViolation)('unauthorized_access_attempt', {
        path: req.path,
        method: req.method
    }, req);
    if (req.accepts('html')) {
        res.redirect('/auth/login');
        return;
    }
    res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
    });
}
function requireAuthAPI(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    (0, securityLogger_1.logSecurityViolation)('unauthorized_api_access_attempt', {
        path: req.path,
        method: req.method
    }, req);
    res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
    });
}
function optionalAuth(req, _res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    else if (req.user) {
    }
    next();
}
function isAuthenticated(req) {
    return (req.session && !!req.session.user) || (req.isAuthenticated && req.isAuthenticated());
}
function getCurrentUser(req) {
    return req.session?.user || req.user || null;
}
function getUserId(req) {
    return req.session?.user?.id || req.user?.id || null;
}
exports.default = requireAuth;
exports.ensureAuthenticated = requireAuth;
//# sourceMappingURL=authMiddleware.js.map