// Secured Server Entry Point - Occasion Forecasting Application
// Security improvements implemented: Nov 2025
// Migrated to TypeScript: Jan 2026

import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/.env' });

import { createModuleLogger } from './utils/debugLogger';
const log: any = createModuleLogger('server');

import express, { Request, Response, NextFunction, Application } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import helmet from 'helmet';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SamlStrategy, Profile as SamlProfile } from '@node-saml/passport-saml';
import expressLayouts from 'express-ejs-layouts';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Security modules
import { getUserByEmail, createUserIfNotExists } from './services/userService';
import { logger, logError, logAuth, logSecurityViolation } from './utils/securityLogger';

// CSRF Protection
import csrf from '@dr.pogodin/csurf';

// Type definitions
interface User {
    id?: number;
    email: string;
    [key: string]: any;
}

interface AuthenticatedSocket extends Socket {
    user?: User;
    clientIp?: string;
}

declare global {
    namespace Express {
        interface Request {
            rateLimit?: {
                resetTime: number;
            };
        }
        interface Response {
            locals: {
                nonce: string;
                [key: string]: any;
            };
        }
    }
}

const app: Application = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS to match Express CORS
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT: number = parseInt(process.env.PORT || '3000', 10);

// ============================================
// TRUST PROXY (for rate limiting and logging)
// ============================================
app.set('trust proxy', 1);

// ============================================
// VIEW ENGINE
// ============================================
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// SECURITY: NONCE GENERATION FOR CSP
// ============================================
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// ============================================
// SECURITY: HTTPS ENFORCEMENT (Production)
// ============================================
if (process.env.NODE_ENV === 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
        next();
    });
}

// ============================================
// SECURITY: CONTENT SECURITY POLICY
// ============================================
app.use((req: Request, res: Response, next: NextFunction) => {
    const nonce = res.locals.nonce;

    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                `'nonce-${nonce}'`,
                "https://cdn.plot.ly",
                "https://cdn.jsdelivr.net",
                "https://code.jquery.com",
                "https://cdn.datatables.net"
            ],
            styleSrc: [
                "'self'",
                `'nonce-${nonce}'`,
                "https://cdn.datatables.net",
                "https://fonts.googleapis.com"
            ],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            frameSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"],
            workerSrc: ["'self'", "blob:"]
        },
    })(req, res, next);
});

// ============================================
// SECURITY: ADDITIONAL HEADERS
// ============================================
app.use((_req: Request, res: Response, next: NextFunction) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // HSTS - Force HTTPS
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking - allow same-origin iframes
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy - disable unnecessary features
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Cross-origin policies for better isolation
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
});

// ============================================
// COMPRESSION
// ============================================
app.use(compression());

// ============================================
// CORS CONFIGURATION
// ============================================
app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowed: string[] = [
            process.env.CLIENT_ORIGIN || 'http://localhost:3000'
        ];

        // Allow requests with no origin (same-origin requests like direct browser navigation)
        if (!origin) {
            return callback(null, true);
        }

        // In production, only allow explicitly whitelisted origins
        if (process.env.NODE_ENV === 'production') {
            if (allowed.includes(origin)) {
                return callback(null, true);
            } else {
                logSecurityViolation('cors_violation', { origin }, { ip: 'unknown' } as any);
                return callback(new Error('Not allowed by CORS'));
            }
        }

        // In development, allow all origins
        callback(null, true);
    },
    credentials: true
}));

// ============================================
// COOKIE PARSER
// ============================================
app.use(cookieParser());

// ============================================
// SECURITY: SESSION MANAGEMENT (HARDENED)
// ============================================

// Validate SESSION_SECRET in production
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'default_secret' || process.env.SESSION_SECRET.length < 32)) {
    logger.error('CRITICAL: SESSION_SECRET must be set to a strong value (min 32 characters) in production');
    process.exit(1);
}

const sessionTimeoutMinutes: number = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '90', 10);
const sessionTimeoutMs: number = sessionTimeoutMinutes * 60 * 1000;

// Create a single session middleware instance
const expressSession = session({
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: sessionTimeoutMs,
    },
    rolling: true,
    proxy: true
});

// Use the session middleware in Express
app.use(expressSession);

// ============================================
// PASSPORT INITIALIZATION
// ============================================
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user: any, done: (err: any, id?: any) => void) => done(null, user));
passport.deserializeUser((user: any, done: (err: any, user?: any) => void) => done(null, user));

// ============================================
// SAML STRATEGY CONFIGURATION
// ============================================
let idpCert: string | null = process.env.SSO_IDP_CERT_BASE64
    ? Buffer.from(process.env.SSO_IDP_CERT_BASE64, 'base64').toString('utf8').trim()
    : null;

if (idpCert && !idpCert.includes('BEGIN CERTIFICATE')) {
    try {
        idpCert = Buffer.from(idpCert, 'base64').toString('utf8');
    } catch (err) {
        logger.error('Failed to decode base64 certificate', { error: (err as Error).message });
    }
}

// Only configure SAML if certificate is present
if (idpCert) {
    const samlStrategy: any = new (SamlStrategy as any)(
        {
            entryPoint: process.env.SSO_ENTRY_POINT!,
            issuer: process.env.SSO_ISSUER!,
            callbackUrl: process.env.SSO_CALLBACK_URL!,
            idpCert: idpCert,
            acceptedClockSkewMs: 5000,
            disableRequestedAuthnContext: true,
            identifierFormat: null,
            forceAuthn: true,
            validateInResponseTo: 'always',
            requestIdExpirationPeriodMs: 3600000,
            cacheProvider: {
                save: (_key: string, _value: string, callback: (err: Error | null, result: any) => void) =>
                    callback(null, null),
                get: (_key: string, callback: (err: Error | null, result: any) => void) =>
                    callback(null, null),
                remove: (_key: string, callback: (err: Error | null, result: any) => void) =>
                    callback(null, null)
            },
        },
        async (profile: SamlProfile, done: (err: Error | null, user?: any) => void) => {
            try {
                const email = profile.nameID;

                if (!email) {
                    logAuth('login_failure', { success: false, reason: 'Missing email' });
                    return done(new Error('Missing SAML email/nameID'), false);
                }

                let user = await getUserByEmail(email);

                if (!user) {
                    user = await createUserIfNotExists(email, profile);
                }

                logAuth('login_success', { success: true, email });
                return done(null, user);
            } catch (err) {
                logAuth('login_error', { success: false, reason: (err as Error).message });
                return done(err as Error);
            }
        }
    );
    passport.use('saml', samlStrategy);
}

// ============================================
// BODY PARSERS
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// INPUT SANITIZATION
// ============================================
import { sanitizeInputs } from './middlewares/inputValidation';
app.use(sanitizeInputs);

// ============================================
// SECURITY: CSRF PROTECTION
// ============================================
const csrfProtection = csrf({
    cookie: {
        key: '_csrf',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req: Request): string => {
        return (
            req.body._csrf ||
            req.query._csrf as string ||
            req.headers['csrf-token'] as string ||
            req.headers['xsrf-token'] as string ||
            req.headers['x-csrf-token'] as string ||
            req.headers['x-xsrf-token'] as string ||
            ''
        );
    }
});

// Apply CSRF protection globally
app.use(csrfProtection);

// CSRF Token Route
app.get('/csrf-token', (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken?.() || '' });
});

// ============================================
// STATIC FILES
// ============================================
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

// Global rate limiter
const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        const { logRateLimit } = require('./utils/securityLogger');
        logRateLimit(req, 'global');
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: Math.ceil((req.rateLimit!.resetTime - Date.now()) / 1000)
        });
    }
});

// Auth endpoints rate limiter
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many authentication attempts',
    skipSuccessfulRequests: false,
    handler: (req: Request, res: Response) => {
        const { logRateLimit } = require('./utils/securityLogger');
        logRateLimit(req, 'auth');
        res.status(429).json({
            error: 'Too many authentication attempts',
            message: 'Please try again later',
            retryAfter: Math.ceil((req.rateLimit!.resetTime - Date.now()) / 1000)
        });
    }
});

// Upload endpoints rate limiter
const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.UPLOAD_RATE_LIMIT || '30', 10),
    message: 'Too many upload requests'
});

// Forecast endpoints rate limiter
const forecastRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.FORECAST_RATE_LIMIT || '10', 10),
    message: 'Too many forecast requests'
});

// API endpoints rate limiter
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many API requests'
});

// Apply global rate limiter
app.use(globalRateLimiter);

// ============================================
// PATH TRAVERSAL PROTECTION
// ============================================
app.use((req: Request, res: Response, next: NextFunction): any => {
    const fullPath = decodeURIComponent(req.path || '');

    if (fullPath.length > 1000) {
        return res.status(414).json({ success: false, error: "Request URI too long" });
    }

    const suspiciousPatterns: RegExp[] = [
        /\.\.\//,
        /\/\.\.\//,
        /%2e%2e/i,
        /%252e%252e/i,
        /etc\/passwd/i,
        /windows\/system32/i,
        /.env/i,
        /.git/i,
        /.htaccess/i,
        /.DS_Store/i,
        /\0/,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullPath)) {
            return res.status(400).json({
                success: false,
                error: "Invalid request path"
            });
        }
    }

    if (/\.js$/i.test(fullPath) && !fullPath.startsWith('/public/')) {
        return res.status(403).json({ success: false, error: "Forbidden resource" });
    }

    next();
});

// ============================================
// HOME ROUTE
// ============================================
app.get('/', (req: Request, res: Response) => {
    res.render('index', {
        title: 'Home Page',
        csrfToken: req.csrfToken?.() || '',
        error: req.query.error
    });
});

// ============================================
// ROUTES WITH RATE LIMITING
// ============================================
app.use('/auth', authRateLimiter, require('./routes/auth'));
app.use('/upload', uploadRateLimiter, require('./routes/upload')(io));
app.use('/forecast', forecastRateLimiter, require('./routes/forecast')(io));
app.use('/markets', apiRateLimiter, require('./routes/markets'));
app.use('/reports', apiRateLimiter, require('./routes/reports'));
app.use('/dashboard', apiRateLimiter, require('./routes/dashboard'));
app.use('/files', apiRateLimiter, require('./routes/files.js'));

// ============================================
// WEBSOCKET AUTHENTICATION
// ============================================
io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    const req = socket.request as any;
    const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

    if (log && typeof log.debug === 'function') {
        log.debug('WebSocket auth attempt', {
            socketId: socket.id,
            ip: clientIp,
            origin: req.headers.origin
        });
    }

    const cookieHeader = req.headers && req.headers.cookie;
    if (!cookieHeader) {
        logSecurityViolation('websocket_auth_failure', {
            reason: 'No session cookie',
            socketId: socket.id
        }, { ip: clientIp } as any);
        return next(new Error('Authentication required'));
    }

    cookieParser()(req, {} as Response, (err?: any) => {
        if (err) {
            logSecurityViolation('websocket_auth_failure', {
                reason: 'Cookie parse error',
                error: err.message,
                socketId: socket.id
            }, { ip: clientIp } as any);
            return next(new Error('Authentication failed'));
        }

        expressSession(req, {} as Response, (err?: any) => {
            if (err) {
                logSecurityViolation('websocket_auth_failure', {
                    reason: 'Session load error',
                    error: err.message,
                    socketId: socket.id
                }, { ip: clientIp } as any);
                return next(new Error('Authentication failed'));
            }

            const user = req.session?.user || req.session?.passport?.user;

            if (!user) {
                logSecurityViolation('websocket_auth_failure', {
                    reason: 'No valid user session',
                    socketId: socket.id,
                    sessionId: req.sessionID
                }, { ip: clientIp } as any);
                return next(new Error('Authentication required'));
            }

            socket.user = user;
            socket.clientIp = clientIp;

            logAuth('websocket_connected', {
                success: true,
                userId: user.id || user.email,
                socketId: socket.id,
                ip: clientIp
            });

            return next();
        });
    });
});

io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('WebSocket client connected', {
        socketId: socket.id,
        userId: socket.user?.id || socket.user?.email
    });

    socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', {
            socketId: socket.id,
            userId: socket.user?.id || socket.user?.email
        });
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req: Request, res: Response) => {
    logger.warn('404 Not Found', { path: req.path, ip: req.ip });
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: {}
    });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logError(err, { path: req.path, method: req.method }, req as any);

    const statusCode = err.statusCode || err.status || 500;

    const errorResponse: any = {
        error: true,
        message: process.env.NODE_ENV === 'production'
            ? 'An error occurred'
            : err.message
    };

    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode);

    if (req.accepts('html')) {
        res.render('error', {
            title: 'Error',
            message: errorResponse.message,
            error: process.env.NODE_ENV === 'production' ? {} : err
        });
    } else {
        res.json(errorResponse);
    }
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    });
    if (log && typeof log.info === 'function') {
        log.info(`✓ Server running at http://localhost:${PORT}`);
        log.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        log.info(`✓ Session timeout: ${sessionTimeoutMinutes} minutes`);
        log.info(`✓ CSRF protection: Enabled`);
        log.info(`✓ Rate limiting: Enabled`);
        log.info(`✓ Security logging: Enabled`);
    }
});

// Set server timeout
const serverTimeout: number = parseInt(process.env.SERVER_TIMEOUT || '14400000', 10);
server.timeout = serverTimeout;
server.keepAliveTimeout = serverTimeout;
server.headersTimeout = serverTimeout + 5000;
if (log && typeof log.info === 'function') {
    log.info(`✓ Server timeout: ${serverTimeout / 1000 / 60} minutes`);
}

export { app, server, io };
