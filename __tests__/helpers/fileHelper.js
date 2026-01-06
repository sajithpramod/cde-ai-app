const path = require('path');
const fs = require('fs').promises;


/**
 * File helper utilities for tests
 */
class FileHelper {
    /**
   * Create mock file object (as from multer)
   */
    static mockFile(overrides = {}) {
        return {
            fieldname: overrides.fieldname || 'file',
            originalname: overrides.originalname || 'test-file.xlsx',
            encoding: overrides.encoding || '7bit',
            mimetype: overrides.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            destination: overrides.destination || './uploads/',
            filename: overrides.filename || `test-${Date.now()}.xlsx`,
            path: overrides.path || `./uploads/test-${Date.now()}.xlsx`,
            size: overrides.size || 1024,
            ...overrides
        };
    }

    /**
   * Create mock CSV file content
   */
    static mockCSVContent(headers, rows) {
        const headerLine = headers.join(',');
        const dataLines = rows.map(row => row.join(','));
        return [headerLine, ...dataLines].join('\n');
    }

    /**
   * Create mock file upload for different file types
   */
    static mockFileUpload(fileType) {
        const fileTypes = {
            above_market: {
                originalname: 'above_market_data.xlsx',
                fieldname: 'above_market',
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            below_market: {
                originalname: 'below_market_data.xlsx',
                fieldname: 'below_market',
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            lly: {
                originalname: 'lly_data.xlsx',
                fieldname: 'lly',
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            forecast: {
                originalname: 'forecast_data.xlsx',
                fieldname: 'forecast',
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        };

        const typeConfig = fileTypes[fileType] || fileTypes.above_market;
        return this.mockFile(typeConfig);
    }

    /**
   * Create mock Excel file buffer
   */
    static mockExcelBuffer() {
    // Minimal XLSX file signature
        return Buffer.from([
            0x50, 0x4B, 0x03, 0x04, // ZIP signature
            0x14, 0x00, 0x00, 0x00, 0x08, 0x00
        ]);
    }

    /**
   * Create test upload directory
   */
    static async createTestUploadDir() {
        const testDir = path.join(__dirname, '../../uploads/test');
        await fs.mkdir(testDir, { recursive: true });
        return testDir;
    }

    /**
   * Cleanup test upload directory
   */
    static async cleanupTestUploadDir() {
        const testDir = path.join(__dirname, '../../uploads/test');
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Directory might not exist
            console.log('Test upload directory cleanup:', err.message);
        }
    }

    /**
   * Mock file validation error
   */
    static mockFileValidationError(message) {
        return {
            error: true,
            message,
            code: 'FILE_VALIDATION_ERROR'
        };
    }

    /**
   * Create mock file with specific size
   */
    static mockFileWithSize(sizeInBytes) {
        return this.mockFile({ size: sizeInBytes });
    }

    /**
   * Create mock invalid file type
   */
    static mockInvalidFileType() {
        return this.mockFile({
            originalname: 'test.txt',
            mimetype: 'text/plain'
        });
    }
}

module.exports = FileHelper;
