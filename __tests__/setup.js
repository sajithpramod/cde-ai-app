// Test setup file - runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.DB_NAME = process.env.DB_NAME || 'test_db';
process.env.SESSION_SECRET = 'test-session-secret';

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.mockRequest = (data = {}) => {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    session: data.session || {},
    user: data.user || null,
    file: data.file || null,
    files: data.files || null,
    headers: data.headers || {},
    ...data
  };
};

global.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

global.mockNext = () => jest.fn();

// Suppress console errors in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
  };
}
