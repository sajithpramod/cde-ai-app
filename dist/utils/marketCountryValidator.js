"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMarketAndCountry = validateMarketAndCountry;
const express_validator_1 = require("express-validator");
function validateMarketAndCountry() {
    return [
        (0, express_validator_1.body)('marketNames')
            .optional()
            .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed))
                        throw new Error();
                    if (parsed.some((n) => typeof n !== 'string' || n.trim() === '')) {
                        throw new Error();
                    }
                    return true;
                }
                catch {
                    throw new Error('marketNames must be a valid JSON array of non-empty strings');
                }
            }
            throw new Error('marketNames must be a JSON string');
        }),
        (0, express_validator_1.body)('countryNames')
            .optional()
            .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed))
                        throw new Error();
                    if (parsed.some((n) => typeof n !== 'string' || n.trim() === '')) {
                        throw new Error();
                    }
                    return true;
                }
                catch {
                    throw new Error('countryNames must be a valid JSON array of non-empty strings');
                }
            }
            throw new Error('countryNames must be a JSON string');
        }),
        (0, express_validator_1.body)().custom((_, { req }) => {
            let marketNames = [];
            let countryNames = [];
            try {
                if (req.body.marketNames) {
                    marketNames = JSON.parse(req.body.marketNames);
                }
                if (req.body.countryNames) {
                    countryNames = JSON.parse(req.body.countryNames);
                }
            }
            catch {
                return true;
            }
            if ((!Array.isArray(marketNames) || marketNames.length === 0) &&
                (!Array.isArray(countryNames) || countryNames.length === 0)) {
                throw new Error('At least one of marketNames or countryNames must be provided and non-empty');
            }
            return true;
        })
    ];
}
//# sourceMappingURL=marketCountryValidator.js.map