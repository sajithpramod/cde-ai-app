import { showFlashMessage } from './uiHelpers.js';

export function populateForm(prefillData = {}) {
    console.log("Prefilling form with data:", prefillData);
    
  
    // Helper: Set value safely
    const setValue = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.value = value ?? '';
    };
  
    // Helper: Select dropdown
    const selectDropdown = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) {
            el.value = value;
            el.dispatchEvent(new Event('change'));
        }
    };
  
    // Helper: Multi-select
    const selectMultiple = (selector, values) => {
        const el = document.querySelector(selector);
        if (el && Array.isArray(values)) {
            [...el.options].forEach(opt => {
                opt.selected = values.includes(opt.value);
            });
            el.dispatchEvent(new Event('change'));
        }
    };
  
    // Helper: Radio
    const selectRadio = (name, value) => {
        if (!value) return;
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        radios.forEach(r => {
            r.checked = (r.value === value);
        });
    };
  
    // --- 1️⃣ Forecasting scope ---
    if (prefillData.typeOfModel) selectDropdown('#typeOfModel', prefillData.typeOfModel);
  
    // --- 2️⃣ Market segmentation type (above-market only) ---
    if (prefillData.marketModel) {
        document.querySelector('#marketModelSection')?.classList.remove('d-none');
        selectDropdown('#marketModel', prefillData.marketModel);
    }
  
    // --- 3️⃣ Market dropdown ---
    if (prefillData.marketId) selectDropdown('#marketSelect', prefillData.marketId);
  
    // --- 4️⃣ Sub-cluster selection ---
    // if (prefillData.subClusterSelect) selectDropdown('#subClusterSelect', prefillData.subClusterSelect);
  
    // --- 5️⃣ Multi-country selection ---
    // if (prefillData.countryMultiSelect) {
    //     document.querySelector('#countryMultiSelectSection')?.classList.remove('d-none');
    //     selectMultiple('#countryMultiSelect', prefillData.countryMultiSelect);
    // }
  
    // --- 6️⃣ Forecast output file name ---
    if (prefillData.comment) {
        document.querySelector('#subclusterteaxtarea')?.classList.remove('d-none');
        setValue('#comment', prefillData.comment);
    }
  
    // --- 7️⃣ Data type ---
    if (prefillData.dataType) {
        const dataType = document.getElementById('dataType');
        document.querySelector('#dataTypeSection')?.classList.remove('hidden');
        selectDropdown('#dataType', prefillData.dataType);
        dataType.dispatchEvent(new Event('change', { bubbles: true }));
    }
  
    // --- 8️⃣ Currency selections ---
    if (prefillData.fromCurrency) setValue('#fromCurrency', prefillData.fromCurrency);
    if (prefillData.toCurrency) setValue('#toCurrency', prefillData.toCurrency);
    if (prefillData.exchangeRate) setValue('#exchangeRate', prefillData.exchangeRate);
  
    // --- 9️⃣ Price tier rename and rank ---
    if (prefillData.priceTiers && Array.isArray(prefillData.priceTiers)) {
        const rows = document.querySelectorAll('#priceTierRenameRank tbody tr');
        prefillData.priceTiers.forEach((tier, i) => {
            const row = rows[i];
            if (!row) return;
            const renameInput = row.querySelector('input[type="text"]');
            const rankInput = row.querySelector('.rank-input');
            if (renameInput && tier.rename) renameInput.value = tier.rename;
            if (rankInput && tier.rank) rankInput.value = tier.rank;
        });
        document.querySelector('#priceTierRenameRank')?.classList.remove('hidden');
    }
  
    // --- 🔟 Forecast duration ---
    if (prefillData.forecastDuration) {
        document.querySelector('#durationSection')?.classList.remove('hidden');
        selectDropdown('#forecastDuration', prefillData.forecastDuration);
    }
  
    // --- 1️⃣1️⃣ Growth input type (radio) ---
    if (prefillData.growthType) selectRadio('growthType', prefillData.growthType);
  
    // --- 1️⃣2️⃣ CAGR table values ---
    if (prefillData.cagrValues && Array.isArray(prefillData.cagrValues)) {
        const rows = document.querySelectorAll('#cagrSection table tr');
        prefillData.cagrValues.forEach((item, i) => {
            const row = rows[i + 1]; // skip header row
            if (!row) return;
            const input = row.querySelector('input[type="number"]');
            if (input && item.value !== undefined) input.value = item.value;
        });
        document.querySelector('#cagrSection')?.classList.remove('hidden');
    }
  
    // --- 1️⃣3️⃣ Uploaded files (show names only) ---
    if (prefillData.uploadedFiles && Array.isArray(prefillData.uploadedFiles)) {
        const container = document.getElementById('file-upload-progress');
        container.innerHTML = '';
        prefillData.uploadedFiles.forEach((f, idx) => {
            const fileName = f.name || f.path?.split('/').pop();
            const p = document.createElement('p');
            p.textContent = `✅ File ${idx + 1}: ${fileName}`;
            container.appendChild(p);
        });
    }
  
    // --- 1️⃣4️⃣ Step progress bar ---
    if (prefillData.completedSteps) {
        const progress = document.getElementById('progressBar');
        const status = document.getElementById('progressStatus');
        progress.value = prefillData.completedSteps;
        status.textContent = `Progress: ${prefillData.completedSteps} / 11 steps completed`;
    }
  
    console.log("Form prefill complete ✅");
}

export function populateFormWithFiles(prefillFiles = {}) {
    console.log('Prefilling uploaded files:', prefillFiles);
  
    // prefillFiles expected structure example:
    // {
    //   initialDataFile: { name: 'initial.csv', url: '/uploads/initial.csv' },
    //   attachmentFiles: [
    //     { name: 'forecast.xlsx', url: '/uploads/forecast.xlsx' },
    //     { name: 'growth.csv', url: '/uploads/growth.csv' }
    //   ]
    // }
  
    // --- 1️⃣ Handle single file (initial data, for example)
    if (prefillFiles.initialDataFile) {
        const fileSection = document.getElementById('initialDataFileSection');
        const label = document.createElement('p');
        label.innerHTML = `📂 <a href="${prefillFiles.initialDataFile.url}" target="_blank">${prefillFiles.initialDataFile.name}</a>`;
        fileSection?.appendChild(label);
    }
  
    // --- 2️⃣ Handle multiple uploaded files (if any)
    // if (Array.isArray(prefillFiles.attachmentFiles) && prefillFiles.attachmentFiles.length) {
    //     const container = document.getElementById('file-upload-progress');
    //     container.innerHTML = '';
    //     prefillFiles.attachmentFiles.forEach((file, i) => {
    //         const div = document.createElement('div');
    //         div.classList.add('uploaded-file');
    //         div.innerHTML = `
    //       ✅ <a href="${file.url}" target="_blank">${file.name}</a>
    //       <button type="button" class="btn btn-sm btn-outline-danger remove-file" data-index="${i}">Remove</button>
    //     `;
    //         container.appendChild(div);
    //     });
  
    //     // Optional: re-enable file input if user wants to replace
    //     document.querySelectorAll('.remove-file').forEach(btn => {
    //         btn.addEventListener('click', (e) => {
    //             const idx = e.target.dataset.index;
    //             prefillFiles.attachmentFiles.splice(idx, 1);
    //             e.target.closest('.uploaded-file').remove();
    //         });
    //     });
    // }
  
    console.log('File prefill complete ✅');
}


export async function downloadFile(filePath, fileName, csrfToken) {
   
    try {  
        const response = await fetch('/files/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'csrf-token': csrfToken,  // ✅ Important for csurf
            },
            credentials: 'include', // keep cookies/session
            body: JSON.stringify({ path: filePath, file_name: fileName }),
        });
  
        if (!response.ok) throw new Error('File not found or failed to download');
  
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
  
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error downloading file:', err);
        showFlashMessage('Unable to download file.', 'error', 5000);
    }
}
  

  
  