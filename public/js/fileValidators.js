export function validateFile(file) {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.type)) {
        return 'Invalid file type. Allowed: CSV, XLSX, XLS';
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        return 'File too large. Max 5MB allowed.';
    }

    return null; // Valid
}

export function validateInputs(exchangeRate, selectedPriceTier, fieldName) {
    if (isNaN(exchangeRate) || exchangeRate < 0) {
        return 'Invalid exchange rate.';
    }
    // if (!selectedPriceTier) {
    //     return 'Price tier not selected.';
    // }
    if (!/^[a-zA-Z0-9_]+$/.test(fieldName)) {
        return 'Invalid field name.';
    }
    return null;
}