/* global jest */
// Database helper utilities - no actual db import needed for mocking

/**
 * Database helper utilities for tests
 */
class DatabaseHelper {
    /**
   * Create a mock database connection pool
   */
    static mockPool() {
        return {
            query: jest.fn(),
            execute: jest.fn(),
            getConnection: jest.fn(),
            end: jest.fn()
        };
    }

    /**
   * Create a mock database connection
   */
    static mockConnection() {
        const connection = {
            query: jest.fn(),
            execute: jest.fn(),
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            destroy: jest.fn()
        };
        return connection;
    }

    /**
   * Mock successful query response
   */
    static mockQuerySuccess(data = []) {
        return Promise.resolve([data, []]);
    }

    /**
   * Mock query error
   */
    static mockQueryError(message = 'Database error') {
        return Promise.reject(new Error(message));
    }

    /**
   * Create mock rows for database results
   */
    static createMockRows(count, template = {}) {
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            ...template
        }));
    }

    /**
   * Mock country data
   */
    static mockCountries() {
        return [
            { id: 1, country_name: 'United States', country_code: 'US', region_id: 1 },
            { id: 2, country_name: 'Canada', country_code: 'CA', region_id: 1 },
            { id: 3, country_name: 'United Kingdom', country_code: 'GB', region_id: 2 }
        ];
    }

    /**
   * Mock region data
   */
    static mockRegions() {
        return [
            { id: 1, region_name: 'North America' },
            { id: 2, region_name: 'Europe' },
            { id: 3, region_name: 'Asia Pacific' }
        ];
    }

    /**
   * Mock market data
   */
    static mockMarkets() {
        return [
            { id: 1, market_name: 'US Market', country_id: 1 },
            { id: 2, market_name: 'CA Market', country_id: 2 },
            { id: 3, market_name: 'UK Market', country_id: 3 }
        ];
    }

    /**
   * Mock occasion data
   */
    static mockOccasions() {
        return [
            { id: 1, occasion_name: 'Christmas', occasion_date: '2025-12-25' },
            { id: 2, occasion_name: 'New Year', occasion_date: '2025-01-01' },
            { id: 3, occasion_name: 'Easter', occasion_date: '2025-04-20' }
        ];
    }

    /**
   * Mock forecast data
   */
    static mockForecasts() {
        return [
            {
                id: 1,
                market_id: 1,
                occasion_id: 1,
                year: 2025,
                forecast_value: 1000000,
                created_at: new Date()
            }
        ];
    }

    /**
   * Clean up test database (use with caution)
   */
    static async cleanupTestData(table) {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('Can only cleanup in test environment');
        }
        // Implementation depends on your test database strategy
        console.log(`Cleaning up ${table} for tests`);
    }
}

module.exports = DatabaseHelper;
