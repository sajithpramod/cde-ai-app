const {
  getCountryColumnForFileType,
  getMappedColumnForFileType,
  determineFileType,
  getExpectedCountriesForValidation
} = require('../../services/countryValidator');

// Mock the database
jest.mock('../../services/db', () => {
  return jest.fn();
});

const db = require('../../services/db');

describe('Country Validator', () => {

  describe('getCountryColumnForFileType', () => {
    test('should return correct column for ''ategoryRSVFile', () => {
      expect(getCountryColumnForFileType('''ategoryRSVFile')).toBe('ddh_iwsr');
    });

    test('should return correct column for TBSNSVFile', () => {
      expect(getCountryColumnForFileType('TBSNSVFile')).toBe('ddh_iwsr');
    });

    test('should return correct column for IWSRData', () => {
      expect(getCountryColumnForFileType('IWSRData')).toBe('ddh_iwsr');
    });

    test('should return correct column for Nielsen', () => {
      expect(getCountryColumnForFileType('Nielsen')).toBe('ddh_retail');
    });

    test('should return correct column for ForesightFile', () => {
      expect(getCountryColumnForFileType('ForesightFile')).toBe('foresights');
    });

    test('should return correct column for CPSdataFile', () => {
      expect(getCountryColumnForFileType('CPSdataFile')).toBe('kantar');
    });

    test('should return correct column for CCFbackdataFile', () => {
      expect(getCountryColumnForFileType('CCFbackdataFile')).toBe('kantar');
    });

    test('should return null for unknown file type', () => {
      expect(getCountryColumnForFileType('UnknownFileType')).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(getCountryColumnForFileType('')).toBeNull();
    });

    test('should return null for null input', () => {
      expect(getCountryColumnForFileType(null)).toBeNull();
    });
  });

  describe('getMappedColumnForFileType', () => {
    test('should return correct mapped column for ''ategoryRSVFile', () => {
      expect(getMappedColumnForFileType('''ategoryRSVFile')).toBe('mapped_ddh_iwsr');
    });

    test('should return correct mapped column for TBSNSVFile', () => {
      expect(getMappedColumnForFileType('TBSNSVFile')).toBe('mapped_ddh_iwsr');
    });

    test('should return correct mapped column for IWSRData', () => {
      expect(getMappedColumnForFileType('IWSRData')).toBe('mapped_ddh_iwsr');
    });

    test('should return correct mapped column for Nielsen', () => {
      expect(getMappedColumnForFileType('Nielsen')).toBe('mapped_ddh_retails');
    });

    test('should return correct mapped column for ForesightFile', () => {
      expect(getMappedColumnForFileType('ForesightFile')).toBe('mapped_forsight');
    });

    test('should return correct mapped column for CPSdataFile', () => {
      expect(getMappedColumnForFileType('CPSdataFile')).toBe('mapped_kantar');
    });

    test('should return correct mapped column for CCFbackdataFile', () => {
      expect(getMappedColumnForFileType('CCFbackdataFile')).toBe('mapped_kantar');
    });

    test('should return null for unknown file type', () => {
      expect(getMappedColumnForFileType('UnknownFileType')).toBeNull();
    });
  });

  describe('determineFileType', () => {
    test('should return Nielsen for Nielsen dataType and initialDataFile', () => {
      expect(determineFileType('Nielsen', 'initialDataFile')).toBe('Nielsen');
    });

    test('should return IWSRData for iwsr dataType and initialDataFile', () => {
      expect(determineFileType('iwsr', 'initialDataFile')).toBe('IWSRData');
    });

    test('should return fileType for ''ategoryRSVFile fieldName', () => {
      expect(determineFileType('anyDataType', '''ategoryRSVFile')).toBe('''ategoryRSVFile');
    });

    test('should return fileType for TBSNSVFile fieldName', () => {
      expect(determineFileType('anyDataType', 'TBSNSVFile')).toBe('TBSNSVFile');
    });

    test('should return fileType for ForesightFile fieldName', () => {
      expect(determineFileType('anyDataType', 'ForesightFile')).toBe('ForesightFile');
    });

    test('should return fileType for CPSdataFile fieldName', () => {
      expect(determineFileType('anyDataType', 'CPSdataFile')).toBe('CPSdataFile');
    });

    test('should return fileType for CCFbackdataFile fieldName', () => {
      expect(determineFileType('anyDataType', 'CCFbackdataFile')).toBe('CCFbackdataFile');
    });

    test('should return null for unknown combination', () => {
      expect(determineFileType('unknownDataType', 'unknownFieldName')).toBeNull();
    });

    test('should return null for invalid dataType with initialDataFile', () => {
      expect(determineFileType('invalidType', 'initialDataFile')).toBeNull();
    });
  });

  describe('getExpectedCountriesForValidation', () => {
    let mockSelect, mockWhereIn;

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup mock chain
      mockWhereIn = jest.fn();
      mockSelect = jest.fn().mockReturnValue({ whereIn: mockWhereIn });
      db.mockReturnValue({ select: mockSelect });
    });

    test('should return empty array when fileType is null', async () => {
      const result = await getExpectedCountriesForValidation(null, 'Nielsen', ['USA'], 'AllCountries');
      expect(result).toEqual([]);
    });

    test('should return empty array when selectedCountries is empty', async () => {
      const result = await getExpectedCountriesForValidation('Nielsen', 'Nielsen', [], 'AllCountries');
      expect(result).toEqual([]);
    });

    test('should return empty array when selectedCountries is null', async () => {
      const result = await getExpectedCountriesForValidation('Nielsen', 'Nielsen', null, 'AllCountries');
      expect(result).toEqual([]);
    });

    test('should handle regular countries correctly', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'United States',
          is_cluster_country: false,
          ddh_retail: 'USA',
          mapped_ddh_retails: null
        },
        {
          country_name: 'Canada',
          is_cluster_country: false,
          ddh_retail: 'CAN',
          mapped_ddh_retails: null
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'Nielsen',
        'Nielsen',
        ['United States', 'Canada'],
        'AllCountries'
      );

      expect(result).toEqual(['USA', 'CAN']);
      expect(db).toHaveBeenCalledWith('countries');
      expect(mockSelect).toHaveBeenCalledWith('country_name', 'is_cluster_country', 'ddh_retail', 'mapped_ddh_retails');
      expect(mockWhereIn).toHaveBeenCalledWith('country_name', ['United States', 'Canada']);
    });

    test('should handle cluster countries correctly', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'Europe Cluster',
          is_cluster_country: true,
          ddh_iwsr: null,
          mapped_ddh_iwsr: JSON.stringify(['Germany', 'France', 'Spain'])
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'IWSRData',
        'iwsr',
        ['Europe Cluster'],
        'Subclusters'
      );

      expect(result).toEqual(['Germany', 'France', 'Spain']);
    });

    test('should handle mix of regular and cluster countries', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'United States',
          is_cluster_country: false,
          ddh_iwsr: 'USA',
          mapped_ddh_iwsr: null
        },
        {
          country_name: 'Europe Cluster',
          is_cluster_country: true,
          ddh_iwsr: null,
          mapped_ddh_iwsr: JSON.stringify(['Germany', 'France'])
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'IWSRData',
        'iwsr',
        ['United States', 'Europe Cluster'],
        'AllCountries'
      );

      expect(result).toEqual(['USA', 'Germany', 'France']);
    });

    test('should remove duplicates from results', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'Cluster1',
          is_cluster_country: true,
          ddh_iwsr: null,
          mapped_ddh_iwsr: JSON.stringify(['USA', 'Canada'])
        },
        {
          country_name: 'Cluster2',
          is_cluster_country: true,
          ddh_iwsr: null,
          mapped_ddh_iwsr: JSON.stringify(['USA', 'Mexico'])
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'IWSRData',
        'iwsr',
        ['Cluster1', 'Cluster2'],
        'Subclusters'
      );

      expect(result).toEqual(['USA', 'Canada', 'Mexico']);
      expect(result.filter(c => c === 'USA').length).toBe(1);
    });

    test('should filter out empty values', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'Country1',
          is_cluster_country: false,
          ddh_retail: 'USA',
          mapped_ddh_retails: null
        },
        {
          country_name: 'Country2',
          is_cluster_country: false,
          ddh_retail: '',
          mapped_ddh_retails: null
        },
        {
          country_name: 'Country3',
          is_cluster_country: false,
          ddh_retail: null,
          mapped_ddh_retails: null
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'Nielsen',
        'Nielsen',
        ['Country1', 'Country2', 'Country3'],
        'AllCountries'
      );

      expect(result).toEqual(['USA']);
    });

    test('should handle invalid JSON in mapped column gracefully', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'Cluster1',
          is_cluster_country: true,
          ddh_iwsr: 'FallbackCountry',
          mapped_ddh_iwsr: 'invalid json'
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'IWSRData',
        'iwsr',
        ['Cluster1'],
        'Subclusters'
      );

      // Should fallback to single country value
      expect(result).toEqual(['FallbackCountry']);
    });

    test('should handle database errors by throwing', async () => {
      mockWhereIn.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        getExpectedCountriesForValidation('Nielsen', 'Nielsen', ['USA'], 'AllCountries')
      ).rejects.toThrow('Database connection failed');
    });

    test('should work with ForesightFile type', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'United States',
          is_cluster_country: false,
          foresights: 'US',
          mapped_forsight: null
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'ForesightFile',
        'foresight',
        ['United States'],
        'AllCountries'
      );

      expect(result).toEqual(['US']);
      expect(mockSelect).toHaveBeenCalledWith('country_name', 'is_cluster_country', 'foresights', 'mapped_forsight');
    });

    test('should work with Kantar file types', async () => {
      mockWhereIn.mockResolvedValue([
        {
          country_name: 'United Kingdom',
          is_cluster_country: false,
          kantar: 'UK',
          mapped_kantar: null
        }
      ]);

      const result = await getExpectedCountriesForValidation(
        'CPSdataFile',
        'kantar',
        ['United Kingdom'],
        'AllCountries'
      );

      expect(result).toEqual(['UK']);
      expect(mockSelect).toHaveBeenCalledWith('country_name', 'is_cluster_country', 'kantar', 'mapped_kantar');
    });
  });
});
