"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: __dirname + '/.env' });
const debugLogger_1 = require("./utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('server');
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const crypto_1 = __importDefault(require("crypto"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const passport_saml_1 = require("@node-saml/passport-saml");
const express_ejs_layouts_1 = __importDefault(require("express-ejs-layouts"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const userService_1 = require("./services/userService");
const securityLogger_1 = require("./utils/securityLogger");
const csurf_1 = __importDefault(require("@dr.pogodin/csurf"));
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
exports.io = io;
const PORT = parseInt(process.env.PORT || '3000', 10);
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.use(express_ejs_layouts_1.default);
app.set('layout', 'layout');
app.set('views', path_1.default.join(__dirname, 'views'));
app.use((_req, res, next) => {
    res.locals.nonce = crypto_1.default.randomBytes(16).toString('base64');
    next();
});
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
        next();
    });
}
app.use((req, res, next) => {
    const nonce = res.locals.nonce;
    helmet_1.default.contentSecurityPolicy({
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
app.use((_req, res, next) => {
    res.removeHeader('X-Powered-By');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
});
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowed = [
            process.env.CLIENT_ORIGIN || 'http://localhost:3000'
        ];
        if (!origin) {
            return callback(null, true);
        }
        if (process.env.NODE_ENV === 'production') {
            if (allowed.includes(origin)) {
                return callback(null, true);
            }
            else {
                (0, securityLogger_1.logSecurityViolation)('cors_violation', { origin }, { ip: 'unknown' });
                return callback(new Error('Not allowed by CORS'));
            }
        }
        callback(null, true);
    },
    credentials: true
}));
app.use((0, cookie_parser_1.default)());
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'default_secret' || process.env.SESSION_SECRET.length < 32)) {
    securityLogger_1.logger.error('CRITICAL: SESSION_SECRET must be set to a strong value (min 32 characters) in production');
    process.exit(1);
}
const sessionTimeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '90', 10);
const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000;
const expressSession = (0, express_session_1.default)({
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
app.use(expressSession);
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
passport_1.default.serializeUser((user, done) => done(null, user));
passport_1.default.deserializeUser((user, done) => done(null, user));
let idpCert = process.env.SSO_IDP_CERT_BASE64
    ? Buffer.from(process.env.SSO_IDP_CERT_BASE64, 'base64').toString('utf8').trim()
    : null;
if (idpCert && !idpCert.includes('BEGIN CERTIFICATE')) {
    try {
        idpCert = Buffer.from(idpCert, 'base64').toString('utf8');
    }
    catch (err) {
        securityLogger_1.logger.error('Failed to decode base64 certificate', { error: err.message });
    }
}
if (idpCert) {
    const samlStrategy = new passport_saml_1.Strategy({
        entryPoint: process.env.SSO_ENTRY_POINT,
        issuer: process.env.SSO_ISSUER,
        callbackUrl: process.env.SSO_CALLBACK_URL,
        idpCert: idpCert,
        acceptedClockSkewMs: 5000,
        disableRequestedAuthnContext: true,
        identifierFormat: null,
        forceAuthn: true,
        validateInResponseTo: 'always',
        requestIdExpirationPeriodMs: 3600000,
        cacheProvider: {
            save: (_key, _value, callback) => callback(null, null),
            get: (_key, callback) => callback(null, null),
            remove: (_key, callback) => callback(null, null)
        },
    }, async (profile, done) => {
        try {
            const email = profile.nameID;
            if (!email) {
                (0, securityLogger_1.logAuth)('login_failure', { success: false, reason: 'Missing email' });
                return done(new Error('Missing SAML email/nameID'), false);
            }
            let user = await (0, userService_1.getUserByEmail)(email);
            if (!user) {
                user = await (0, userService_1.createUserIfNotExists)(email, profile);
            }
            (0, securityLogger_1.logAuth)('login_success', { success: true, email });
            return done(null, user);
        }
        catch (err) {
            (0, securityLogger_1.logAuth)('login_error', { success: false, reason: err.message });
            return done(err);
        }
    });
    passport_1.default.use('saml', samlStrategy);
}
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
const inputValidation_1 = require("./middlewares/inputValidation");
app.use(inputValidation_1.sanitizeInputs);
const csrfProtection = (0, csurf_1.default)({
    cookie: {
        key: '_csrf',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req) => {
        return (req.body._csrf ||
            req.query._csrf ||
            req.headers['csrf-token'] ||
            req.headers['xsrf-token'] ||
            req.headers['x-csrf-token'] ||
            req.headers['x-xsrf-token'] ||
            '');
    }
});
app.use(csrfProtection);
app.get('/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken?.() || '' });
});
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
const globalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const { logRateLimit } = require('./utils/securityLogger');
        logRateLimit(req, 'global');
        res.status(429).json({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});
const authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many authentication attempts',
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        const { logRateLimit } = require('./utils/securityLogger');
        logRateLimit(req, 'auth');
        res.status(429).json({
            error: 'Too many authentication attempts',
            message: 'Please try again later',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});
const uploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.UPLOAD_RATE_LIMIT || '30', 10),
    message: 'Too many upload requests'
});
const forecastRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.FORECAST_RATE_LIMIT || '10', 10),
    message: 'Too many forecast requests'
});
const apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many API requests'
});
app.use(globalRateLimiter);
app.use((req, res, next) => {
    const fullPath = decodeURIComponent(req.path || '');
    if (fullPath.length > 1000) {
        return res.status(414).json({ success: false, error: "Request URI too long" });
    }
    const suspiciousPatterns = [
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
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home Page',
        csrfToken: req.csrfToken?.() || '',
        error: req.query.error
    });
});
app.use('/auth', authRateLimiter, require('./routes/auth'));
app.use('/upload', uploadRateLimiter, require('./routes/upload')(io));
app.use('/forecast', forecastRateLimiter, require('./routes/forecast')(io));
app.use('/markets', apiRateLimiter, require('./routes/markets'));
app.use('/reports', apiRateLimiter, require('./routes/reports'));
app.use('/dashboard', apiRateLimiter, require('./routes/dashboard'));
app.use('/files', apiRateLimiter, require('./routes/files.js'));
io.use((socket, next) => {
    const req = socket.request;
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
        (0, securityLogger_1.logSecurityViolation)('websocket_auth_failure', {
            reason: 'No session cookie',
            socketId: socket.id
        }, { ip: clientIp });
        return next(new Error('Authentication required'));
    }
    (0, cookie_parser_1.default)()(req, {}, (err) => {
        if (err) {
            (0, securityLogger_1.logSecurityViolation)('websocket_auth_failure', {
                reason: 'Cookie parse error',
                error: err.message,
                socketId: socket.id
            }, { ip: clientIp });
            return next(new Error('Authentication failed'));
        }
        expressSession(req, {}, (err) => {
            if (err) {
                (0, securityLogger_1.logSecurityViolation)('websocket_auth_failure', {
                    reason: 'Session load error',
                    error: err.message,
                    socketId: socket.id
                }, { ip: clientIp });
                return next(new Error('Authentication failed'));
            }
            const user = req.session?.user || req.session?.passport?.user;
            if (!user) {
                (0, securityLogger_1.logSecurityViolation)('websocket_auth_failure', {
                    reason: 'No valid user session',
                    socketId: socket.id,
                    sessionId: req.sessionID
                }, { ip: clientIp });
                return next(new Error('Authentication required'));
            }
            socket.user = user;
            socket.clientIp = clientIp;
            (0, securityLogger_1.logAuth)('websocket_connected', {
                success: true,
                userId: user.id || user.email,
                socketId: socket.id,
                ip: clientIp
            });
            return next();
        });
    });
});
io.on('connection', (socket) => {
    securityLogger_1.logger.info('WebSocket client connected', {
        socketId: socket.id,
        userId: socket.user?.id || socket.user?.email
    });
    socket.on('disconnect', () => {
        securityLogger_1.logger.info('WebSocket client disconnected', {
            socketId: socket.id,
            userId: socket.user?.id || socket.user?.email
        });
    });
});
app.use((req, res) => {
    securityLogger_1.logger.warn('404 Not Found', { path: req.path, ip: req.ip });
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: {}
    });
});
app.use((err, req, res, _next) => {
    (0, securityLogger_1.logError)(err, { path: req.path, method: req.method }, req);
    const statusCode = err.statusCode || err.status || 500;
    const errorResponse = {
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
    }
    else {
        res.json(errorResponse);
    }
});
process.on('SIGTERM', () => {
    securityLogger_1.logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        securityLogger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    securityLogger_1.logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        securityLogger_1.logger.info('HTTP server closed');
        process.exit(0);
    });
});
server.listen(PORT, () => {
    securityLogger_1.logger.info(`Server running on port ${PORT}`, {
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
const serverTimeout = parseInt(process.env.SERVER_TIMEOUT || '14400000', 10);
server.timeout = serverTimeout;
server.keepAliveTimeout = serverTimeout;
server.headersTimeout = serverTimeout + 5000;
if (log && typeof log.info === 'function') {
    log.info(`✓ Server timeout: ${serverTimeout / 1000 / 60} minutes`);
}
//# sourceMappingURL=server.js.map