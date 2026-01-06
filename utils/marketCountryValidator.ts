import { body, ValidationChain } from 'express-validator';

export function validateMarketAndCountry(): ValidationChain[] {
    return [
        body('marketNames')
            .optional()
            .custom((value: unknown) => {
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        if (!Array.isArray(parsed)) throw new Error();
                        if (parsed.some((n: unknown) => typeof n !== 'string' || n.trim() === '')) {
                            throw new Error();
                        }
                        return true;
                    } catch {
                        throw new Error('marketNames must be a valid JSON array of non-empty strings');
                    }
                }
                throw new Error('marketNames must be a JSON string');
            }),

        body('countryNames')
            .optional()
            .custom((value: unknown) => {
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        if (!Array.isArray(parsed)) throw new Error();
                        if (parsed.some((n: unknown) => typeof n !== 'string' || n.trim() === '')) {
                            throw new Error();
                        }
                        return true;
                    } catch {
                        throw new Error('countryNames must be a valid JSON array of non-empty strings');
                    }
                }
                throw new Error('countryNames must be a JSON string');
            }),

        // Custom validator to ensure at least one of them is provided and non-empty
        body().custom((_, { req }) => {
            let marketNames: string[] = [];
            let countryNames: string[] = [];

            try {
                if (req.body.marketNames) {
                    marketNames = JSON.parse(req.body.marketNames);
                }
                if (req.body.countryNames) {
                    countryNames = JSON.parse(req.body.countryNames);
                }
            } catch {
                // Parsing handled above; skip here
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
