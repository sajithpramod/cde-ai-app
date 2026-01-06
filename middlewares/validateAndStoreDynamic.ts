import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { validateTemplate } from '../services/templateValidator';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('auth');

/**
 * SECURITY: Validate file signature (magic numbers) to prevent file type spoofing
 * @param filePath - Path to file to validate
 * @returns True if file is a valid Excel file
 */
async function validateFileSignature(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { start: 0, end: 7 });
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);

            // Excel files (.xlsx) are ZIP files starting with PK (50 4B 03 04)
            // Check for ZIP signature
            if (buffer.length >= 4) {
                const signature = buffer.toString('hex', 0, 4);
                // PK\x03\x04 = 504b0304
                if (signature === '504b0304') {
                    return resolve(true);
                }
            }

            // Also check for older .xls format (D0 CF 11 E0 A1 B1 1A E1)
            if (buffer.length >= 8) {
                const xlsSignature = buffer.toString('hex', 0, 8);
                if (xlsSignature === 'd0cf11e0a1b11ae1') {
                    return resolve(true);
                }
            }

            log.error('Invalid file signature detected', {
                signature: buffer.toString('hex', 0, Math.min(8, buffer.length)),
                expected: '504b0304 (XLSX) or d0cf11e0a1b11ae1 (XLS)'
            });
            resolve(false);
        });

        stream.on('error', (err: Error) => {
            log.error('Error reading file signature:', err);
            reject(err);
        });
    });
}

interface FieldToFileNameMap {
    [key: string]: string;
}

const fieldToFileNameMap: FieldToFileNameMap = {
    initialDataFile: 'pt_mapping_file',
    ForesightFile: 'foresights_raw',
    CPSdataFile: 'unmapped_latest_year_data',
    TBSNSVFile: 'tba_rsv',
    CCFbackdataFile: 'unmapped_back_data',
     ategoryRSVFile: ' _rsv',
};

const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
];

// TEMP upload folder before validation
const tempUploadDir = path.join(__dirname, '../temp-uploads');
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, tempUploadDir);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 40 * 1024 * 1024 }, // 40MB
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype;
        if (ext !== '.xlsx' || !allowedMimeTypes.includes(mime)) {
            return cb(new Error('Only .xlsx files are allowed'));
        }
        cb(null, true);
    },
}).fields([
    { name: 'initialDataFile', maxCount: 1 },
    { name: 'TBSNSVFile', maxCount: 1 },
    { name: ' ategoryRSVFile', maxCount: 1 },
    { name: 'CPSdataFile', maxCount: 1 },
    { name: 'CCFbackdataFile', maxCount: 1 },
    { name: 'ForesightFile', maxCount: 1 },
]);

// Extend Request type to include custom properties
declare global {
    namespace Express {
        interface Request {
            uploadDuration?: number;
            validatedFilePath?: string;
            validatedFieldName?: string;
            fileName?: string;
            fieldName?: string;
            dataType?: string;
        }
    }
}

export const validateAndStoreDynamic = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const startTime = Date.now();

        upload(req, res, (async (err: unknown) => {
            if (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                res.status(400).json({ success: false, error: errorMessage });
                return;
            }

            const fieldName = req.body.fieldName;
            const dataType = req.body.dataType;

            const allowedFields = Object.keys(fieldToFileNameMap);
            if (!allowedFields.includes(fieldName)) {
                res.status(400).json({ success: false, error: 'Invalid fieldName' });
                return;
            }

            let fileType = fieldName;
            if (dataType === 'Nielsen' && fieldName === 'initialDataFile') {
                fileType = 'Nielsen';
            } else if (dataType === 'iwsr' && fieldName === 'initialDataFile') {
                fileType = 'IWSRData';
            }

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const fileArray = files?.[fieldName];
            if (!fileArray || fileArray.length === 0) {
                res.status(400).json({ success: false, error: 'File not found in upload' });
                return;
            }

            const file = fileArray[0];
            if (!file) {
                res.status(400).json({ success: false, error: 'File not found in upload' });
                return;
            }
            log.debug('📂 Validating from disk:', file.path, '| Size:', file.size, 'bytes');

            try {
                // SECURITY: Validate file signature first to prevent file type spoofing
                const isValidSignature = await validateFileSignature(file.path);
                if (!isValidSignature) {
                    fs.unlinkSync(file.path); // clean up temp file
                    res.status(400).json({
                        success: false,
                        error: 'Invalid file type. File signature does not match Excel format.'
                    });
                    return;
                }

                const validation = await validateTemplate(file.path, file.originalname, fileType);
                if (!validation.valid) {
                    fs.unlinkSync(file.path); // clean up temp file
                    res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        missing: validation.missing
                    });
                    return;
                }

                const baseName = fieldToFileNameMap[fieldName] || fieldToFileNameMap.default;
                const ext = path.extname(file.originalname);
                const finalName = `${baseName}${ext}`;
                const sessionId = req.session?.id || 'default';

                if (file.originalname.includes('IS') && fieldName === 'CPSdataFile') {
                    req.session.staticMappingFile = 'static';
                } else if (fieldName === 'CPSdataFile') {
                    req.session.staticMappingFile = '';
                }

                if (fieldName === 'TBSNSVFile') {
                    if (file.originalname.includes('4 tiers')) {
                        req.session.staticTBAMapping = '4';
                    } else if (file.originalname.includes('5 tiers')) {
                        req.session.staticTBAMapping = '5';
                    } else {
                        req.session.staticTBAMapping = '';
                    }
                }

                let uploadDir: string;

                if (!req.session.userUploadFolerPath || !fs.existsSync(req.session.userUploadFolerPath)) {
                    uploadDir = path.join(__dirname, '../uploads', sessionId);

                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                } else {
                    uploadDir = req.session.userUploadFolerPath;
                }

                const finalPath = path.join(uploadDir, finalName);
                fs.copyFileSync(file.path, finalPath);   // copy to new location
                fs.unlinkSync(file.path);              // delete original

                const endTime = Date.now();

                req.uploadDuration = endTime - startTime;
                req.validatedFilePath = uploadDir;
                req.validatedFieldName = fieldName;
                req.fileName = finalName;
                req.fieldName = fieldName;
                req.dataType = dataType;

                if (!req.session.userUploadFolerPath && uploadDir) {
                    log.debug('No folder path set');
                    req.session.userUploadFolerPath = uploadDir;
                }

                next();
            } catch (error) {
                log.error('❌ Error during file validation:', { reason: error });
                fs.unlinkSync(file.path); // clean up temp file on error
                res.status(500).json({ success: false, error: "File upload error and cannot move to the destination folder" });
            }
        }) as NextFunction);
    };
};
