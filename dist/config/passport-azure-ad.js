// Azure AD Passport Strategy Configuration
// This file configures Passport.js to use Azure Active Directory for authentication

const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const { createModuleLogger } = require('../utils/debugLogger');
const log = createModuleLogger('passport-Azure'); // Use your module name

module.exports = function (passport) {
    // Azure AD configuration
    const azureConfig = {
        // Identity metadata endpoint for token validation
        identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA ||
            `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,

        // Your application's client ID from Azure AD
        clientID: process.env.AZURE_AD_CLIENT_ID,

        // Your application's client secret from Azure AD
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,

        // Where Azure AD should redirect after authentication
        redirectUrl: process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:3000/auth/azure/callback',

        // Allow HTTP for development (set to false in production)
        allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',

        // Response type - use 'code' for authorization code flow (most secure)
        responseType: 'code',

        // Response mode
        responseMode: 'form_post',

        // Scopes to request from Azure AD
        scope: ['openid', 'profile', 'email'],

        // Validate issuer to prevent token substitution attacks
        validateIssuer: true,

        // Issuer URL - should match your tenant
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,

        // Enable this for detailed logging (development only)
        loggingLevel: process.env.NODE_ENV === 'development' ? 'info' : 'error',

        // Pass request to callback for additional context
        passReqToCallback: true,

        // Cookie encryption keys (for state parameter)
        cookieEncryptionKeys: [
            {
                'key': process.env.COOKIE_ENCRYPTION_KEY || process.env.SESSION_SECRET,
                'iv': process.env.COOKIE_IV || '12345678'
            }
        ],

        // Use nonce in the authentication flow
        nonceLifetime: 600, // 10 minutes

        // Clock skew in seconds
        clockSkew: 300 // 5 minutes
    };

    // Verify callback - called after successful authentication
    const verifyCallback = async (req, iss, sub, profile, accessToken, refreshToken, done) => {
        try {
            // Validate the profile
            if (!profile) {
                return done(new Error('No profile returned from Azure AD'));
            }

            // Extract user information from the profile
            const user = {
                // Azure AD user ID (unique identifier)
                id: profile.oid || profile.sub,

                // Email - try multiple possible claims
                email: profile.email ||
                       profile.upn ||
                       profile.preferred_username ||
                       (profile._json && profile._json.email),

                // Display name
                name: profile.displayName || profile.name || 'Unknown User',

                // First and last name if available
                firstName: profile.name?.givenName || profile.given_name,
                lastName: profile.name?.familyName || profile.family_name,

                // Roles from Azure AD (if configured)
                roles: profile.roles || [],

                // Additional Azure AD info
                tenantId: profile.tid,

                // Store tokens if needed for API calls
                accessToken: accessToken,
                refreshToken: refreshToken,

                // Profile object for debugging (remove in production)
                _profile: process.env.NODE_ENV === 'development' ? profile : undefined
            };

            // Validate required fields
            if (!user.email) {
                log.error('Azure AD profile missing email:', profile);
                return done(new Error('User profile must include an email address'));
            }

            // Log successful authentication (development)
            if (process.env.NODE_ENV === 'development') {
                log.debug('Azure AD authentication successful:', {
                    email: user.email,
                    name: user.name,
                    roles: user.roles
                });
            }

            // Return user object to be stored in session
            return done(null, user);

        } catch (error) {
            log.error('Azure AD verification error:', error);
            return done(error);
        }
    };

    // Configure the OIDC strategy
    passport.use('azure-ad', new OIDCStrategy(azureConfig, verifyCallback));

    // Serialize user for session storage
    passport.serializeUser((user, done) => {
        // Only store minimal user info in session
        done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles
        });
    });

    // Deserialize user from session
    passport.deserializeUser((user, done) => {
        // In production, you might want to fetch fresh user data from database
        // For now, just return the session data
        done(null, user);
    });

    log.debug('Azure AD Passport strategy configured');
};
