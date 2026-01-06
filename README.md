# Occasion Forecasting Application

A secure, enterprise-grade forecasting application built with TypeScript, Express, and PostgreSQL. Features SSO authentication, R script execution, file upload capabilities, and interactive data visualization.

## 🚀 Features

- **Secure Authentication**: SAML-based SSO integration with Azure AD
- **Data Processing**: Upload and process CSV/Excel files for forecasting
- **R Script Integration**: Execute R scripts for statistical analysis and forecasting
- **Interactive Dashboards**: Real-time data visualization with charts and reports
- **Ensemble Models**: Support for multiple forecasting models with weighted combinations
- **Report Generation**: Export results to Excel with custom formatting
- **Real-time Updates**: WebSocket support for live progress tracking
- **Enterprise Security**: CSRF protection, rate limiting, input validation, and comprehensive logging

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **PostgreSQL**: v12 or higher
- **R**: v4.0 or higher (for forecasting scripts)
- **npm**: v8 or higher

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cde-ai-app-cps-Typescript
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory. Use `.env.template` as a reference:

```bash
cp .env.template .env
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=3000
NODE_ENV=development
SERVER_TIMEOUT=14400000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=occasion_forecasting

# Session Configuration
SESSION_SECRET=your_secure_session_secret_min_32_chars
SESSION_TIMEOUT_MINUTES=90

# SSO Configuration (Optional - for Azure AD)
SSO_ENTRY_POINT=https://login.microsoftonline.com/...
SSO_ISSUER=your_app_identifier
SSO_CALLBACK_URL=http://localhost:3000/auth/callback
SSO_IDP_CERT_BASE64=your_base64_encoded_certificate

# Client Configuration
CLIENT_ORIGIN=http://localhost:3000
```

### 4. Database Setup

Run database migrations:

```bash
npm run migrate
```

To rollback migrations:

```bash
npm run rollback
```

## 🏃 Running the Application

### Development Mode (Recommended)

Automatically rebuilds and restarts on file changes:

```bash
npm run start:dev
```

### Production Mode

Build and start the application:

```bash
# Build the application
npm run build

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

## 📦 Build Process

The build process compiles TypeScript files and prepares static assets:

```bash
npm run build
```

This command:
1. Compiles TypeScript files to JavaScript in the `dist` folder
2. Copies view templates to `dist/views`
3. Bundles and minifies frontend JavaScript

**Important:** Always run `npm run build` after making changes to TypeScript files before running `npm start`.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Type checking without building
npm run type-check
```

## 📁 Project Structure

```
cde-ai-app-cps-Typescript/
├── config/              # Configuration files
├── controllers/         # Request handlers
├── middlewares/         # Express middlewares
├── migrations/          # Database migrations
├── public/              # Static assets (CSS, JS, images)
├── routes/              # API routes
├── scripts/             # R scripts and utilities
├── seeds/               # Database seed data
├── services/            # Business logic
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
├── views/               # EJS templates
├── server.ts            # Application entry point
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## 🔒 Security Features

- **CSRF Protection**: Token-based protection against cross-site request forgery
- **Rate Limiting**: Configurable rate limits for different endpoints
- **Input Validation**: Comprehensive validation and sanitization
- **Helmet.js**: Security headers (CSP, HSTS, etc.)
- **Session Management**: Secure session handling with configurable timeouts
- **Audit Logging**: Comprehensive security event logging
- **CORS**: Configurable cross-origin resource sharing

## 📊 Key Endpoints

- `GET /` - Home page
- `GET /upload` - File upload interface
- `GET /dashboard` - Main dashboard
- `POST /forecast/run` - Execute forecasting
- `GET /reports/:id` - View generated reports
- `GET /markets` - Market data API

## 🐳 Docker Support

Build and run with Docker:

```bash
# Build the image
docker build -t forecasting-app .

# Run the container
docker run -p 3000:3000 --env-file .env forecasting-app
```

Or use Docker Compose:

```bash
docker-compose up
```

## 📝 Additional Documentation

- [Deployment Guide](DEPLOYMENT_READY.md)
- [TypeScript Migration Guide](TYPESCRIPT_MIGRATION_GUIDE.md)
- [Ensemble Feature Documentation](README_ENSEMBLE_FEATURE.md)
- [Scheduler Guide](SCHEDULER_GUIDE.md)
- [Log Viewing Guide](LOG_VIEWING_GUIDE.md)
- [Quick Start Guide](QUICK_START.md)

## 🔧 Troubleshooting

### Common Issues

**1. TypeScript Module Error**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**2. Database Connection Error**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure `pg_hba.conf` allows connections from your host

**3. Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**4. Build Errors**
```bash
# Clean build
rm -rf dist
npm run build
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run type checking: `npm run type-check`
5. Submit a pull request

## 📄 License

MIT

## 👥 Authors

Cerulean Information technoligy

---

**Version:** 1.0.0  
**Last Updated:** January 2026
