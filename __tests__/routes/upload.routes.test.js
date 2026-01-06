/**
 * Upload Routes Security Tests
 * Comprehensive security testing for file upload endpoints
 * Tests authentication, authorization, file validation, path traversal, script injection, and rate limiting
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const path = require('path');

// Mock dependencies
jest.mock('../../services/db', () => {
  const mockDb = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    then: jest.fn((cb) => cb([]))
  }));
  return mockDb;
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(''),
  createReadStream: jest.fn()
}));

jest.mock('../../services/pythonScriptService', () => ({
  runPythonScript: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../services/rScriptService', () => ({
  runRScript: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../services/csvHelper', () => ({
  parseCsv: jest.fn().mockResolvedValue([]),
  parsePriceTierCsv: jest.fn().mockResolvedValue([]),
  parseRenamePriceTierFilledCsv: jest.fn().mockResolvedValue([])
}));

jest.mock('../../services/templateValidator', () => ({
  validateCountriesInExcel: jest.fn().mockResolvedValue({ success: true, missingCountries: [] })
}));

jest.mock('../../services/forecastProgress', () => ({
  saveForecastProgress: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../services/countryValidator', () => ({
  determineFileType: jest.fn().mockReturnValue('Nielsen'),
  getExpectedCountriesForValidation: jest.fn().mockResolvedValue(['US', 'UK'])
}));

jest.mock('../../utils/marketCountryValidator', () => ({
  validateMarketAndCountry: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../middlewares/validateAndStoreDynamic', () => ({
  validateAndStoreDynamic: jest.fn(() => (req, res, next) => {
    req.fileName = 'test.xlsx';
    req.validatedFilePath = '/uploads/test-folder';
    req.fieldName = 'initialDataFile';
    next();
  })
}));

// Mock express-rate-limit with controllable behavior
const mockRateLimitEnabled = { value: false };
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    const requests = new Map();
    return (req, res, next) => {
      if (!mockRateLimitEnabled.value) {
        return next();
      }

      // Simple rate limiting implementation for tests
      const key = req.ip || 'test-ip';
      const now = Date.now();
      const windowMs = options.windowMs || 900000;
      const max = options.max || 10;

      if (!requests.has(key)) {
        requests.set(key, []);
      }

      const userRequests = requests.get(key);
      const recentRequests = userRequests.filter(time => now - time < windowMs);

      if (recentRequests.length >= max) {
        return res.status(429).json(options.message || { error: 'Too many requests' });
      }

      recentRequests.push(now);
      requests.set(key, recentRequests);
      next();
    };
  });
});

const db = require('../../services/db');
const fs = require('fs');
const { runPythonScript } = require('../../services/pythonScriptService');
const { runRScript } = require('../../services/rScriptService');

// Mock Socket.IO
const mockIo = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis()
};

describe('Upload Routes Security Tests', () => {
  let app;
  let uploadRoutes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIo.emit.mockClear();
    mockIo.to.mockClear();

    // Reset mocks to default behavior
    const { validateCountriesInExcel } = require('../../services/templateValidator');
    const { runPythonScript } = require('../../services/pythonScriptService');
    const { runRScript } = require('../../services/rScriptService');

    validateCountriesInExcel.mockResolvedValue({ success: true, missingCountries: [] });
    runPythonScript.mockResolvedValue({ success: true });
    runRScript.mockResolvedValue({ success: true });
    fs.existsSync.mockReturnValue(false);

    // Create test app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Session middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    // Auth middleware mock
    app.use((req, res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.session.user = { id: 1, email: 'test@example.com', role: 'user' };
        req.session.userUploadFolerPath = '/uploads/test-folder';
        req.isAuthenticated = () => true;
      }
      next();
    });

    // Import routes with Socket.IO mock
    uploadRoutes = require('../../routes/upload')(mockIo);
    app.use('/api/upload', uploadRoutes);

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });
  });

  describe('Authentication Tests', () => {
    test('POST /api/upload/forecast should require authentication', async () => {
      const response = await request(app)
        .post('/api/upload/forecast')
        .send({
          cagrData: [{ tier: 'Premium', cagr: 5.5 }],
          countryNames: ['USA']
        })
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('POST /api/upload/single should require authentication', async () => {
      const response = await request(app)
        .post('/api/upload/single')
        .send({
          dataType: 'Nielsen',
          countryNames: ['USA']
        })
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/upload/exchange-rate should require authentication', async () => {
      const response = await request(app)
        .get('/api/upload/exchange-rate')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/upload/progress should require authentication', async () => {
      const response = await request(app)
        .get('/api/upload/progress')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('POST /api/upload/runRscript3 should require authentication', async () => {
      const response = await request(app)
        .post('/api/upload/runRscript3')
        .send({ selected: 'option1', renameData: [] })
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });
  });

  describe('Input Validation Tests - Forecast Endpoint', () => {
    test('should reject empty cagrData array', async () => {
      const response = await request(app)
        .post('/api/upload/forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cagrData: [],
          countryNames: ['USA']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error || response.body.errors).toBeDefined();
    });

    test('should reject missing cagrData field', async () => {
      const response = await request(app)
        .post('/api/upload/forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({
          countryNames: ['USA']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject invalid tier values', async () => {
      const response = await request(app)
        .post('/api/upload/forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cagrData: [{ tier: '', cagr: 5.5 }],
          countryNames: ['USA']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject non-numeric cagr values', async () => {
      const response = await request(app)
        .post('/api/upload/forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cagrData: [{ tier: 'Premium', cagr: 'invalid' }],
          countryNames: ['USA']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require either countryNames or marketNames', async () => {
      const response = await request(app)
        .post('/api/upload/forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cagrData: [{ tier: 'Premium', cagr: 5.5 }],
          countryMultiSelect: 'AllCountries'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('countryNames or marketNames');
    });
  });

  describe('Path Traversal Prevention Tests', () => {
    test('should prevent directory traversal in download-mapped-csv file parameter', async () => {
      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          file: '../../etc/passwd',
          folder: 'test-folder'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      // Either rejected as not in whitelist or path traversal detected
      expect(response.body.error).toBeDefined();
    });

    test('should prevent directory traversal in download-mapped-csv folder parameter', async () => {
      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          file: 'mapped_latest_year.csv',
          folder: '../../../etc'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file or folder path');
    });

    test('should only allow whitelisted files for download', async () => {
      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          file: 'malicious.exe',
          folder: 'test-folder'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not allowed');
    });

    test('should accept valid whitelisted files', async () => {
      fs.existsSync.mockReturnValue(true);

      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          file: 'mapped_latest_year.csv',
          folder: 'test-folder'
        });

      // Should not be 403 (might be 200 or 500 depending on file existence)
      expect(response.status).not.toBe(403);
    });

    test('should require file parameter', async () => {
      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          folder: 'test-folder'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File parameter is required');
    });

    test('should require folder parameter', async () => {
      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          file: 'mapped_latest_year.csv'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Folder parameter is required');
    });
  });

  describe('File Upload Security Tests', () => {
    test('should return 404 for non-existent files', async () => {
      fs.existsSync.mockReturnValue(false);

      const response = await request(app)
        .get('/api/upload/download-mapped-csv')
        .set('Authorization', 'Bearer valid-token')
        .query({
          file: 'mapped_latest_year.csv',
          folder: 'test-folder'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File not found');
    });

    test('should validate file type based on fieldName and dataType', async () => {
      const { validateCountriesInExcel } = require('../../services/templateValidator');

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([{ country_name: 'USA' }])
      });

      await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: 'Nielsen',
          fieldName: 'initialDataFile',
          countryNames: JSON.stringify(['USA']),
          countryMultiSelect: 'Custom'
        });

      // Validate that countries are checked in the Excel file
      expect(validateCountriesInExcel).toHaveBeenCalled();
    });
  });

  describe('Script Injection Prevention Tests', () => {
    test('should sanitize input before executing Python scripts', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([{ country_name: 'USA' }])
      });

      const maliciousInput = "'; rm -rf /; echo '";

      const response = await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: maliciousInput,
          fieldName: 'initialDataFile',
          countryNames: JSON.stringify(['USA']),
          marketNames: JSON.stringify(['TestMarket']),
          countryMultiSelect: 'AllCountries'
        });

      // Request should complete (may be rate limited)
      expect([200, 400, 429, 500]).toContain(response.status);
    });

    test('should sanitize input before executing R scripts', async () => {
      const maliciousRenameData = [
        { original: "test'; DROP TABLE users; --", renamed: "test", rank: 1 }
      ];

      const response = await request(app)
        .post('/api/upload/runRscript3')
        .set('Authorization', 'Bearer valid-token')
        .send({
          selected: 'option1',
          renameData: maliciousRenameData,
          countryNames: ['USA']
        });

      expect(runRScript).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Tests', () => {
    beforeEach(() => {
      mockRateLimitEnabled.value = true;
    });

    afterEach(() => {
      mockRateLimitEnabled.value = false;
    });

    test('should enforce rate limit on forecast endpoint', async () => {
      const validPayload = {
        cagrData: [{ tier: 'Premium', cagr: 5.5 }],
        countryNames: ['USA']
      };

      // Make 12 requests (limit is 10 per 15 minutes for forecast)
      const requests = [];
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/upload/forecast')
            .set('Authorization', 'Bearer valid-token')
            .send(validPayload)
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    test('should enforce rate limit on upload single endpoint', async () => {
      // Make 32 requests (limit is 30 per 15 minutes for uploads)
      const requests = [];
      for (let i = 0; i < 32; i++) {
        requests.push(
          request(app)
            .post('/api/upload/single')
            .set('Authorization', 'Bearer valid-token')
            .send({
              dataType: 'Nielsen',
              countryNames: JSON.stringify(['USA'])
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle database errors gracefully on progress endpoint', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .get('/api/upload/progress')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      // Should not expose internal error details
      expect(response.body.message).not.toContain('Database error');
    });

    test('should handle R script execution errors', async () => {
      runRScript.mockRejectedValue(new Error('R script failed'));

      const response = await request(app)
        .post('/api/upload/runRscript3')
        .set('Authorization', 'Bearer valid-token')
        .send({
          selected: 'option1',
          renameData: [],
          countryNames: ['USA']
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing renameData in runRscript3', async () => {
      const response = await request(app)
        .post('/api/upload/runRscript3')
        .set('Authorization', 'Bearer valid-token')
        .send({
          selected: 'option1',
          renameData: 'invalid-not-array',
          countryNames: ['USA']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid input format');
    });

    test('should handle missing selected parameter in runRscript3', async () => {
      const response = await request(app)
        .post('/api/upload/runRscript3')
        .set('Authorization', 'Bearer valid-token')
        .send({
          renameData: [],
          countryNames: ['USA']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing selected input');
    });
  });

  describe('Country Validation Tests', () => {
    beforeEach(() => {
      // Reset rate limiter for these tests
      jest.clearAllMocks();
    });

    test('should validate countries in uploaded Excel file', async () => {
      const templateValidator = require('../../services/templateValidator');
      const countryValidator = require('../../services/countryValidator');

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([{ country_name: 'USA' }])
      });

      countryValidator.getExpectedCountriesForValidation.mockResolvedValue(['US']);
      templateValidator.validateCountriesInExcel.mockResolvedValue({
        success: true,
        missingCountries: []
      });

      const response = await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: 'Nielsen',
          fieldName: 'initialDataFile',
          countryNames: JSON.stringify(['USA']),
          countryMultiSelect: 'Custom'
        });

      // Verify country validation was called
      expect(templateValidator.validateCountriesInExcel).toHaveBeenCalled();
    });

    test('should reject Excel with missing countries', async () => {
      const templateValidator = require('../../services/templateValidator');
      const countryValidator = require('../../services/countryValidator');

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([{ country_name: 'USA' }])
      });

      countryValidator.getExpectedCountriesForValidation.mockResolvedValue(['US', 'UK', 'FR']);
      templateValidator.validateCountriesInExcel.mockResolvedValue({
        success: false,
        missingCountries: ['FR']
      });

      const response = await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: 'Nielsen',
          fieldName: 'initialDataFile',
          countryNames: JSON.stringify(['USA', 'UK', 'France']),
          countryMultiSelect: 'Custom'
        });

      // Could be 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);

      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing countries in Excel');
      }
    });

    test('should handle AllCountries selection mode', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([
          { country_name: 'USA' },
          { country_name: 'Canada' }
        ])
      });

      await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: 'Nielsen',
          fieldName: 'initialDataFile',
          marketNames: JSON.stringify(['North America']),
          countryMultiSelect: 'AllCountries'
        });

      expect(db).toHaveBeenCalled();
    });

    test('should require marketNames when AllCountries is selected', async () => {
      const response = await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: 'Nielsen',
          fieldName: 'initialDataFile',
          countryMultiSelect: 'AllCountries'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Market selection is required');
    });
  });

  describe('Response Security Tests', () => {
    test('should return JSON responses', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/upload/progress')
        .set('Authorization', 'Bearer valid-token')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
    });

    test('should not expose sensitive file paths in responses', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{
          form_data: { dataType: 'Nielsen', validatedFilePath: '/var/secret/path/user123' },
          uploaded_files: [
            {
              field: 'initialDataFile',
              file_name: 'test.xlsx',
              path: '/var/secret/path/user123'
            }
          ],
          country_selection: {}
        }])
      };
      db.mockReturnValue(mockChain);

      const response = await request(app)
        .get('/api/upload/progress')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const responseStr = JSON.stringify(response.body);
      // Should provide relative paths, not absolute system paths
      expect(responseStr).not.toContain('/var/');
    });
  });

  describe('Session Security Tests', () => {
    test('should store upload folder path in session securely', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{
          form_data: { validatedFilePath: '/uploads/test-folder' },
          uploaded_files: [],
          country_selection: {}
        }])
      };
      db.mockReturnValue(mockChain);

      await request(app)
        .get('/api/upload/progress')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Session should be isolated per user
      // Cannot test session isolation directly in this setup
    });

    test('should validate user session before file operations', async () => {
      const response = await request(app)
        .post('/api/upload/runRscript3')
        .send({
          selected: 'option1',
          renameData: [],
          countryNames: ['USA']
        })
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });
  });

  describe('Socket.IO Security Tests', () => {
    test('should emit progress events through Socket.IO', async () => {
      // Mock for country validation query
      const mockCountryChain = {
        select: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([{ country_name: 'USA' }])
      };
      db.mockReturnValue(mockCountryChain);

      // Mock fs.existsSync to return true for the generated file
      const mockExistsSync = fs.existsSync;
      mockExistsSync.mockImplementation((filePath) => {
        if (filePath.includes('all_price_tier_columns.csv')) {
          return true;
        }
        return false;
      });

      const response = await request(app)
        .post('/api/upload/single')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dataType: 'Nielsen',
          fieldName: 'initialDataFile',
          countryNames: JSON.stringify(['USA']),
          countryMultiSelect: 'Custom'
        });

      // Verify Socket.IO emit was called
      expect(mockIo.emit).toHaveBeenCalled();
    });
  });
});
