"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const storage_blob_1 = require("@azure/storage-blob");
const path = __importStar(require("path"));
const fs_1 = require("fs");
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('azureBlobService');
class AzureBlobService {
    constructor() {
        this.initialized = false;
        this.blobServiceClient = null;
        this.containerClient = null;
        this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'forecast-reports';
    }
    async initialize() {
        if (this.initialized) {
            return true;
        }
        try {
            if (!this.connectionString && (!this.accountName || !this.accountKey)) {
                log.warn('Azure Blob Storage credentials not configured. Service will not be available.');
                return false;
            }
            if (this.connectionString) {
                this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(this.connectionString);
            }
            else {
                const connString = `DefaultEndpointsProtocol=https;AccountName=${this.accountName};AccountKey=${this.accountKey};EndpointSuffix=core.windows.net`;
                this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connString);
            }
            this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            await this.containerClient.createIfNotExists();
            this.initialized = true;
            log.info(`Azure Blob Storage initialized successfully. Container: ${this.containerName}`);
            return true;
        }
        catch (error) {
            log.error('Failed to initialize Azure Blob Storage:', error);
            return false;
        }
    }
    isAvailable() {
        return this.initialized && this.containerClient !== null;
    }
    async uploadFolder(localFolderPath, blobFolderPrefix) {
        if (!await this.initialize()) {
            return { success: false, error: 'Azure Blob Storage not configured' };
        }
        if (!this.containerClient) {
            return { success: false, error: 'Container client not initialized' };
        }
        try {
            const uploadedFiles = [];
            const files = await this.getAllFiles(localFolderPath);
            log.info(`Uploading ${files.length} files from ${localFolderPath} to blob storage...`);
            for (const file of files) {
                const relativePath = path.relative(localFolderPath, file);
                const blobName = path.join(blobFolderPrefix, relativePath).replace(/\\/g, '/');
                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
                const fileContent = await fs_1.promises.readFile(file);
                await blockBlobClient.uploadData(fileContent, {
                    blobHTTPHeaders: {
                        blobContentType: this.getContentType(file)
                    }
                });
                uploadedFiles.push(blobName);
                log.debug(`Uploaded: ${blobName}`);
            }
            log.info(`Successfully uploaded ${uploadedFiles.length} files to ${blobFolderPrefix}`);
            return {
                success: true,
                blobPath: blobFolderPrefix,
                uploadedFiles: uploadedFiles.length
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Error uploading folder to blob storage:', error);
            return { success: false, error: errorMessage };
        }
    }
    async downloadFolder(blobFolderPrefix, localFolderPath) {
        if (!await this.initialize()) {
            return { success: false, error: 'Azure Blob Storage not configured' };
        }
        if (!this.containerClient) {
            return { success: false, error: 'Container client not initialized' };
        }
        try {
            await fs_1.promises.mkdir(localFolderPath, { recursive: true });
            const blobs = this.containerClient.listBlobsFlat({ prefix: blobFolderPrefix });
            let downloadedCount = 0;
            for await (const blob of blobs) {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
                const relativePath = blob.name.substring(blobFolderPrefix.length);
                const localFilePath = path.join(localFolderPath, relativePath);
                await fs_1.promises.mkdir(path.dirname(localFilePath), { recursive: true });
                await blockBlobClient.downloadToFile(localFilePath);
                downloadedCount++;
                log.debug(`Downloaded: ${blob.name} -> ${localFilePath}`);
            }
            log.info(`Successfully downloaded ${downloadedCount} files from ${blobFolderPrefix}`);
            return { success: true, downloadedFiles: downloadedCount };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Error downloading folder from blob storage:', error);
            return { success: false, error: errorMessage };
        }
    }
    async folderExists(blobFolderPrefix) {
        if (!await this.initialize()) {
            return false;
        }
        if (!this.containerClient) {
            return false;
        }
        try {
            const blobs = this.containerClient.listBlobsFlat({
                prefix: blobFolderPrefix
            });
            for await (const _blob of blobs) {
                return true;
            }
            return false;
        }
        catch (error) {
            log.error('Error checking folder existence:', error);
            return false;
        }
    }
    async getAllFiles(dirPath) {
        const files = [];
        const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await this.getAllFiles(fullPath);
                files.push(...subFiles);
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    }
    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.csv': 'text/csv',
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
    async deleteFolder(blobFolderPrefix) {
        if (!await this.initialize()) {
            return { success: false, error: 'Azure Blob Storage not configured' };
        }
        if (!this.containerClient) {
            return { success: false, error: 'Container client not initialized' };
        }
        try {
            const blobs = this.containerClient.listBlobsFlat({ prefix: blobFolderPrefix });
            let deletedCount = 0;
            for await (const blob of blobs) {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
                await blockBlobClient.delete();
                deletedCount++;
                log.debug(`Deleted: ${blob.name}`);
            }
            log.info(`Successfully deleted ${deletedCount} files from ${blobFolderPrefix}`);
            return { success: true, deletedFiles: deletedCount };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Error deleting folder from blob storage:', error);
            return { success: false, error: errorMessage };
        }
    }
}
exports.default = new AzureBlobService();
//# sourceMappingURL=azureBlobService.js.map