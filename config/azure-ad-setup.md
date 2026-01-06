# Azure AD SSO Integration Guide

## Overview
This guide provides step-by-step instructions for integrating Azure Active Directory (Azure AD) Single Sign-On (SSO) with the Occasion Forecasting application.

## Prerequisites
- Azure AD tenant with administrative access
- Application registered in Azure Portal
- Node.js application with Express and Passport

## Step 1: Azure AD App Registration

### 1.1 Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations** > **New registration**
3. Configure the application:
   - **Name**: `Occasion Forecasting App`
   - **Supported account types**:
     - Select "Accounts in this organizational directory only" (single tenant)
     - OR "Accounts in any organizational directory" (multi-tenant) if needed
   - **Redirect URI**:
     - Type: `Web`
     - URI: `https://your-domain.com/auth/azure/callback`
     - For development: `http://localhost:3000/auth/azure/callback`

4. Click **Register**

### 1.2 Configure Authentication

1. Go to **Authentication** in your app registration
2. Under **Implicit grant and hybrid flows**, enable:
   - ✅ ID tokens (used for implicit and hybrid flows)
3. Under **Advanced settings**:
   - Allow public client flows: **No**
4. Click **Save**

### 1.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `Occasion Forecasting Production Secret`
4. Expires: Choose appropriate expiration (recommended: 12 months)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (you won't see it again)
7. Store securely in your secrets management system

### 1.4 Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - `User.Read` (Sign in and read user profile)
   - `email` (View users' email address)
   - `profile` (View users' basic profile)
   - `openid` (Sign users in)
6. Click **Add permissions**
7. Click **Grant admin consent** (if you have admin rights)

### 1.5 Collect Configuration Values

From your app registration, collect these values:

- **Application (client) ID**: Found on Overview page
- **Directory (tenant) ID**: Found on Overview page
- **Client Secret**: The value you copied in step 1.3
- **Redirect URI**: The callback URL you configured

## Step 2: Install Required Dependencies

```bash
npm install passport-azure-ad
```

Current dependencies already installed:
- passport v0.7.0 ✓
- express-session v1.17.3 ✓

## Step 3: Environment Configuration

Add these variables to your `.env` file:

```env
# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-application-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret-value
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_REDIRECT_URI=https://your-domain.com/auth/azure/callback

# Azure AD Endpoints
AZURE_AD_IDENTITY_METADATA=https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration

# Session Configuration (already exists, but ensure these are set)
SESSION_SECRET=<generate-strong-random-secret-here>
NODE_ENV=production
```

### Generating a Strong Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 4: Implementation Files

### 4.1 Create Azure AD Strategy Configuration

Create file: `config/passport-azure-ad.js`

See the implementation in the companion file `passport-azure-ad.js`

### 4.2 Update Server Configuration

Modify `server.js` to initialize the Azure AD strategy:

```javascript
// Add near top of file
const configureAzureAD = require('./config/passport-azure-ad');

// Initialize Azure AD (after session middleware, before routes)
configureAzureAD(passport);
```

### 4.3 Update Authentication Routes

The routes have been prepared in `routes/auth.js`. When ready to enable:

1. Uncomment the Azure AD login route:
```javascript
router.get('/login', passport.authenticate('azure-ad', { failureRedirect: '/', failureFlash: true }));
```

2. Comment out or remove the temporary dev login

3. Update the callback route to use 'azure-ad' strategy:
```javascript
router.post('/auth/azure/callback',
    passport.authenticate('azure-ad', { failureRedirect: '/', failureFlash: true }),
    (req, res) => {
        if (req.user) {
            req.session.user = {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                roles: req.user.roles || []
            };
        }
        res.redirect('/dashboard');
    }
);
```

## Step 5: User Provisioning

### 5.1 Database User Management

When a user logs in via Azure AD for the first time, you need to:

1. Check if user exists in `users` table
2. If not, create a new user record
3. Map Azure AD user to application user

Create file: `services/userService.js` (see companion file)

### 5.2 Update Authentication Callback

Modify the callback to provision users:

```javascript
const userService = require('../services/userService');

router.post('/auth/azure/callback',
    passport.authenticate('azure-ad', { failureRedirect: '/', failureFlash: true }),
    async (req, res) => {
        if (req.user) {
            try {
                // Find or create user in database
                const user = await userService.findOrCreateUser({
                    email: req.user.email,
                    name: req.user.name,
                    azureId: req.user.id
                });

                req.session.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                };

                res.redirect('/dashboard');
            } catch (error) {
                console.error('User provisioning error:', error);
                res.redirect('/?error=auth_failed');
            }
        } else {
            res.redirect('/?error=no_user');
        }
    }
);
```

## Step 6: Testing

### 6.1 Local Testing

1. Update `.env` with development values:
```env
AZURE_AD_REDIRECT_URI=http://localhost:3000/auth/azure/callback
```

2. Add `http://localhost:3000/auth/azure/callback` to Azure AD app registration

3. Start the application:
```bash
npm start
```

4. Navigate to `http://localhost:3000/login`

5. You should be redirected to Microsoft login page

### 6.2 Test Checklist

- [ ] Login redirects to Microsoft login page
- [ ] Successful authentication redirects to dashboard
- [ ] User session is properly set
- [ ] User record is created in database
- [ ] Logout clears session and redirects correctly
- [ ] Failed authentication redirects to home with error
- [ ] Token refresh works for long sessions

## Step 7: Security Hardening

### 7.1 Session Security

Ensure these settings in `server.js`:

```javascript
session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        maxAge: 1800000 // 30 minutes (reduced from 3 hours)
    }
})
```

### 7.2 HTTPS Enforcement

In production, enforce HTTPS:

```javascript
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

### 7.3 Rate Limiting on Auth Routes

Add to `routes/auth.js`:

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later.'
});

router.get('/login', authLimiter, passport.authenticate('azure-ad', ...));
```

## Step 8: Role-Based Access Control (RBAC)

### 8.1 Azure AD App Roles

1. In Azure Portal, go to your app registration
2. Navigate to **App roles** > **Create app role**
3. Create roles:

**Admin Role:**
- Display name: `Administrator`
- Allowed member types: `Users/Groups`
- Value: `admin`
- Description: `Full access to all features`

**User Role:**
- Display name: `User`
- Allowed member types: `Users/Groups`
- Value: `user`
- Description: `Standard user access`

4. Assign users to roles in **Enterprise applications** > **Users and groups**

### 8.2 Extract Roles from Token

Update `config/passport-azure-ad.js`:

```javascript
// In the verify callback
passReqToCallback: true,
async (req, profile, done) => {
    try {
        const user = {
            id: profile.oid,
            email: profile.email || profile.upn,
            name: profile.displayName,
            roles: profile.roles || [] // Extract roles from token
        };
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}
```

### 8.3 Authorization Middleware

Create `middlewares/authorize.js`:

```javascript
function authorize(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userRoles = req.session.user.roles || [];
        const hasPermission = allowedRoles.some(role => userRoles.includes(role));

        if (!hasPermission && allowedRoles.length > 0) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

module.exports = authorize;
```

Usage:
```javascript
const authorize = require('../middlewares/authorize');

router.get('/admin/reports', authorize(['admin']), (req, res) => {
    // Only admins can access
});
```

## Step 9: Migration Plan

### 9.1 User Migration Strategy

If you have existing users:

1. **Email Matching**: Match Azure AD users to existing database users by email
2. **Add Azure ID Column**: Add `azure_id` column to `users` table
3. **Migration Script**: Link existing users to Azure AD accounts on first login

```sql
-- Migration
ALTER TABLE users ADD COLUMN azure_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
```

### 9.2 Phased Rollout

**Phase 1: Parallel Authentication**
- Keep dev login active
- Test Azure AD with specific users
- Monitor logs and errors

**Phase 2: Gradual Migration**
- Migrate users department by department
- Provide support documentation
- Monitor authentication metrics

**Phase 3: Full Cutover**
- Remove dev login route
- Force all users to Azure AD
- Update documentation

## Step 10: Monitoring & Logging

### 10.1 Authentication Events to Log

```javascript
// In auth routes
router.post('/auth/azure/callback',
    passport.authenticate('azure-ad', { failureRedirect: '/', failureFlash: true }),
    async (req, res) => {
        // Log successful authentication
        console.log({
            event: 'authentication_success',
            user_email: req.user.email,
            timestamp: new Date().toISOString(),
            ip: req.ip
        });

        // ... rest of handler
    }
);

// Log failures
passport.authenticate('azure-ad', {
    failureRedirect: '/',
    failureFlash: true,
    failureCallback: (err, user) => {
        console.error({
            event: 'authentication_failure',
            error: err,
            timestamp: new Date().toISOString(),
            ip: req.ip
        });
    }
});
```

### 10.2 Metrics to Monitor

- Authentication success/failure rate
- New user provisioning
- Session duration
- Token refresh failures
- Authorization denials

## Troubleshooting

### Common Issues

**Issue**: "AADSTS50011: The reply URL specified in the request does not match"
**Solution**: Verify redirect URI in Azure AD exactly matches your application

**Issue**: "AADSTS700016: Application not found in the directory"
**Solution**: Check AZURE_AD_CLIENT_ID and AZURE_AD_TENANT_ID are correct

**Issue**: User profile missing email
**Solution**: Ensure API permissions include 'email' scope and admin consent is granted

**Issue**: Session not persisting
**Solution**: Check session secret is set and cookies are enabled

## Resources

- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [passport-azure-ad GitHub](https://github.com/AzureAD/passport-azure-ad)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

## Support Contacts

- Azure AD Admin: [contact info]
- Application Support: [contact info]
- IT Security Team: [contact info]
