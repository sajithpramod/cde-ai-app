"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndStoreDynamic = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const templateValidator_1 = require("../services/templateValidator");
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('auth');
async function validateFileSignature(filePath) {
    return new Promise((resolve, reject) => {
        const stream = fs_1.default.createReadStream(filePath, { start: 0, end: 7 });
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length >= 4) {
                const signature = buffer.toString('hex', 0, 4);
                if (signature === '504b0304') {
                    return resolve(true);
                }
            }
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
        stream.on('error', (err) => {
            log.error('Error reading file signature:', err);
            reject(err);
        });
    });
}
const fieldToFileNameMap = {
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
const tempUploadDir = path_1.default.join(__dirname, '../temp-uploads');
if (!fs_1.default.existsSync(tempUploadDir)) {
    fs_1.default.mkdirSync(tempUploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, tempUploadDir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${safeName}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 40 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
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
const validateAndStoreDynamic = () => {
    return (req, res, next) => {
        const startTime = Date.now();
        upload(req, res, (async (err) => {
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
            }
            else if (dataType === 'iwsr' && fieldName === 'initialDataFile') {
                fileType = 'IWSRData';
            }
            const files = req.files;
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
                const isValidSignature = await validateFileSignature(file.path);
                if (!isValidSignature) {
                    fs_1.default.unlinkSync(file.path);
                    res.status(400).json({
                        success: false,
                        error: 'Invalid file type. File signature does not match Excel format.'
                    });
                    return;
                }
                const validation = await (0, templateValidator_1.validateTemplate)(file.path, file.originalname, fileType);
                if (!validation.valid) {
                    fs_1.default.unlinkSync(file.path);
                    res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        missing: validation.missing
                    });
                    return;
                }
                const baseName = fieldToFileNameMap[fieldName] || fieldToFileNameMap.default;
                const ext = path_1.default.extname(file.originalname);
                const finalName = `${baseName}${ext}`;
                const sessionId = req.session?.id || 'default';
                if (file.originalname.includes('IS') && fieldName === 'CPSdataFile') {
                    req.session.staticMappingFile = 'static';
                }
                else if (fieldName === 'CPSdataFile') {
                    req.session.staticMappingFile = '';
                }
                if (fieldName === 'TBSNSVFile') {
                    if (file.originalname.includes('4 tiers')) {
                        req.session.staticTBAMapping = '4';
                    }
                    else if (file.originalname.includes('5 tiers')) {
                        req.session.staticTBAMapping = '5';
                    }
                    else {
                        req.session.staticTBAMapping = '';
                    }
                }
                let uploadDir;
                if (!req.session.userUploadFolerPath || !fs_1.default.existsSync(req.session.userUploadFolerPath)) {
                    uploadDir = path_1.default.join(__dirname, '../uploads', sessionId);
                    if (!fs_1.default.existsSync(uploadDir)) {
                        fs_1.default.mkdirSync(uploadDir, { recursive: true });
                    }
                }
                else {
                    uploadDir = req.session.userUploadFolerPath;
                }
                const finalPath = path_1.default.join(uploadDir, finalName);
                fs_1.default.copyFileSync(file.path, finalPath);
                fs_1.default.unlinkSync(file.path);
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
            }
            catch (error) {
                log.error('❌ Error during file validation:', { reason: error });
                fs_1.default.unlinkSync(file.path);
                res.status(500).json({ success: false, error: "File upload error and cannot move to the destination folder" });
            }
        }));
    };
};
exports.validateAndStoreDynamic = validateAndStoreDynamic;
//# sourceMappingURL=validateAndStoreDynamic.js.map