import { Knex } from 'knex';
import { Request } from 'express';
import { createModuleLogger } from '../utils/debugLogger';

const log = createModuleLogger('forecastProgress');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UploadedFile {
    field: string;
    file_name: string;
    path: string;
}

export interface CountrySelection {
    countryMultiSelect?: string[];
    countryNames?: string[];
    marketNames?: string[];
}

export interface FormData {
    dataType?: string;
    selectedPriceTier?: string[];
    exchangeRate?: number | string;
    marketSelect?: string;
    typeOfModel?: string;
    fromCurrency?: string;
    toCurrency?: string;
    subClusterSelect?: string[];
    forcastDuration?: string | number;
    validatedFilePath?: string;
    marketsForGrowth?: string[];
    [key: string]: any; // Allow additional dynamic properties
}

export interface SaveForecastProgressData {
    dataType?: string;
    fieldName?: string;
    fileName?: string;
    validatedFilePath?: string;
    countryMultiSelect?: string[];
    countryNames?: string[];
    marketNames?: string[];
    selectedPriceTier?: string[];
    exchangeRate?: number | string;
    marketSelect?: string;
    typeOfModel?: string;
    fromCurrency?: string;
    toCurrency?: string;
    subClusterSelect?: string[];
    forcastDuration?: string | number;
    marketsForGrowth?: string[];
}

interface ExistingProgress {
    id: number;
    uploaded_files: UploadedFile[];
    form_data: FormData;
    [key: string]: any;
}

// ============================================
// FUNCTIONS
// ============================================

/**
 * Save or update forecast progress in the database
 * @param db - Knex database instance
 * @param req - Express request object
 * @param data - Progress data to save
 */
export async function saveForecastProgress(
    db: Knex,
    req: Request,
    data: SaveForecastProgressData
): Promise<void> {
    const {
        dataType,
        fieldName,
        fileName,
        validatedFilePath,
        countryMultiSelect,
        countryNames,
        marketNames,
        selectedPriceTier,
        exchangeRate,
        marketSelect,
        typeOfModel,
        fromCurrency,
        toCurrency,
        subClusterSelect,
        forcastDuration,
        marketsForGrowth
    } = data;

    const userId = (req.session as any).user?.id;

    // Check if there's an incomplete record
    const existing = await db('user_forecast_progress')
        .where({ user_id: userId, is_complete: false })
        .first() as ExistingProgress | undefined;

    if (existing) {
        log.debug('Updating existing incomplete forecast:', existing.id);
    } else {
        log.debug('No incomplete forecast found — creating a new one.');
    }

    // Prepare file and data
    const newFile: UploadedFile | null = fileName
        ? { field: fieldName!, file_name: fileName, path: validatedFilePath! }
        : null;

    const newCountrySelection: CountrySelection = {
        countryMultiSelect,
        countryNames,
        marketNames,
    };

    const newFormData: FormData = {
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

    let mergedFiles: UploadedFile[] = newFile ? [newFile] : [];
    let mergedFormData: FormData = newFormData;

    if (existing) {
        const oldFiles = existing.uploaded_files || [];
        const fileMap: { [key: string]: UploadedFile } = {};

        [...oldFiles, ...(newFile ? [newFile] : [])].forEach((f) => {
            fileMap[f.field] = f;
        });

        mergedFiles = Object.values(fileMap);
        mergedFormData = { ...existing.form_data, ...newFormData };

        // Update existing incomplete record
        await db('user_forecast_progress')
            .where({ id: existing.id })
            .update({
                country_selection: JSON.stringify(newCountrySelection),
                form_data: JSON.stringify(mergedFormData),
                uploaded_files: JSON.stringify(mergedFiles),
                last_step: fieldName,
                last_updated_at: db.fn.now(),
            });
    } else {
        // Create new record
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

// Export for backward compatibility
export default { saveForecastProgress };
