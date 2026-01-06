// auth routes
// forecasting-app/routes/auth.ts
import express, { Router } from 'express';
import * as authController from '../controllers/authController';

const router: Router = express.Router();

// TODO: Replace with Azure AD SSO - see config/azure-ad-setup.md for integration guide
// Email-based login route (Replaces SSO)
router.post('/login', authController.login);

// SSO routes reserved for future use or cleanup
/*
router.get('/login', passport.authenticate('azure-ad', { failureRedirect: '/', failureFlash: true }));
router.post(
    '/sso/callback',
    passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }),
    (req, res) => {
         // ... SSO callback logic ...
    }
);
*/

// Logout route - clears session and redirects to home
// Once SSO is integrated, this can be updated to handle SSO logout
router.get('/logout', authController.logout);

export = router;
