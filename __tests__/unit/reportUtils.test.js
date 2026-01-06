const {
  isValidName,
  safeJoin,
  isNumeric,
  getRoleColor,
  getFileListForSection,
  getHeatMapStats,
  formatHeader,
  isStrictNumber
} = require('../../utils/reportUtils');

describe('Report Utils', () => {

  describe('isValidName', () => {
    test('should accept alphanumeric names', () => {
      expect(isValidName('Report123')).toBe(true);
    });

    test('should accept names with spaces', () => {
      expect(isValidName('My Report 2024')).toBe(true);
    });

    test('should accept names with underscores', () => {
      expect(isValidName('my_report_name')).toBe(true);
    });

    test('should accept names with hyphens', () => {
      expect(isValidName('my-report-name')).toBe(true);
    });

    test('should reject names with special characters', () => {
      expect(isValidName('report@2024')).toBe(false);
      expect(isValidName('report#123')).toBe(false);
      expect(isValidName('report$name')).toBe(false);
    });

    test('should reject names with forward slashes', () => {
      expect(isValidName('report/test')).toBe(false);
    });

    test('should reject names with backslashes', () => {
      expect(isValidName('report\\test')).toBe(false);
    });

    test('should reject empty strings', () => {
      expect(isValidName('')).toBe(false);
    });
  });

  describe('safeJoin', () => {
    test('should join safe paths correctly', () => {
      const result = safeJoin('/base/path', 'subfolder/file.txt');
      expect(result).toContain('subfolder');
      expect(result).toContain('file.txt');
    });

    test('should prevent directory traversal attacks', () => {
      expect(() => {
        safeJoin('/base/path', '../../../etc/passwd');
      }).toThrow('Unsafe path access detected');
    });

    test('should prevent absolute path injection', () => {
      expect(() => {
        safeJoin('/base/path', '/etc/passwd');
      }).toThrow('Unsafe path access detected');
    });

    test('should handle nested safe paths', () => {
      const result = safeJoin('/base/path', 'folder1/folder2/file.txt');
      expect(result).toContain('folder1');
      expect(result).toContain('folder2');
    });

    test('should handle current directory reference safely', () => {
      expect(() => {
        safeJoin('/base/path', './file.txt');
      }).not.toThrow();
    });
  });

  describe('isNumeric', () => {
    test('should return true for valid numbers', () => {
      expect(isNumeric(123)).toBe(true);
      expect(isNumeric(123.45)).toBe(true);
      expect(isNumeric(-123)).toBe(true);
      expect(isNumeric(0)).toBe(true);
    });

    test('should return true for numeric strings', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('123.45')).toBe(true);
      expect(isNumeric('-123')).toBe(true);
    });

    test('should return false for non-numeric values', () => {
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('12abc')).toBe(false);
    });

    test('should return false for null', () => {
      expect(isNumeric(null)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isNumeric('')).toBe(false);
    });

    test('should return false for NaN', () => {
      expect(isNumeric(NaN)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(isNumeric(undefined)).toBe(false);
    });
  });

  describe('isStrictNumber', () => {
    test('should return true for number types', () => {
      expect(isStrictNumber(123)).toBe(true);
      expect(isStrictNumber(123.45)).toBe(true);
      expect(isStrictNumber(-123)).toBe(true);
      expect(isStrictNumber(0)).toBe(true);
    });

    test('should return true for strict numeric strings', () => {
      expect(isStrictNumber('123')).toBe(true);
      expect(isStrictNumber('123.45')).toBe(true);
      expect(isStrictNumber('-123.45')).toBe(true);
    });

    test('should return true for strings with whitespace', () => {
      expect(isStrictNumber('  123  ')).toBe(true);
      expect(isStrictNumber(' -123.45 ')).toBe(true);
    });

    test('should return false for non-numeric strings', () => {
      expect(isStrictNumber('abc')).toBe(false);
      expect(isStrictNumber('12abc')).toBe(false);
      expect(isStrictNumber('abc12')).toBe(false);
    });

    test('should return false for strings with commas', () => {
      expect(isStrictNumber('1,234')).toBe(false);
    });

    test('should return false for special number strings', () => {
      expect(isStrictNumber('Infinity')).toBe(false);
      expect(isStrictNumber('NaN')).toBe(false);
    });

    test('should return false for null and undefined', () => {
      expect(isStrictNumber(null)).toBe(false);
      expect(isStrictNumber(undefined)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isStrictNumber('')).toBe(false);
      expect(isStrictNumber('   ')).toBe(false);
    });
  });

  describe('getRoleColor', () => {
    test('should return correct color for "Invest to grow(ahead)"', () => {
      expect(getRoleColor('Invest to grow(ahead)')).toBe('#EAF6DD');
    });

    test('should return correct color for "Invest to grow(now)"', () => {
      expect(getRoleColor('Invest to grow(now)')).toBe('#CBF0DD');
    });

    test('should return correct color for "Selective Plays"', () => {
      expect(getRoleColor('Selective Plays')).toBe('#FCE7D0');
    });

    test('should return correct color for "Maintain"', () => {
      expect(getRoleColor('Maintain')).toBe('#E7F6FD');
    });

    test('should return empty string for unknown role', () => {
      expect(getRoleColor('Unknown Role')).toBe('');
    });

    test('should return empty string for null', () => {
      expect(getRoleColor(null)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(getRoleColor('')).toBe('');
    });
  });

  describe('getFileListForSection', () => {
    test('should return correct files for "Final Model" section', () => {
      const result = getFileListForSection('Final Model');
      expect(result).toHaveLength(9);
      expect(result[0]).toEqual({ name: 'Price Tier Forecast input by user', file: 'pt_growth_input_filled' });
      expect(result[8]).toEqual({ name: 'Decision Matrix', file: 'Decision Matrix' });
    });

    test('should return correct files for "Serves Top-Down" section', () => {
      const result = getFileListForSection('Serves Top-Down');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Motivations Trend', file: 'Motivations trend' });
      expect(result[2]).toEqual({ name: 'Display Top-Down Forecasts', file: 'Top Down serves forecast' });
    });

    test('should return correct files for "Serves Bottom-Up" section', () => {
      const result = getFileListForSection('Serves Bottom-Up');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Display Foresight Trends', file: 'Foresights trend' });
      expect(result[2]).toEqual({ name: 'Display Bottom-up Forecasts', file: 'Bottomup serves forecast' });
    });

    test('should return correct files for "Serves Ensemble-Forcast" section', () => {
      const result = getFileListForSection('Serves Ensemble-Forcast');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Display Ensemble Weights', file: 'Ensemble weights' });
      expect(result[1]).toEqual({ name: 'Display Ensemble Forecasts', file: 'Ensemble serves forecast' });
    });

    test('should return empty array for unknown section', () => {
      const result = getFileListForSection('Unknown Section');
      expect(result).toEqual([]);
    });

    test('should return empty array for null section', () => {
      const result = getFileListForSection(null);
      expect(result).toEqual([]);
    });

    test('should return empty array for empty string', () => {
      const result = getFileListForSection('');
      expect(result).toEqual([]);
    });
  });

  describe('getHeatMapStats', () => {
    test('should calculate stats correctly for numeric data', () => {
      const headers = ['Column1', 'Column2'];
      const rows = [
        { Column1: '10', Column2: '20' },
        { Column1: '30', Column2: '40' },
        { Column1: '50', Column2: '60' }
      ];

      const stats = getHeatMapStats(headers, rows);

      expect(stats.Column1).toEqual({ min: 10, max: 50, mid: 30 });
      expect(stats.Column2).toEqual({ min: 20, max: 60, mid: 40 });
    });

    test('should handle single row of data', () => {
      const headers = ['Value'];
      const rows = [{ Value: '100' }];

      const stats = getHeatMapStats(headers, rows);

      expect(stats.Value).toEqual({ min: 100, max: 100, mid: 100 });
    });

    test('should ignore non-numeric values', () => {
      const headers = ['Numbers'];
      const rows = [
        { Numbers: '10' },
        { Numbers: 'invalid' },
        { Numbers: '20' }
      ];

      const stats = getHeatMapStats(headers, rows);

      // After sorting and filtering non-numeric: [10, 20]
      // mid is at index Math.floor(2/2) = 1, which is 20
      expect(stats.Numbers).toEqual({ min: 10, max: 20, mid: 20 });
    });

    test('should handle empty rows', () => {
      const headers = ['Column1'];
      const rows = [];

      const stats = getHeatMapStats(headers, rows);

      expect(stats).toEqual({});
    });

    test('should handle negative numbers', () => {
      const headers = ['Values'];
      const rows = [
        { Values: '-10' },
        { Values: '0' },
        { Values: '10' }
      ];

      const stats = getHeatMapStats(headers, rows);

      expect(stats.Values).toEqual({ min: -10, max: 10, mid: 0 });
    });

    test('should handle decimal numbers', () => {
      const headers = ['Decimals'];
      const rows = [
        { Decimals: '1.5' },
        { Decimals: '2.7' },
        { Decimals: '3.9' }
      ];

      const stats = getHeatMapStats(headers, rows);

      expect(stats.Decimals.min).toBe(1.5);
      expect(stats.Decimals.max).toBe(3.9);
      expect(stats.Decimals.mid).toBe(2.7);
    });
  });

  describe('formatHeader', () => {
    test('should format user_value_per to CAGR %', () => {
      expect(formatHeader('user_value_per')).toBe('CAGR %');
      expect(formatHeader('USER_VALUE_PER')).toBe('CAGR %');
    });

    test('should format user_value_b100 to Base100', () => {
      expect(formatHeader('user_value_b100')).toBe('Base100');
      expect(formatHeader('USER_VALUE_B100')).toBe('Base100');
    });

    test('should replace underscores with spaces', () => {
      expect(formatHeader('first_name')).toBe('First Name');
      expect(formatHeader('user_email_address')).toBe('User Email Address');
    });

    test('should replace dots with spaces', () => {
      expect(formatHeader('user.name')).toBe('User Name');
      expect(formatHeader('email.address')).toBe('Email Address');
    });

    test('should handle camelCase', () => {
      expect(formatHeader('firstName')).toBe('First Name');
      expect(formatHeader('emailAddress')).toBe('Email Address');
    });

    test('should capitalize first letter of each word', () => {
      expect(formatHeader('total_value')).toBe('Total Value');
      expect(formatHeader('market_share')).toBe('Market Share');
    });

    test('should handle mixed formats', () => {
      expect(formatHeader('total_market.shareValue')).toBe('Total Market Share Value');
    });

    test('should handle single word', () => {
      expect(formatHeader('value')).toBe('Value');
      expect(formatHeader('name')).toBe('Name');
    });

    test('should handle already formatted headers', () => {
      expect(formatHeader('Total Value')).toBe('Total Value');
    });

    test('should handle empty string', () => {
      expect(formatHeader('')).toBe('');
    });
  });
});
