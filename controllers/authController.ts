// Auth Controller - TypeScript Version
// Handles authentication, login, logout, and SSO callbacks

import { Request, Response } from 'express';
import { createUserIfNotExists } from '../services/userService';
import { logAuth } from '../utils/securityLogger';
import { User } from '../types';

/**
 * Login handler
 * Validates email domain, creates/retrieves user, and establishes session
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        // 1. Validate domain
        if (!email || !email.toLowerCase().endsWith('@ .com')) {
            logAuth('login_failure', { success: false, reason: 'Invalid domain', email });
            res.redirect('/?error=' + encodeURIComponent('Invalid email domain. Only @ .com is allowed.'));
            return;
        }

        const validEmail: string = email.toLowerCase();

        // 2. Check/Create User
        const user = await createUserIfNotExists(validEmail, {
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': validEmail.split('@')[0] // Fallback name
        }) as User | null;

        if (!user) {
            throw new Error('Failed to create or retrieve user');
        }

        // 3. Login / Session Management
        req.session.regenerate((err: any) => {
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

            // Save session before redirect
            req.session.save((saveErr: any) => {
                if (saveErr) {
                    console.error('Session save error:', saveErr);
                    res.redirect('/?error=Authentication%20error');
                    return;
                }

                logAuth('login_success', { success: true, email: validEmail, userId: user.id });
                res.redirect('/upload');
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        logAuth('login_error', { success: false, reason: (error as Error).message });
        res.redirect('/?error=An%20error%20occurred');
    }
};

/**
 * Logout handler
 * Clears session data and destroys session
 */
export const logout = (req: Request, res: Response): void => {
    // Clear session data
    req.logout((err: any) => {
        if (err) {
            console.error('Logout error:', err);
        }

        // Destroy the session completely
        req.session.destroy((destroyErr: any) => {
            if (destroyErr) {
                console.error('Session destroy error:', destroyErr);
            }

            // Clear the session cookie
            res.clearCookie('connect.sid');

            // Redirect to home page
            res.redirect('/');
        });
    });
};

/**
 * SSO Callback handler
 * Handles redirect after successful SSO authentication
 */
export const ssoCallback = (_req: Request, res: Response): void => {
    res.redirect('/'); // Redirect to dashboard or home
};
