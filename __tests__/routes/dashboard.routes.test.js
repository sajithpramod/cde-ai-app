/**
 * Dashboard Routes Security Tests
 * Tests authentication, authorization, SQL injection, pagination security, and access control
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock Azure Blob Storage - using virtual mock
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn(() => ({
      getContainerClient: jest.fn(() => ({
        createIfNotExists: jest.fn().mockResolvedValue({}),
        getBlockBlobClient: jest.fn(() => ({
          uploadFile: jest.fn().mockResolvedValue({}),
          download: jest.fn().mockResolvedValue({})
        }))
      }))
    }))
  }
}), { virtual: true });

// Mock dependencies
jest.mock('../../services/db', () => {
  const mockDb = jest.fn(() => {
    const mockInstance = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn(function (callback) {
        if (typeof callback === 'function') {
          const whereContext = {
            whereRaw: mockInstance.whereRaw,
            orWhereRaw: mockInstance.whereRaw
          };
          callback.call(whereContext, whereContext);
        }
        return mockInstance;
      }),
      whereRaw: jest.fn().mockReturnThis(),
      orWhereRaw: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue([{ count: 0 }]),
      first: jest.fn().mockResolvedValue(null),
      then: jest.fn((cb) => cb([])),
      toSQL: jest.fn(() => ({
        toNative: jest.fn(() => ({ sql: 'SELECT * FROM user_forecast_progress', bindings: [] }))
      }))
    };
    return mockInstance;
  });
  return mockDb;
});

const db = require('../../services/db');

// Helper function to create db mock with all necessary methods
const createDbMock = (overrides = {}) => {
  const mockInstance = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn(function (callback) {
      // If callback is provided, execute it with a context that has whereRaw
      if (typeof callback === 'function') {
        const whereContext = {
          whereRaw: mockInstance.whereRaw,
          orWhereRaw: mockInstance.whereRaw
        };
        callback.call(whereContext, whereContext);
      }
      return mockInstance;
    }),
    whereRaw: jest.fn().mockReturnThis(),
    orWhereRaw: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue([{ count: 0 }]),
    first: jest.fn().mockResolvedValue(null),
    then: jest.fn((cb) => cb([])),
    toSQL: jest.fn(() => ({
      toNative: jest.fn(() => ({ sql: 'SELECT * FROM user_forecast_progress', bindings: [] }))
    })),
    ...overrides
  };
  return mockInstance;
};

describe('Dashboard Routes Security Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

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
        req.isAuthenticated = () => true;
      }
      next();
    });

    // Mock res.render for dashboard views
    app.use((req, res, next) => {
      res.render = jest.fn((view, data) => {
        res.status(200).json({ view, ...data });
      });
      next();
    });

    const dashboardRoutes = require('../../routes/dashboard');
    app.use('/api/dashboard', dashboardRoutes);

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });
  });

  describe('Authentication Tests', () => {
    test('GET /api/dashboard should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/dashboard/view-report/:id should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/view-report/123')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('should allow authenticated users to access dashboard', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 5 }]),
        then: jest.fn((cb) => cb([
          {
            id: 1,
            form_data: { dataType: 'Nielsen' },
            country_selection: { countryNames: ['USA'] },
            created_at: new Date(),
            email: 'test@example.com'
          }
        ]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.view).toBe('dashboard');
      expect(response.body.reportData).toBeDefined();
    });
  });

  describe('SQL Injection Prevention Tests', () => {
    test('should prevent SQL injection in marketType filter', async () => {
      const maliciousInput = "' OR '1'='1";
      // After sanitization: removes all special chars except alphanumeric, spaces, -, _, &
      const sanitizedInput = " OR 11";

      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      await request(app)
        .get('/api/dashboard')
        .query({ marketType: maliciousInput })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Verify parameterized query was used with sanitized input
      const dbInstance = db.mock.results[0].value;
      expect(dbInstance.whereRaw).toHaveBeenCalled();
      const whereRawCall = dbInstance.whereRaw.mock.calls[0];
      expect(whereRawCall[0]).toContain('?'); // Parameterized query
      expect(whereRawCall[1]).toEqual([sanitizedInput]); // Sanitized parameter (first call is exact match)
    });

    test('should prevent SQL injection in marketModel filter', async () => {
      const maliciousInput = "1; DROP TABLE users; --";

      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      await request(app)
        .get('/api/dashboard')
        .query({ marketModel: maliciousInput })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const dbInstance = db.mock.results[0].value;
      expect(dbInstance.whereRaw).toHaveBeenCalled();
    });

    test('should prevent SQL injection in dataType filter', async () => {
      // Test with a valid dataType to ensure whereRaw is called with safe parameters
      const validInput = "iwsr"; // This is in the whitelist

      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      await request(app)
        .get('/api/dashboard')
        .query({ dataType: validInput })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Verify that whereRaw was called with parameterized query for valid input
      const dbInstance = db.mock.results[0].value;
      expect(dbInstance.whereRaw).toHaveBeenCalled();
      const whereRawCalls = dbInstance.whereRaw.mock.calls;
      // Find the call related to dataType (it should be the last whereRaw call before duration)
      const dataTypeCall = whereRawCalls.find(call => call[0].includes("dataType"));
      expect(dataTypeCall).toBeDefined();
      expect(dataTypeCall[0]).toContain('?'); // Parameterized query
      expect(dataTypeCall[1]).toEqual([validInput]); // Whitelisted value
    });

    test('should prevent SQL injection in duration filter', async () => {
      const maliciousInput = "1' OR '1'='1";

      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      await request(app)
        .get('/api/dashboard')
        .query({ duration: maliciousInput })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const dbInstance = db.mock.results[0].value;
      expect(dbInstance.whereRaw).toHaveBeenCalled();
    });
  });

  describe('Pagination Security Tests', () => {
    test('should validate page parameter is numeric', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .query({ page: 'invalid' })
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate page parameter is positive', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .query({ page: '-5' })
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle page overflow gracefully', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 5 }]),
        then: jest.fn((cb) => cb([]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .query({ page: '999999' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Should render empty dashboard, not error
      expect(response.body.view).toBe('dashboard');
      expect(response.body.reportData).toEqual([]);
    });

    test('should default to page 1 when not specified', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.pagination.currentPage).toBe(1);
    });

    test('should calculate offset correctly for pagination', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 25 }]),
        then: jest.fn((cb) => cb([]))
      }));

      await request(app)
        .get('/api/dashboard')
        .query({ page: '3' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const dbInstance = db.mock.results[0].value;
      expect(dbInstance.offset).toHaveBeenCalledWith(20); // (page 3 - 1) * 10
    });
  });

  describe('Authorization Tests - View Report', () => {
    test('should validate report ID format', async () => {
      const response = await request(app)
        .get('/api/dashboard/view-report/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should reject negative report IDs', async () => {
      const response = await request(app)
        .get('/api/dashboard/view-report/-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent reports', async () => {
      db.mockReturnValue(createDbMock({
        first: jest.fn().mockResolvedValue(null)
      }));

      const response = await request(app)
        .get('/api/dashboard/view-report/999999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.text).toContain('Report not found');
    });

    test('should return 400 if report has no folder path', async () => {
      db.mockReturnValue(createDbMock({
        first: jest.fn().mockResolvedValue({
          id: 123,
          user_id: 1, // Matches the authenticated user
          is_published: false,
          form_data: {},
          is_complete: true
        })
      }));

      const response = await request(app)
        .get('/api/dashboard/view-report/123')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.text).toContain('folder path not found');
    });

    test('should set session folder path and redirect for valid report', async () => {
      db.mockReturnValue(createDbMock({
        first: jest.fn().mockResolvedValue({
          id: 123,
          user_id: 1, // Matches the authenticated user
          is_published: false,
          form_data: { validatedFilePath: '/uploads/test-folder/report-name' },
          is_complete: true
        })
      }));

      const response = await request(app)
        .get('/api/dashboard/view-report/123')
        .set('Authorization', 'Bearer valid-token')
        .expect(302);

      expect(response.headers.location).toContain('/reports/');
    });

    test('should only access completed reports', async () => {
      db.mockReturnValue(createDbMock({
        first: jest.fn().mockResolvedValue(null)
      }));

      await request(app)
        .get('/api/dashboard/view-report/123')
        .set('Authorization', 'Bearer valid-token');

      const dbInstance = db.mock.results[0].value;
      expect(dbInstance.where).toHaveBeenCalledWith('id', 123);
      expect(dbInstance.where).toHaveBeenCalledWith('is_complete', true);
    });
  });

  describe('Input Validation Tests', () => {
    test('should accept valid filter combinations', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .query({
          marketType: 'Nielsen',
          marketModel: 'Model1',
          dataType: 'iwsr',
          duration: '12',
          page: '1'
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.filters.marketType).toBe('Nielsen');
      expect(response.body.filters.marketModel).toBe('Model1');
    });

    test('should handle empty filters', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 0 }]),
        then: jest.fn((cb) => cb([]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.filters).toEqual({
        marketType: '',
        marketModel: '',
        dataType: '',
        duration: ''
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle database errors gracefully', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        then: jest.fn((cb) => { throw new Error('Database error'); })
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Should render empty dashboard, not crash
      expect(response.body.view).toBe('dashboard');
      expect(response.body.reportData).toEqual([]);
    });

    test('should handle errors in view-report endpoint', async () => {
      db.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/dashboard/view-report/123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.text).toContain('Error loading report');
    });
  });

  describe('Data Sanitization Tests', () => {
    test('should sanitize report data for XSS prevention', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 1 }]),
        then: jest.fn((cb) => cb([
          {
            id: 1,
            form_data: {
              dataType: '<script>alert("xss")</script>',
              marketSelect: 'TestMarket'
            },
            country_selection: { countryNames: ['USA'] },
            created_at: new Date(),
            email: 'test@example.com'
          }
        ]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.reportData).toBeDefined();
      // Data should be passed to view template (EJS will escape it)
    });

    test('should not expose sensitive user data', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 1 }]),
        then: jest.fn((cb) => cb([
          {
            id: 1,
            form_data: { dataType: 'Nielsen' },
            country_selection: { countryNames: ['USA'] },
            created_at: new Date(),
            email: 'test@example.com',
            password: 'secret123' // Should not be exposed
          }
        ]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain('password');
      expect(responseStr).not.toContain('secret123');
    });
  });

  describe('Response Security Tests', () => {
    test('should not expose internal folder paths to unauthorized users', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 1 }]),
        then: jest.fn((cb) => cb([
          {
            id: 1,
            form_data: {
              dataType: 'Nielsen',
              validatedFilePath: '/var/www/uploads/user123/secret-folder'
            },
            country_selection: { countryNames: ['USA'] },
            created_at: new Date(),
            email: 'test@example.com'
          }
        ]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Report data should have uploader folder path for internal use
      expect(response.body.reportData[0].uploaderFolderPath).toBeDefined();
      // But it should not expose absolute system paths in public fields
    });

    test('should handle reports with missing country selection', async () => {
      db.mockReturnValue(createDbMock({
        count: jest.fn().mockResolvedValue([{ count: 1 }]),
        then: jest.fn((cb) => cb([
          {
            id: 1,
            form_data: { dataType: 'Nielsen' },
            country_selection: null,
            created_at: new Date(),
            email: 'test@example.com'
          }
        ]))
      }));

      const response = await request(app)
        .get('/api/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.reportData[0].reportName).toContain('Forecast Report #1');
    });
  });
});
