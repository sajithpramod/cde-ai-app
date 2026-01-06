"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ssoCallback = exports.logout = exports.login = void 0;
const userService_1 = require("../services/userService");
const securityLogger_1 = require("../utils/securityLogger");
const login = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.toLowerCase().endsWith('@ .com')) {
            (0, securityLogger_1.logAuth)('login_failure', { success: false, reason: 'Invalid domain', email });
            res.redirect('/?error=' + encodeURIComponent('Invalid email domain. Only @ .com is allowed.'));
            return;
        }
        const validEmail = email.toLowerCase();
        const user = await (0, userService_1.createUserIfNotExists)(validEmail, {
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': validEmail.split('@')[0]
        });
        if (!user) {
            throw new Error('Failed to create or retrieve user');
        }
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                res.redirect('/?error=Authentication%20error');
                return;
            }
            req.session.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            };
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Session save error:', saveErr);
                    res.redirect('/?error=Authentication%20error');
                    return;
                }
                (0, securityLogger_1.logAuth)('login_success', { success: true, email: validEmail, userId: user.id });
                res.redirect('/upload');
            });
        });
    }
    catch (error) {
        console.error('Login error:', error);
        (0, securityLogger_1.logAuth)('login_error', { success: false, reason: error.message });
        res.redirect('/?error=An%20error%20occurred');
    }
};
exports.login = login;
const logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        req.session.destroy((destroyErr) => {
            if (destroyErr) {
                console.error('Session destroy error:', destroyErr);
            }
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
};
exports.logout = logout;
const ssoCallback = (_req, res) => {
    res.redirect('/');
};
exports.ssoCallback = ssoCallback;
//# sourceMappingURL=authController.js.map