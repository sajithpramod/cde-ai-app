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
declare class AzureBlobService {
    private initialized;
    private blobServiceClient;
    private containerClient;
    private connectionString;
    private accountName;
    private accountKey;
    private containerName;
    constructor();
    initialize(): Promise<boolean>;
    isAvailable(): boolean;
    uploadFolder(localFolderPath: string, blobFolderPrefix: string): Promise<UploadFolderResult>;
    downloadFolder(blobFolderPrefix: string, localFolderPath: string): Promise<DownloadFolderResult>;
    folderExists(blobFolderPrefix: string): Promise<boolean>;
    private getAllFiles;
    private getContentType;
    deleteFolder(blobFolderPrefix: string): Promise<DeleteFolderResult>;
}
declare const _default: AzureBlobService;
export default _default;
//# sourceMappingURL=azureBlobService.d.ts.map