// Shared type definitions for the application

// ============================================
// USER TYPES
// ============================================

export interface User {
    id?: number;
    email: string;
    name?: string;
    role?: 'admin' | 'user' | 'viewer';
    azure_id?: string;
    created_at?: Date;
    updated_at?: Date;
    last_login?: Date;
    [key: string]: any;
}

// ============================================
// DATABASE TYPES
// ============================================

export interface Market {
    id: number;
    name: string;
    market_type: string;
    region?: string;
    country?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface Country {
    id: number;
    name: string;
    code: string;
    region?: string;
    created_at?: Date;
}

export interface Region {
    id: number;
    name: string;
    created_at?: Date;
}

export interface AboveMarket {
    id: number;
    market_name: string;
    region: string;
    countries: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface UserForecastProgress {
    id: number;
    user_id: number;
    market: string;
    step: number;
    form_data?: any;
    created_at?: Date;
    updated_at?: Date;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface ForecastRequest {
    market: string;
    dataType?: string;
    duration?: string;
    [key: string]: any;
}

export interface UploadFileInfo {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
    field: string;
    message: string;
}

// ============================================
// SAML/AUTH TYPES
// ============================================

export interface SamlProfile {
    nameID?: string;
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'?: string;
    [key: string]: any;
}

export interface AzureUser {
    email: string;
    name: string;
    azureId?: string;
}

// ============================================
// SCRIPT EXECUTION TYPES
// ============================================

export interface ScriptExecutionOptions {
    scriptPath: string;
    args?: string[];
    timeout?: number;
    cwd?: string;
}

export interface ScriptExecutionResult {
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    code?: number;
}

export interface RScriptOptions extends ScriptExecutionOptions {
    rPath?: string;
}

export interface PythonScriptOptions extends ScriptExecutionOptions {
    pythonPath?: string;
}

// ============================================
// LOGGING TYPES
// ============================================

export interface LogContext {
    [key: string]: any;
}

export interface AuthLogDetails {
    success: boolean;
    email?: string;
    reason?: string;
    userId?: number | string;
    socketId?: string;
    [key: string]: any;
}

export interface SecurityViolationDetails {
    [key: string]: any;
}

export interface FileOperationDetails {
    fileName?: string;
    fileSize?: number;
    operation?: string;
    [key: string]: any;
}

// ============================================
// EXPRESS REQUEST EXTENSIONS
// ============================================

// Note: Session extensions are defined in server.ts via module augmentation
// Use the standard Express Request type with session support

// ============================================
// VALIDATION SCHEMA TYPES
// ============================================

export interface ValidationRule {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object';
    pattern?: RegExp;
    message?: string;
    min?: number;
    max?: number;
    validator?: (value: any) => boolean | string;
}

export interface ValidationSchema {
    [field: string]: ValidationRule;
}

// ============================================
// REPORT TYPES
// ============================================

export interface ReportOptions {
    market?: string;
    marketType?: string;
    region?: string;
    startDate?: string;
    endDate?: string;
    format?: 'xlsx' | 'csv' | 'pdf';
}

export interface ReportData {
    headers: string[];
    rows: any[][];
    metadata?: Record<string, any>;
}

// ============================================
// AZURE BLOB TYPES
// ============================================

export interface BlobUploadOptions {
    containerName: string;
    blobName: string;
    filePath: string;
    contentType?: string;
}

export interface BlobDownloadOptions {
    containerName: string;
    blobName: string;
    downloadPath: string;
}

// ============================================
// CSV HELPER TYPES
// ============================================

export interface CsvRow {
    [key: string]: string | number | boolean;
}

export interface CsvOptions {
    delimiter?: string;
    headers?: boolean;
    skipEmptyLines?: boolean;
}

// ============================================
// SOCKET.IO TYPES
// ============================================

export interface SocketUser extends User {
    socketId?: string;
}

export interface SocketData {
    event: string;
    data: any;
    userId?: number | string;
}

// ============================================
// ERROR TYPES
// ============================================

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

export interface EnvironmentVariables {
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
    DATABASE_URL?: string;
    SESSION_SECRET?: string;
    SESSION_TIMEOUT_MINUTES?: string;
    CLIENT_ORIGIN?: string;
    SSO_ENTRY_POINT?: string;
    SSO_ISSUER?: string;
    SSO_CALLBACK_URL?: string;
    SSO_IDP_CERT_BASE64?: string;
    UPLOAD_RATE_LIMIT?: string;
    FORECAST_RATE_LIMIT?: string;
    LOG_LEVEL?: string;
    DEBUG_LEVEL?: string;
    CONSOLE_LOG_LEVEL?: string;
    DISABLE_CONSOLE_LOG?: string;
    SERVER_TIMEOUT?: string;
    AZURE_STORAGE_CONNECTION_STRING?: string;
    AZURE_STORAGE_CONTAINER_NAME?: string;
}

// ============================================
// EXPRESS SESSION EXTENSIONS
// ============================================

declare module 'express-session' {
    interface SessionData {
        user?: User;
        passport?: {
            user?: User;
        };
        userUploadFolerPath?: string;
        redirectAfterLogin?: string;
        forcastDuration?: string;
        currentReportId?: number | null;
        staticMappingFile?: string;
        staticTBAMapping?: string;
    }
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends EnvironmentVariables {}
    }
}
