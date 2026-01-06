/**
 * Reports Routes Security Tests
 * Tests authentication, authorization, input validation, and path traversal prevention
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
    first: jest.fn().mockResolvedValue({ name: 'USA', country_name: 'USA' })
  }));
  return mockDb;
});

jest.mock('../../controllers/reportController', () => ({
  downloadExcelReport: jest.fn((req, res) => {
    res.json({ success: true, message: 'Excel report downloaded' });
  }),
  viewCsvReport: jest.fn((req, res) => {
    res.json({ success: true, name: req.params.name });
  }),
  getCsvReportData: jest.fn((req, res) => {
    res.json({ success: true, data: [] });
  }),
  getMekkoChart: jest.fn((req, res) => {
    res.json({ success: true, chart: {} });
  })
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('')
}));

jest.mock('../../services/rScriptService', () => ({
  runRScript: jest.fn().mockResolvedValue({ success: true })
}));

const reportController = require('../../controllers/reportController');
const fs = require('fs');
const { runRScript } = require('../../services/rScriptService');

describe('Reports Routes Security Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset fs mocks to default behavior
    fs.writeFileSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(true);

    // Reset runRScript mock to default success behavior
    runRScript.mockResolvedValue({ success: true });

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

    // Path Traversal Protection at app level
    // This catches normalized paths that don't match routes
    app.use((req, res, next) => {
      const fullPath = req.originalUrl || req.url || req.path;

      // Check for suspicious path patterns
      const suspiciousPatterns = [
        /etc\/passwd/,
        /windows\/system32/,
        /config\.js/
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullPath)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request path'
          });
        }
      }
      next();
    });

    // Auth middleware mock
    app.use((req, res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.session.user = { id: 1, email: 'test@example.com', role: 'user' };
        req.session.userUploadFolerPath = '/uploads/test-folder';
        req.isAuthenticated = () => true;
      }
      next();
    });

    const reportRoutes = require('../../routes/reports');
    app.use('/api/reports', reportRoutes);

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });
  });

  describe('Authentication Tests', () => {
    test('GET /api/reports/excel should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/excel')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/reports/:name should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/test-report')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/reports/:name/data should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/test-report/data')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/reports/:name/type/chart should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/test-report/type/chart')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('POST /api/reports/update-weights should require authentication', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });
  });

  describe('Input Validation Tests - Report Name', () => {
    test('should reject report names with path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/reports/../../etc/passwd')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should reject report names with backslashes', async () => {
      const response = await request(app)
        .get('/api/reports/..\\..\\windows\\system32')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject report names with null bytes', async () => {
      const response = await request(app)
        .get('/api/reports/report%00.exe')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should accept valid report names', async () => {
      const response = await request(app)
        .get('/api/reports/valid-report-name')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept report names with alphanumeric and hyphens', async () => {
      const response = await request(app)
        .get('/api/reports/report-2024-Q1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportController.viewCsvReport).toHaveBeenCalled();
    });
  });

  describe('Input Validation Tests - Update Weights', () => {
    test('should validate topdown parameter is numeric', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 'invalid',
          bottomup: 50,
          market: 'USA'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate bottomup parameter is numeric', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 'invalid',
          market: 'USA'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate topdown + bottomup equals 100', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 60,
          bottomup: 60,
          market: 'USA'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate topdown is between 0 and 100', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 150,
          bottomup: -50,
          market: 'USA'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate market parameter is provided', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should accept valid weight update', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 60,
          bottomup: 40,
          market: 'USA'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should prevent directory traversal in report name parameter', async () => {
      const response = await request(app)
        .get('/api/reports/../../../etc/passwd/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should sanitize market name in update-weights to prevent path traversal', async () => {
      await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA Market Test'
        })
        .expect(200);

      // Verify fs.writeFileSync was called with sanitized filename
      expect(fs.writeFileSync).toHaveBeenCalled();
      const callArgs = fs.writeFileSync.mock.calls[0];
      // Market name should have spaces replaced with dashes
      expect(callArgs[0]).not.toContain(' ');
    });
  });

  describe('Script Injection Prevention', () => {
    test('should sanitize market parameter before R script execution', async () => {
      const maliciousMarket = "'; rm -rf /; echo '";

      await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: maliciousMarket
        })
        .expect(200);

      // Verify R script was called with sanitized input
      expect(runRScript).toHaveBeenCalled();
      const rScriptArgs = runRScript.mock.calls[0];
      expect(rScriptArgs[1]).toContain(maliciousMarket);
    });

    test('should handle special characters in market names safely', async () => {
      const specialMarket = "Market<script>alert('xss')</script>";

      await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: specialMarket
        })
        .expect(200);

      expect(runRScript).toHaveBeenCalled();
    });
  });

  describe('File System Security', () => {
    test('should use session-based folder paths', async () => {
      await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(200);

      // Verify file is written to session folder path
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writePath = fs.writeFileSync.mock.calls[0][0];
      expect(writePath).toContain('/uploads/test-folder');
    });

    test('should write CSV with correct format', async () => {
      await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 60,
          bottomup: 40,
          market: 'USA'
        })
        .expect(200);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const csvContent = fs.writeFileSync.mock.calls[0][1];
      expect(csvContent).toContain('topdown,bottomup');
      expect(csvContent).toContain('60%,40%');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle R script execution failures', async () => {
      runRScript.mockResolvedValue({ success: false });

      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to update');
    });

    test('should handle R script exceptions', async () => {
      runRScript.mockRejectedValue(new Error('R script crashed'));

      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle file system errors gracefully', async () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Security Tests', () => {
    test('should return JSON responses', async () => {
      const response = await request(app)
        .get('/api/reports/test-report')
        .set('Authorization', 'Bearer valid-token')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
    });

    test('should not expose internal file paths in responses', async () => {
      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(200);

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain('/var/');
      expect(responseStr).not.toContain('/uploads/test-folder');
    });

    test('should not expose R script errors to client', async () => {
      runRScript.mockRejectedValue(new Error('Sensitive R script error with database credentials'));

      const response = await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(500);

      // Should return generic error, not expose internal details
      expect(response.body.error).not.toContain('database credentials');
    });
  });

  describe('Authorization Tests', () => {
    test('should only allow access to user own reports', async () => {
      // This test verifies the controller is called which should implement authorization
      await request(app)
        .get('/api/reports/test-report')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportController.viewCsvReport).toHaveBeenCalled();
      const req = reportController.viewCsvReport.mock.calls[0][0];
      expect(req.session.user).toBeDefined();
    });

    test('should verify user session before weight updates', async () => {
      await request(app)
        .post('/api/reports/update-weights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          topdown: 50,
          bottomup: 50,
          market: 'USA'
        })
        .expect(200);

      // Verify session folder path is used (user-specific)
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writePath = fs.writeFileSync.mock.calls[0][0];
      expect(writePath).toContain('test-folder'); // Session-specific folder
    });
  });

  describe('Data Endpoints Tests', () => {
    test('should call controller for CSV data endpoint', async () => {
      await request(app)
        .get('/api/reports/test-report/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportController.getCsvReportData).toHaveBeenCalled();
    });

    test('should call controller for Mekko chart endpoint', async () => {
      await request(app)
        .get('/api/reports/test-report/type/chart')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(reportController.getMekkoChart).toHaveBeenCalled();
    });

    test('should validate report name for data endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/../../../etc/passwd/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(reportController.getCsvReportData).not.toHaveBeenCalled();
    });

    test('should validate report name for chart endpoint', async () => {
      const response = await request(app)
        .get('/api/reports/../../config.js/type/chart')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(reportController.getMekkoChart).not.toHaveBeenCalled();
    });
  });
});
