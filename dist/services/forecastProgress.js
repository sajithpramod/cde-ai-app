"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveForecastProgress = saveForecastProgress;
const debugLogger_1 = require("../utils/debugLogger");
const log = (0, debugLogger_1.createModuleLogger)('forecastProgress');
async function saveForecastProgress(db, req, data) {
    const { dataType, fieldName, fileName, validatedFilePath, countryMultiSelect, countryNames, marketNames, selectedPriceTier, exchangeRate, marketSelect, typeOfModel, fromCurrency, toCurrency, subClusterSelect, forcastDuration, marketsForGrowth } = data;
    const userId = req.session.user?.id;
    const existing = await db('user_forecast_progress')
        .where({ user_id: userId, is_complete: false })
        .first();
    if (existing) {
        log.debug('Updating existing incomplete forecast:', existing.id);
    }
    else {
        log.debug('No incomplete forecast found — creating a new one.');
    }
    const newFile = fileName
        ? { field: fieldName, file_name: fileName, path: validatedFilePath }
        : null;
    const newCountrySelection = {
        countryMultiSelect,
        countryNames,
        marketNames,
    };
    const newFormData = {
        dataType,
        selectedPriceTier,
        exchangeRate,
        marketSelect,
        typeOfModel,
        fromCurrency,
        toCurrency,
        subClusterSelect,
        forcastDuration,
        validatedFilePath,
        marketsForGrowth,
    };
    let mergedFiles = newFile ? [newFile] : [];
    let mergedFormData = newFormData;
    if (existing) {
        const oldFiles = existing.uploaded_files || [];
        const fileMap = {};
        [...oldFiles, ...(newFile ? [newFile] : [])].forEach((f) => {
            fileMap[f.field] = f;
        });
        mergedFiles = Object.values(fileMap);
        mergedFormData = { ...existing.form_data, ...newFormData };
        await db('user_forecast_progress')
            .where({ id: existing.id })
            .update({
            country_selection: JSON.stringify(newCountrySelection),
            form_data: JSON.stringify(mergedFormData),
            uploaded_files: JSON.stringify(mergedFiles),
            last_step: fieldName,
            last_updated_at: db.fn.now(),
        });
    }
    else {
        await db('user_forecast_progress').insert({
            user_id: userId,
            session_id: req.sessionID || null,
            data_type: dataType,
            country_selection: JSON.stringify(newCountrySelection),
            form_data: JSON.stringify(mergedFormData),
            uploaded_files: JSON.stringify(mergedFiles),
            is_complete: false,
            last_step: fieldName,
            last_updated_at: db.fn.now(),
        });
    }
}
exports.default = { saveForecastProgress };
//# sourceMappingURL=forecastProgress.js.map