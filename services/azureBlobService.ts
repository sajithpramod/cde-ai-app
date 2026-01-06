// Azure Blob Storage Service
// This service handles uploading and downloading files to/from Azure Blob Storage

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('azureBlobService');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UploadFolderResult {
    success: boolean;
    blobPath?: string;
    uploadedFiles?: number;
    error?: string;
}

export interface DownloadFolderResult {
    success: boolean;
    downloadedFiles?: number;
    error?: string;
}

export interface DeleteFolderResult {
    success: boolean;
    deletedFiles?: number;
    error?: string;
}

interface ContentTypeMap {
    [extension: string]: string;
}

// ============================================
// AZURE BLOB SERVICE CLASS
// ============================================

class AzureBlobService {
    private initialized: boolean = false;
    private blobServiceClient: BlobServiceClient | null = null;
    private containerClient: ContainerClient | null = null;
    private connectionString: string | undefined;
    private accountName: string | undefined;
    private accountKey: string | undefined;
    private containerName: string;

    constructor() {
        // Check if Azure Blob Storage credentials are configured
        this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'forecast-reports';
    }

    /**
     * Initialize the Azure Blob Storage client
     * @returns Returns true if initialized successfully
     */
    async initialize(): Promise<boolean> {
        if (this.initialized) {
            return true;
        }

        try {
            // Check if credentials are available
            if (!this.connectionString && (!this.accountName || !this.accountKey)) {
                log.warn('Azure Blob Storage credentials not configured. Service will not be available.');
                return false;
            }

            // Create BlobServiceClient
            if (this.connectionString) {
                this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
            } else {
                const connString = `DefaultEndpointsProtocol=https;AccountName=${this.accountName};AccountKey=${this.accountKey};EndpointSuffix=core.windows.net`;
                this.blobServiceClient = BlobServiceClient.fromConnectionString(connString);
            }

            // Get container client
            this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);

            // Create container if it doesn't exist
            await this.containerClient.createIfNotExists();

            this.initialized = true;
            log.info(`Azure Blob Storage initialized successfully. Container: ${this.containerName}`);
            return true;
        } catch (error) {
            log.error('Failed to initialize Azure Blob Storage:', error);
            return false;
        }
    }

    /**
     * Check if the service is available and initialized
     */
    isAvailable(): boolean {
        return this.initialized && this.containerClient !== null;
    }

    /**
     * Upload a folder (all files recursively) to Azure Blob Storage
     * @param localFolderPath - Path to the local folder to upload
     * @param blobFolderPrefix - Prefix/path in blob storage (e.g., 'reports/123/')
     */
    async uploadFolder(localFolderPath: string, blobFolderPrefix: string): Promise<UploadFolderResult> {
        if (!await this.initialize()) {
            return { success: false, error: 'Azure Blob Storage not configured' };
        }

        if (!this.containerClient) {
            return { success: false, error: 'Container client not initialized' };
        }

        try {
            const uploadedFiles: string[] = [];

            // Recursively get all files in the folder
            const files = await this.getAllFiles(localFolderPath);

            log.info(`Uploading ${files.length} files from ${localFolderPath} to blob storage...`);

            // Upload each file
            for (const file of files) {
                const relativePath = path.relative(localFolderPath, file);
                const blobName = path.join(blobFolderPrefix, relativePath).replace(/\\/g, '/');

                const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

                // Read file and upload
                const fileContent = await fs.readFile(file);
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Error uploading folder to blob storage:', error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Download a folder (all files) from Azure Blob Storage to local path
     * @param blobFolderPrefix - Prefix/path in blob storage (e.g., 'reports/123/')
     * @param localFolderPath - Local path to download files to
     */
    async downloadFolder(blobFolderPrefix: string, localFolderPath: string): Promise<DownloadFolderResult> {
        if (!await this.initialize()) {
            return { success: false, error: 'Azure Blob Storage not configured' };
        }

        if (!this.containerClient) {
            return { success: false, error: 'Container client not initialized' };
        }

        try {
            // Ensure local folder exists
            await fs.mkdir(localFolderPath, { recursive: true });

            // List all blobs with the prefix
            const blobs = this.containerClient.listBlobsFlat({ prefix: blobFolderPrefix });

            let downloadedCount = 0;

            for await (const blob of blobs) {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);

                // Calculate local file path
                const relativePath = blob.name.substring(blobFolderPrefix.length);
                const localFilePath = path.join(localFolderPath, relativePath);

                // Ensure directory exists
                await fs.mkdir(path.dirname(localFilePath), { recursive: true });

                // Download blob to file
                await blockBlobClient.downloadToFile(localFilePath);
                downloadedCount++;
                log.debug(`Downloaded: ${blob.name} -> ${localFilePath}`);
            }

            log.info(`Successfully downloaded ${downloadedCount} files from ${blobFolderPrefix}`);

            return { success: true, downloadedFiles: downloadedCount };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Error downloading folder from blob storage:', error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Check if a blob folder exists
     * @param blobFolderPrefix - Prefix/path in blob storage
     */
    async folderExists(blobFolderPrefix: string): Promise<boolean> {
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
                return true; // If at least one blob exists with this prefix
            }

            return false;
        } catch (error) {
            log.error('Error checking folder existence:', error);
            return false;
        }
    }

    /**
     * Recursively get all files in a directory
     * @param dirPath - Directory path
     * @returns Array of file paths
     */
    private async getAllFiles(dirPath: string): Promise<string[]> {
        const files: string[] = [];
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await this.getAllFiles(fullPath);
                files.push(...subFiles);
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * Get content type based on file extension
     * @param filePath - File path
     * @returns MIME type
     */
    private getContentType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: ContentTypeMap = {
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

    /**
     * Delete a folder (all files) from Azure Blob Storage
     * @param blobFolderPrefix - Prefix/path in blob storage
     */
    async deleteFolder(blobFolderPrefix: string): Promise<DeleteFolderResult> {
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Error deleting folder from blob storage:', error);
            return { success: false, error: errorMessage };
        }
    }
}

// Export singleton instance
export default new AzureBlobService();
