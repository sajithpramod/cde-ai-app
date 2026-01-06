"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountryColumnForFileType = getCountryColumnForFileType;
exports.getMappedColumnForFileType = getMappedColumnForFileType;
exports.determineFileType = determineFileType;
exports.getExpectedCountriesForValidation = getExpectedCountriesForValidation;
const db_1 = __importDefault(require("./db"));
function getCountryColumnForFileType(fileType) {
    if (!fileType)
        return null;
    const columnMapping = {
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
function getMappedColumnForFileType(fileType) {
    if (!fileType)
        return null;
    const mappedColumnMapping = {
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
function determineFileType(dataType, fieldName) {
    const specificFileTypes = [
        ' ategoryRSVFile',
        'TBSNSVFile',
        'ForesightFile',
        'CPSdataFile',
        'CCFbackdataFile'
    ];
    if (specificFileTypes.includes(fieldName)) {
        return fieldName;
    }
    if (fieldName === 'initialDataFile') {
        if (dataType === 'Nielsen') {
            return 'Nielsen';
        }
        else if (dataType === 'iwsr') {
            return 'IWSRData';
        }
    }
    return null;
}
async function getExpectedCountriesForValidation(fileType, _dataType, selectedCountries, _selectionType) {
    if (!fileType || !selectedCountries || selectedCountries.length === 0) {
        return [];
    }
    const countryColumn = getCountryColumnForFileType(fileType);
    const mappedColumn = getMappedColumnForFileType(fileType);
    if (!countryColumn || !mappedColumn) {
        return [];
    }
    try {
        const countries = await (0, db_1.default)('countries')
            .select('country_name', 'is_cluster_country', countryColumn, mappedColumn)
            .whereIn('country_name', selectedCountries);
        const expectedCountries = [];
        for (const country of countries) {
            if (country.is_cluster_country) {
                try {
                    const mappedCountries = JSON.parse(country[mappedColumn] || '[]');
                    if (Array.isArray(mappedCountries) && mappedCountries.length > 0) {
                        expectedCountries.push(...mappedCountries);
                    }
                    else {
                        if (country[countryColumn]) {
                            expectedCountries.push(country[countryColumn]);
                        }
                    }
                }
                catch (e) {
                    if (country[countryColumn]) {
                        expectedCountries.push(country[countryColumn]);
                    }
                }
            }
            else {
                if (country[countryColumn]) {
                    expectedCountries.push(country[countryColumn]);
                }
            }
        }
        return Array.from(new Set(expectedCountries)).filter((c) => c && c.trim() !== '');
    }
    catch (error) {
        throw error;
    }
}
exports.default = {
    getCountryColumnForFileType,
    getMappedColumnForFileType,
    determineFileType,
    getExpectedCountriesForValidation
};
//# sourceMappingURL=countryValidator.js.map