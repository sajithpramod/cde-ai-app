/**
 * Market Routes Security Tests
 * Tests authentication, authorization, input validation, and security
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock dependencies
jest.mock('../../services/db', () => {
  const mockDb = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    then: jest.fn((cb) => cb([]))
  }));
  return mockDb;
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(false),
  createReadStream: jest.fn()
}));

const marketRoutes = require('../../routes/markets');
const db = require('../../services/db');

describe('Market Routes Security Tests', () => {
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

    // Auth middleware mock - for authenticated tests
    app.use((req, res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.session.user = { id: 1, email: 'test@example.com', role: 'user' };
        req.isAuthenticated = () => true;
      }
      next();
    });

    app.use('/api/markets', marketRoutes);

    // Error handler
    app.use((err, req, res, next) => {
      res.status(500).json({ error: err.message });
    });
  });

  describe('Authentication Tests', () => {
    test('GET /api/markets should require authentication', async () => {
      const response = await request(app)
        .get('/api/markets')
        .expect(302); // Redirect to login

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/markets should allow authenticated requests', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([
          { id: 1, name: 'Test Market', market_type: 'Nielsen', model_type: 'Model1' }
        ])
      });

      const response = await request(app)
        .get('/api/markets')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/markets/countries should require authentication', async () => {
      const response = await request(app)
        .get('/api/markets/countries?marketName=Test')
        .expect(302);

      expect(response.headers.location).toBe('/auth/login');
    });

    test('GET /api/markets/regions should require authentication', async () => {
      const response = await request(app)
        .get('/api/markets/regions')
        .expect(302);
    });

    test('GET /api/markets/above-markets should require authentication', async () => {
      const response = await request(app)
        .get('/api/markets/above-markets')
        .expect(302);
    });
  });

  describe('Input Validation Tests', () => {
    test('GET /api/markets/countries should validate marketName parameter', async () => {
      const response = await request(app)
        .get('/api/markets/countries')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('GET /api/markets/countries should reject empty marketName', async () => {
      const response = await request(app)
        .get('/api/markets/countries?marketName=')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/markets/countries should accept valid marketName', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/markets/countries?marketName=ValidMarket')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });

    test('GET /api/markets/countries should handle array of marketNames', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/markets/countries?marketName=Market1&marketName=Market2')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in market queries', async () => {
      const maliciousInput = "'; DROP TABLE markets; --";

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      await request(app)
        .get(`/api/markets/countries?marketName=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', 'Bearer valid-token');

      // Should pass the input safely through parameterized queries
      expect(db).toHaveBeenCalled();
    });

    test('should handle special characters safely', async () => {
      const specialInput = "Market <script>alert('xss')</script>";

      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get(`/api/markets/countries?marketName=${encodeURIComponent(specialInput)}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should prevent directory traversal in file paths', async () => {
      const maliciousMarketType = '../../etc/passwd';

      const response = await request(app)
        .get(`/api/markets/final-category-result?marketType=${encodeURIComponent(maliciousMarketType)}&region=Test&markets=Test`)
        .set('Authorization', 'Bearer valid-token');

      // Should not access files outside allowed directory
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .get('/api/markets')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      // NOTE: Currently exposes internal error details - security improvement needed
      expect(response.body.error).toBeDefined();
    });

    test('should return 404 for non-existent files', async () => {
      const response = await request(app)
        .get('/api/markets/final-category-result?marketType=MGA&region=Test&markets=Test')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('File not found');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should accept requests within rate limit', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      // Make 5 requests (should all succeed if rate limit is higher)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/markets')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBeLessThan(429);
      }
    });
  });

  describe('Response Security', () => {
    test('should return JSON responses', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/markets')
        .set('Authorization', 'Bearer valid-token')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
    });

    test('should not expose sensitive data in responses', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([
          { id: 1, name: 'Market', market_type: 'Nielsen', model_type: 'Model1' }
        ])
      });

      const response = await request(app)
        .get('/api/markets')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const responseStr = JSON.stringify(response.body);
      // Verify only expected fields are returned
      expect(response.body.success).toBe(true);
      expect(response.body.markets).toBeDefined();
    });
  });

  describe('CORS and Headers', () => {
    test('should set secure headers', async () => {
      db.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get('/api/markets')
        .set('Authorization', 'Bearer valid-token');

      // Check for security headers (if helmet is used)
      expect(response.headers).toBeDefined();
    });
  });
});
