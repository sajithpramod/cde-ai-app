import db from './db';
import { TemplateType } from './templateValidator';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CountryColumnMapping {
    [key: string]: string;
}

interface CountryRecord {
    country_name: string;
    is_cluster_country: boolean;
    [key: string]: any; // For dynamic column access
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Get the country column name for a specific file type
 * @param fileType - The type of file being processed
 * @returns The country column name or null
 */
export function getCountryColumnForFileType(fileType: string): string | null {
    if (!fileType) return null;

    const columnMapping: CountryColumnMapping = {
        ' ategoryRSVFile': 'ddh_iwsr',
        'TBSNSVFile': 'ddh_iwsr',
        'IWSRData': 'ddh_iwsr',
        'Nielsen': 'ddh_retail',
        'ForesightFile': 'foresights',
        'CPSdataFile': 'kantar',
        'CCFbackdataFile': 'kantar'
    };

    return columnMapping[fileType] || null;
}

/**
 * Get the mapped column name for a specific file type
 * @param fileType - The type of file being processed
 * @returns The mapped column name or null
 */
export function getMappedColumnForFileType(fileType: string): string | null {
    if (!fileType) return null;

    const mappedColumnMapping: CountryColumnMapping = {
        ' ategoryRSVFile': 'mapped_ddh_iwsr',
        'TBSNSVFile': 'mapped_ddh_iwsr',
        'IWSRData': 'mapped_ddh_iwsr',
        'Nielsen': 'mapped_ddh_retails',
        'ForesightFile': 'mapped_forsight',
        'CPSdataFile': 'mapped_kantar',
        'CCFbackdataFile': 'mapped_kantar'
    };

    return mappedColumnMapping[fileType] || null;
}

/**
 * Determine the file type based on dataType and fieldName
 * @param dataType - The data type (e.g., 'Nielsen', 'iwsr')
 * @param fieldName - The field name from the upload form
 * @returns The determined file type or null
 */
export function determineFileType(dataType: string, fieldName: string): TemplateType | null {
    // Check if fieldName is a specific file type
    const specificFileTypes: TemplateType[] = [
        ' ategoryRSVFile',
        'TBSNSVFile',
        'ForesightFile',
        'CPSdataFile',
        'CCFbackdataFile'
    ];

    if (specificFileTypes.includes(fieldName as TemplateType)) {
        return fieldName as TemplateType;
    }

    // Handle initialDataFile based on dataType
    if (fieldName === 'initialDataFile') {
        if (dataType === 'Nielsen') {
            return 'Nielsen';
        } else if (dataType === 'iwsr') {
            return 'IWSRData';
        }
    }

    return null;
}

/**
 * Get expected countries for validation from the database
 * @param fileType - The file type
 * @param dataType - The data type
 * @param selectedCountries - The countries selected by the user
 * @param selectionType - 'AllCountries' or 'Subclusters'
 * @returns Array of expected country codes
 */
export async function getExpectedCountriesForValidation(
    fileType: string,
    _dataType: string,
    selectedCountries: string[],
    _selectionType: string
): Promise<string[]> {
    // Return empty if no file type or selected countries
    if (!fileType || !selectedCountries || selectedCountries.length === 0) {
        return [];
    }

    const countryColumn = getCountryColumnForFileType(fileType);
    const mappedColumn = getMappedColumnForFileType(fileType);

    if (!countryColumn || !mappedColumn) {
        return [];
    }

    try {
        // Query the database for country information
        const countries = await db('countries')
            .select('country_name', 'is_cluster_country', countryColumn, mappedColumn)
            .whereIn('country_name', selectedCountries) as CountryRecord[];

        const expectedCountries: string[] = [];

        for (const country of countries) {
            if (country.is_cluster_country) {
                // For cluster countries, always try to parse the mapped column
                try {
                    const mappedCountries = JSON.parse(country[mappedColumn] || '[]');
                    if (Array.isArray(mappedCountries) && mappedCountries.length > 0) {
                        expectedCountries.push(...mappedCountries);
                    } else {
                        // Fallback to single country if mapping fails or is empty
                        if (country[countryColumn]) {
                            expectedCountries.push(country[countryColumn]);
                        }
                    }
                } catch (e) {
                    // If JSON parsing fails, use the single country value
                    if (country[countryColumn]) {
                        expectedCountries.push(country[countryColumn]);
                    }
                }
            } else {
                // For regular countries, use the country column
                if (country[countryColumn]) {
                    expectedCountries.push(country[countryColumn]);
                }
            }
        }

        // Remove duplicates and filter out empty values
        return Array.from(new Set(expectedCountries)).filter((c: string) => c && c.trim() !== '');
    } catch (error) {
        throw error;
    }
}

// Export for backward compatibility
export default {
    getCountryColumnForFileType,
    getMappedColumnForFileType,
    determineFileType,
    getExpectedCountriesForValidation
};
