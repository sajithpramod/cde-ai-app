// import { validateMandatoryFields, scrollToFirstError } from './formValidation.js';
/* global Choices */
import { fetchCSRFToken } from './csrf.js';
import { initCurrencyHandlers, initContinueBtnHandler,populateCurrencyDropdowns, restoreExchangeRateSection } from './currencyHandlers.js';
import { updateProgress, stepStatus } from './stepTracker.js';
import { handleInitialFileUpload, handleFormValidation, callRscriptOnForcastTimeSelection, initFileUploadHandlers, showSection, setGrowthTypeValue, renderPriceTierUI, uploadStatus, updateStatus} from './uploadHandlers.js';
import {populateForm,  downloadFile } from './Progress.js';
import { showFlashMessage, showConfirmDialog } from './uiHelpers.js';
const marketMap = {}; // id -> market_type
const marketNameMap = {};
const countryMapName = {};
let allMarketOptions = [];
let marketChoices;
let countryChoices;
let csrfToken;
let savedPrefill = null;
const $ = (id) => document.getElementById(id);
document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        csrfToken = await fetchCSRFToken();
        console.log('csrfToken after fetch:', csrfToken);
   
        document.getElementById('submit').disabled = true;
   
        initEventListeners();
        initFileUploadHandlers(csrfToken,marketNameMap,countryMapName );
        callRscriptOnForcastTimeSelection(csrfToken, marketNameMap , countryMapName);
        initCurrencyHandlers();
        populateCurrencyDropdowns();
        initContinueBtnHandler(stepStatus, updateProgress);
        setGrowthTypeValue(countryMapName);

        const startFreshBtn = document.getElementById('startFreshBtn');
        if (startFreshBtn) {
            startFreshBtn.style.display = 'none';
        }

        try {
            const res = await fetch('/upload/progress', { credentials: 'include' });
            const data = await res.json();

            if (data?.inProgress) {
                const prefill = data.prefillData;
                const prefillFiles = data.prefillFiles;
                const tierColumn = data.tierColumns;
                const renamePriceTier = data.renamePriceTier;
                const priceTierGrowthTemplate = data.priceTierGrowthTemplate;
                savedPrefill=prefill

                // Show the "Start Fresh" button when there's prefill data
                const startFreshBtn = document.getElementById('startFreshBtn');
                if (startFreshBtn) {
                    startFreshBtn.style.display = 'inline-block';
                }

                showFlashMessage('You have an in-progress forecast. Your previous data has been loaded!', 'info', 5000);

                // Fill in base form fields immediately
                populateForm(prefill);
                const { fromCurrency, toCurrency, exchangeRate } = prefill;

                if(fromCurrency && toCurrency && exchangeRate){

                    stepStatus.currencyExchange = true;

                    restoreExchangeRateSection(prefill);
                }
            
                // Prefill markets after fetching them
                const type = prefill.typeOfModel || 'in';
                const modelType = type === 'above'
                    ? (prefill.modelSelect || 'FPA')
                    : 'FPA';
            
                // Wait for markets, then set selected
                console.log('market Select', prefill.marketId);
                if(prefill.marketId){
                    stepStatus.marketSelect = true;
                   
                }
                if(prefill.dataType){
                    stepStatus.dataTypeSection = true;
                }
             
                await fetchMarkets(modelType, prefill.marketId);

            
   
                console.log('>>', prefill.subClusterSelect);


                const subClusterSection = $('subClusterSection');
                const subClusterSelect = $('subClusterSelect');

                // Create a promise to wait for country prefill completion
                let countryPrefillPromise = Promise.resolve(); // Default to resolved

                if (prefill.subClusterSelect) {
                    // Show the section if hidden
                    subClusterSection.classList.remove('hidden');

                    // Set value
                    subClusterSelect.value = prefill.subClusterSelect;

                    // If MultipleCountries, create a promise that waits for country fetch
                    if (prefill.subClusterSelect === 'MultipleCountries') {
                        countryPrefillPromise = new Promise((resolve) => {
                            window._countryPrefillResolver = resolve;
                        });
                    }

                    // Trigger the change event to invoke handleClusterChange()
                    subClusterSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                console.log('forecastDuration',prefill?.forecastDuration );

                if (prefill?.forecastDuration) {
                    const durationSelect = document.getElementById('forecastDuration');

                    if (durationSelect) {
                        // Set the dropdown value (but don't trigger change yet)
                        durationSelect.value = prefill.forecastDuration.toString();
                    }
                }

                console.log(tierColumn);

                if(tierColumn){
                    stepStatus.tierColumn = true;
                    renderPriceTierUI(tierColumn, 'price', prefill);
                }
                  

                if(renamePriceTier){
                    renderPriceTierUI(renamePriceTier, 'rename');
                }

                // Render growth template if exists
                console.log('priceTierGrowthTemplate', priceTierGrowthTemplate);
                const selectedIds = $('hiddenMarketId').value.split(',').filter(id => id !== 'ALL');
                console.log('selectedIds', selectedIds, marketNameMap);
                const marketNames = selectedIds.map(id => marketNameMap[id]);  
                const  renderCountriesForGrowth = await fetchCountriesByCluster(marketNames);
                
                console.log('prefill', prefill.marketId);
                if(priceTierGrowthTemplate) {
                    console.log('Rendering growth template from progress:', priceTierGrowthTemplate);

                    // Store in window for later use
                    window.currentGrowthTemplates = priceTierGrowthTemplate;
                    window.countryNames = prefill.countryNames;

                    // Show the growth section
                    const group5 = document.getElementById('group5');
                    const cagrSection = document.getElementById('cagrSection'); 
                    if (group5) {
                        group5.classList.remove('d-none');
                    }

                    if (cagrSection) {
                        cagrSection.classList.remove('hidden');
                    }




                    // Mark step as complete
                    stepStatus.forecastDuration = true;
                    console.log('sss', renderCountriesForGrowth);

                    // Render the growth UI
                    // renderGrowth(priceTierGrowthTemplate, renderCountriesForGrowth);
                }

                if(prefillFiles){
                    await renderPrefillFiles(prefillFiles);
                }

                console.log('stepStatus', stepStatus);

                // ✅ After ALL prefill operations, trigger forecast duration change if needed
                // Wait for country prefill to complete before triggering
                if (prefill?.forecastDuration && window.triggerForecastDurationChange) {
                    await countryPrefillPromise; // Wait for country operations to complete

                    // Add small delay to ensure DOM updates are complete
                    setTimeout(() => {
                        console.log('🚀 Triggering forecast duration change after prefill complete');
                        stepStatus.forecastDuration = true;
                        window.triggerForecastDurationChange();
                    }, 200);
                }

                // updateProgress(); 
            }
        } catch (err) {
            console.error('Error fetching saved progress:', err);
        }

        
        // $('uploadForm').addEventListener('submit', handleFormValidation);
        document.getElementById('uploadForm').addEventListener('submit', function(e) {
            handleFormValidation(e, csrfToken,marketNameMap, countryMapName );
        });
    })(); 
    
});



async function renderPrefillFiles(prefillFiles) {
    if (!prefillFiles || !Array.isArray(prefillFiles.attachmentFiles)) return;

    const uploadedFiles = prefillFiles.attachmentFiles;
    if (uploadedFiles.length === 0) return;

    const csrfToken = await fetchCSRFToken();
    let filesProcessed = 0;

    uploadedFiles.forEach(fileInfo => {
        const { field, file_name, path, url } = fileInfo;
       
        
        const fileInput = document.getElementById(field);

        if (!fileInput) {
            console.warn(`⚠️ No input found for field: ${field}`);
            return;
        }

        if (Object.prototype.hasOwnProperty.call(stepStatus, field)) {
            stepStatus[field] = true;
        }

        // Mark file as uploaded and increment count
        if (!uploadStatus[field]) {
            uploadStatus[field] = true;
            updateStatus();
        }

        filesProcessed++;

        const parent = fileInput.parentElement;
        if (!parent) return;

        // ✅ If this input’s section is hidden (like group1, group2...), make it visible
        const groupDiv = parent.closest('.file-group');
        if (groupDiv && groupDiv.classList.contains('d-none')) {
            groupDiv.classList.remove('d-none');
        }

        const successDiv = parent.querySelector('.success-message');
        const errorDiv = parent.querySelector('.error-message');
        const loaderDiv = parent.querySelector('.loader');

        // Hide loader & error; show success message
        if (errorDiv) errorDiv.classList.add('d-none');
        if (loaderDiv) loaderDiv.classList.add('d-none');

        const name = file_name || 'Unknown file';
        const filePath = path || url;

        // ✅ Show success message
        if (successDiv) {
            successDiv.classList.remove('d-none');
            successDiv.innerHTML = `✅ Successfully updated (${name})`;
        }

        // 🧹 Remove existing links before adding a new one
        parent.querySelectorAll('.prefill-file-link').forEach(link => link.remove());

        // 🧩 Add clickable link
        const link = document.createElement('p');
        link.classList.add('prefill-file-link', 'mt-1');
        link.innerHTML = `📂 <span class="text-primary" style="cursor:pointer;">${name}</span>`;

        // 🪣 Add download behavior
        link.addEventListener('click', () => downloadFile(filePath, name, csrfToken));

        parent.appendChild(link);

        // 📥 Show download buttons for initialDataFile after successful upload
        if (field === 'CCFbackdataFile') {
            console.log('comes here for downlaod file', field);
            // Store the upload folder path in sessionStorage for later downloads
            if (filePath) {
                // Extract folder path from file path (remove filename)
                const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
                window.sessionStorage.setItem('userUploadFolderPath', folderPath);
                console.log('💾 Stored upload folder path:', folderPath);
            }

            const downloadSection = document.getElementById('initialDataFileDownloads');
            if (downloadSection) {
                downloadSection.classList.remove('d-none');
                console.log('✅ Showing download buttons for mapped CSV files');
            }
        }

        if (field === 'ForesightFile') {
            console.warn('🔁 Triggering change event for ForesightFile');
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // ✅ After all files are processed, check and enable submit button if needed
    console.log(`📊 Files processed: ${filesProcessed}, Upload status:`, uploadStatus);
    const submitBtn = document.getElementById('submit');
    const statusDiv = document.getElementById('file-upload-progress');

    // Force update the status display
    if (statusDiv) {
        const { processedFileCount, totalFilesToUpload } = await import('./uploadHandlers.js');
        statusDiv.textContent = `${processedFileCount}/${totalFilesToUpload} files processed`;

        // Enable button if all files are uploaded
        if (processedFileCount >= totalFilesToUpload && submitBtn) {
            console.log('✅ All files uploaded, enabling submit button');
            submitBtn.disabled = false;
            submitBtn.classList.remove('d-none');
        }
    }
    showOnlyNextGroup();
}

function showOnlyNextGroup() {
    let highestGroup = 0;

    // detect highest visible group with uploaded file
    for (let i = 1; i <= 3; i++) {
        const group = document.getElementById(`group${i}`);
        if (group && !group.classList.contains('d-none')) {
            highestGroup = i;
        }
    }

    // Show ONLY the next group (if it exists)
    const nextGroup = document.getElementById(`group${highestGroup + 1}`);
    if (nextGroup) {
        nextGroup.classList.remove('d-none');
    }
}

document.querySelectorAll('.info-icon-currency').forEach(wrapper => {
    const popup = wrapper.querySelector('.tooltip-popup');
    wrapper.addEventListener('click', () => {
        popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    });
});
document.querySelectorAll('.info-icon-wrapper').forEach(wrapper => {
    const popup = wrapper.querySelector('.tooltip-popup');
    wrapper.addEventListener('click', () => {
        popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    });
});

// 📥 Add event listeners for CSV download buttons
document.addEventListener('click', (e) => {
    if (e.target.closest('.download-csv-btn')) {
        const button = e.target.closest('.download-csv-btn');
        const fileName = button.getAttribute('data-file');

        // Get the upload folder path from session (stored when initialDataFile was uploaded)
        //const uploadFolder =   (window.sessionStorage.getItem('userUploadFolderPath') || '').trim();
        let uploadFolder = (window.sessionStorage.getItem('userUploadFolderPath') || '').trim();
        uploadFolder = uploadFolder.replace(/^\/+|\/+$/g, '');

        // if (!uploadFolder) {
        //     console.error('Upload folder path not found');
        //     alert('Unable to download file. Upload folder path not found.');
        //     return;
        // }

        // Construct download URL
        console.log('uploadFolder',uploadFolder);
        const downloadUrl = `/upload/download-mapped-csv?file=${encodeURIComponent(fileName)}&folder=${encodeURIComponent(uploadFolder)}`;

        // Trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`📥 Downloading ${fileName} from ${uploadFolder}`);
    }
});
function toggleSection(id, show, className = 'hidden') {
    
    const el = $(id);
    if (el) el.classList.toggle(className, !show);
} 
function hideSection(id) {
    $(id)?.classList.add('hidden');
}
function initEventListeners() {
    const typeSelect = $('typeOfModel');
    const modelSelect = $('marketModel');
    const closePopup = $('closePopup');
    const startFreshBtn = $('startFreshBtn');

    const popup = $('aboveMarketPopup');
    const progressPopup = $('progressPopup');

    // Handle "Start Fresh" button click
    if (startFreshBtn) {
        startFreshBtn.addEventListener('click', async () => {
            const confirmDiscard = await showConfirmDialog({
                title: 'Start Fresh?',
                message: 'Are you sure you want to discard your draft and start fresh? All unsaved progress will be lost.',
                confirmText: 'Yes, Start Fresh',
                cancelText: 'Cancel',
                type: 'danger'
            });

            if (!confirmDiscard) return;

            try {
                const response = await fetch('/upload/progress', {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'csrf-token': csrfToken  // This must match what the server expects

                    }
                });

                const result = await response.json();

                if (result.success) {
                    showFlashMessage('Draft discarded successfully. Starting fresh...', 'success', 3000);
                    // Reload the page to clear all form data
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    showFlashMessage(result.message || 'Failed to discard draft', 'error', 5000);
                }
            } catch (error) {
                console.error('Error discarding draft:', error);
                showFlashMessage('An error occurred while discarding the draft', 'error', 5000);
            }
        });
    }

    typeSelect.addEventListener('change', () => {
        const selected = $('typeOfModel').value;
        const marketSelect = $('marketSelect');
        
        $('marketModelSection')?.classList.toggle('d-none', selected !== 'above');
        if (marketChoices) {
            marketChoices.destroy();
        }
        if (selected === 'above') {
            hideSection('dataTypeSection');
            popup.classList.remove('d-none');
            progressPopup.classList.add('d-none');
        } else {
            popup.classList.add('d-none');
            marketSelect.removeAttribute('multiple');
            marketSelect.size = 1;
            progressPopup.classList.remove('d-none');
        }
        if (selected != 'above') {
            fetchMarkets('FPA');
        }
    });
    modelSelect.addEventListener('change', () => {
        $('hiddenMarketModelId').value = modelSelect.value;
        fetchMarkets(modelSelect.value);
    });
    $('marketSelect').addEventListener('change', handleMarketChange);
    $('subClusterSelect').addEventListener('change', handleClusterChange);
    $('dataType')?.addEventListener('change', () => displayTbaFile());
    $('initialDataFile')?.addEventListener('change', handleInitialFileUpload);

    //closePopup.addEventListener('click', () => popup.classList.add('d-none'));

    closePopup.addEventListener('click', () => {
        popup.classList.add('d-none'); // hide popup
      
        const typeOfModelInput = document.getElementById('typeOfModel');
        if (typeOfModelInput) {
            typeOfModelInput.value = 'in';
        }
    });
    $('viewReportBtn').addEventListener('click', () => {
        popup.classList.add('d-none');
        window.location.href = '/markets/above-market-reports'; // redirect

        // $('viewReportBtn').addEventListener('click', () => {
        //     popup.classList.add('d-none'); // hide popup
           
        // });


    }); 
    // $('createForecastBtn').addEventListener('click', () => popup.classList.add('d-none'));
}

function showMarketWarning(msg) {
    const msgDiv = document.getElementById('marketWarning');
    msgDiv.innerText = msg;
    msgDiv.classList.remove('d-none');
    setTimeout(() => msgDiv.classList.add('d-none'), 5000); // hide after 5s
}

async function fetchMarkets(model, prefillValue = null ) {
    const marketSelect = $('marketSelect');
    const type = $('typeOfModel').value;

    try {
        const res = await fetch('/markets', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const filtered = model ? data.markets.filter(m => m.model_type === model) : [];
        allMarketOptions = filtered.map(m => ({ id: m.id, name: m.name, type: m.market_type }));
        marketMap.clear;
        marketNameMap.clear;
        marketSelect.innerHTML = '';

        if (type === 'above') {
            const allOption = document.createElement('option');
            allOption.value = 'ALL';
            allOption.textContent = 'All Markets';
            allOption.title = 'Select this to include all markets and disable individual selection';
            marketSelect.appendChild(allOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select Market --';
            marketSelect.appendChild(defaultOption);
        }

        allMarketOptions.forEach(m => {
            marketMap[m.id] = m.type;
            marketNameMap[m.id]=m.name;
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            marketSelect.appendChild(option);
        });

        if (marketChoices) marketChoices.destroy();
        marketChoices = new Choices(marketSelect, {
            removeItemButton: type === 'above',
            searchEnabled: true,
            shouldSort: true,
            placeholderValue: type === 'above' ? 'Select/Search Markets' : 'Select a Market',
            searchPlaceholderValue: 'Search...'
        }); 
        
        // if (prefillValue) {
        //     if (marketChoices) {
        //         marketChoices.setChoiceByValue(prefillValue.toString());
        //     } else {
        //         marketSelect.value = prefillValue;
        //     }
        //     $('hiddenMarketId').value = prefillValue;

        //     marketSelect.dispatchEvent(new Event('change', { bubbles: true }));
        //     // $('marketSelect').addEventListener('change', handleMarketChange);
        // }

        if (prefillValue) {

            const values = Array.isArray(prefillValue)
                ? prefillValue
                : prefillValue.toString().split(',').map(v => v.trim()).filter(Boolean);
    
            if (marketChoices) {
                marketChoices.removeActiveItems();
                values.forEach(v => marketChoices.setChoiceByValue(v));
            }
    
            $('hiddenMarketId').value = values.join(',');
    
            // Directly invoke the handler instead of dispatching an event
            handleMarketChange({ target: $('marketSelect') });
        }
     
        return true;

    } catch (err) {
        console.error('Error loading markets:', err);
        marketSelect.innerHTML = '<option value="">-- Error loading markets --</option>';
    }
}
function handleMarketChange(e) {
    const marketSelect = e.target;
    
    const selectedOptions = Array.from(marketSelect.selectedOptions);
    let selectedIds = selectedOptions.map(opt => opt.value);
   
    const market = $('typeOfModel').value;
    const justSelected = e.detail?.value;
    if (marketSelect.hasAttribute('multiple')) {
        if (selectedIds.includes('ALL')) {
            if(justSelected !='ALL'){
                showMarketWarning("You've already selected 'All markets'. To select individual markets, please remove 'All markets' selection first."); 
                marketChoices.hideDropdown();
            }
            Array.from(marketSelect.options).forEach(opt => {
                if (opt.value !== 'ALL') {
                    opt.selected = false;
                    marketChoices.removeActiveItemsByValue(opt.value);
                }
            });
            selectedIds = ['ALL'];
            marketChoices.setChoiceByValue('ALL');
        } else {
            marketChoices.removeActiveItemsByValue('ALL');
            Array.from(marketSelect.options).forEach(opt => {
                if (opt.value === 'ALL') opt.selected = false;
            });
        }
    }
    $('hiddenMarketId').value = selectedIds.join(',');
   
    const hasCM = selectedIds.some(id => marketMap[id] === 'CM') && market === 'in'
    if(savedPrefill && savedPrefill.subClusterSelect){
       
        toggleSection('subClusterSection', hasCM, 'd-none'); 
    }else{
        toggleSection('subClusterSection', hasCM);
    }
    if(market === 'in'){
        showSection('dataTypeSection');
    }else{
        hideSection('dataTypeSection');
        stepStatus.dataTypeSection = true;
        document.getElementById('multiFileUploadSection').classList.remove('hidden');
        const el = document.getElementById('group0');
        el.classList.remove('d-none');
    }

    // ✅ Show subcluster textarea if more than 1 market selected and 'ALL' is not selected
    const showSubclusterTextarea = !selectedIds.includes('ALL') && selectedIds.length > 1;
    const subclusterElement = document.getElementById('subclusterteaxtarea');
    if (subclusterElement) {
        subclusterElement.classList.toggle('d-none', !showSubclusterTextarea);
    }

    if (selectedIds.length === 0) {
    // hiddenInput.value = '';
        hideSection('dataTypeSection');
        document.getElementById('subClusterSection')?.classList.add('d-none');
        if (showSubclusterTextarea) subclusterElement?.classList.add('d-none');
        hideSection('dataTypeSection');
        stepStatus.dataTypeSection = false;
        document.getElementById('multiFileUploadSection')?.classList.add('hidden');
        document.getElementById('group0')?.classList.remove('d-none');
        updateProgress();
        return;
    } 
}

function displayTbaFile(){
    document.getElementById('multiFileUploadSection').classList.remove('hidden');

    const el = document.getElementById('group0');
    el.classList.remove('d-none');
    stepStatus.dataTypeSection = true;
    updateProgress();
}
function handleClusterChange(e) {
    const selectedValue = e.target.value;
    const textareaDiv = document.getElementById('subclusterteaxtarea');
    const label = textareaDiv.querySelector('label');
    const input = textareaDiv.querySelector('input');
    const shouldShow = selectedValue === 'Subclusters';
    if (shouldShow) {
        textareaDiv.classList.remove('d-none');
        label.textContent = 'Give this cluster a name';
        input.placeholder = 'cluster name';
        
    } else {
        textareaDiv.classList.add('d-none');
    }
}
document.getElementById('subClusterSelect').addEventListener('change', async function(e) {
    const value = e.target.value;

    if (value === 'MultipleCountries') {
        const selectedIds = $('hiddenMarketId').value.split(',').filter(id => id !== 'ALL');
        const marketNames = selectedIds.map(id => marketNameMap[id]);  // Replace with your actual mapping
        const countryMultiSelectSection = document.getElementById('countryMultiSelectSection');

        if (marketNames.length === 0) {
            showMarketWarning('Please select a market before choosing multiple countries.');
            this.value = '';  // Reset selection
            hideSection('countryMultiSelectSection');
            return;

        }
        countryMultiSelectSection.classList.remove('d-none');

        try {
            const countries = await fetchCountriesByCluster(marketNames);
            populateCountryMultiSelect(countries);
            showSection('countryMultiSelectSection');

            if (
                savedPrefill?.countryMultiSelect === 'MultipleCountries' &&
                Array.isArray(savedPrefill.countryNames) &&
                savedPrefill.countryNames.length > 0
            ) {

                const countrySelect = $('countryMultiSelect');
                const countryChoices = countrySelect?._choicesInstance; // assuming Choices.js instance stored

                // if (countryChoices) {

                //     // Wait a short moment to ensure Choices finished rendering
                //     setTimeout(() => {
                //         countryChoices.removeActiveItems();
                //         savedPrefill.countryNames.forEach(name => {

                //             countryChoices.setChoiceByValue(name);
                //         });

                //         // ✅ Trigger change event if logic depends on it
                //         countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
                //     }, 200);
                // }
                if (countryChoices) {
                    // Wait for rendering
                    setTimeout(() => {
                        const nameToId = Object.fromEntries(
                            Object.entries(countryMapName).map(([id, name]) => [name, id])
                        );

                        const idsToSelect = savedPrefill.countryNames
                            .map(name => nameToId[name])
                            .filter(Boolean);

                        countryChoices.removeActiveItems();

                        idsToSelect.forEach(id => {
                            countryChoices.setChoiceByValue(id.toString());
                        });

                        requestAnimationFrame(() => {
                            $('countryMultiSelect').dispatchEvent(new Event('change', { bubbles: true }));

                            // ✅ Signal that country prefill is complete
                            if (window._countryPrefillResolver) {
                                window._countryPrefillResolver();
                            }
                        });
                    }, 400);
                } else {
                    // No choices instance, signal completion anyway
                    if (window._countryPrefillResolver) {
                        window._countryPrefillResolver();
                    }
                }

            } else {
                // No prefill data, signal completion
                if (window._countryPrefillResolver) {
                    window._countryPrefillResolver();
                }
            }
        } catch (err) {
            console.error('Error fetching countries:', err);
            // Signal completion even on error
            if (window._countryPrefillResolver) {
                window._countryPrefillResolver();
            }
            // hideSection('countryMultiSelectSection');
        }
    } else {
        hideSection('countryMultiSelectSection');
        // Signal completion for non-MultipleCountries
        if (window._countryPrefillResolver) {
            window._countryPrefillResolver();
        }
    }
});
async function fetchCountriesByCluster(marketNames) {
    const query = marketNames.map(name => `marketName=${encodeURIComponent(name)}`).join('&');
    const res = await fetch(`/markets/countries?${query}`);
    if (!res.ok) throw new Error('Failed to fetch countries');
    const data = await res.json();
    return data.markets || [];
}

// function populateCountryMultiSelect(countries) {
//     const select = document.getElementById('countryMultiSelect');
//     select.innerHTML = '';  // Clear previous options

//     countries.forEach(country => {
//         const opt = document.createElement('option');
//         opt.value = country.id;
//         opt.textContent = country.country_name;
//         select.appendChild(opt);
//     });
// }

function populateCountryMultiSelect(countries) {
    const select = document.getElementById('countryMultiSelect');

    // Destroy previous Choices instance if exists
    if (countryChoices) {
        countryChoices.destroy();
    }

    // Clear previous options
    select.innerHTML = '';
    countryMapName.clear;

    // Populate new options
    countries.forEach(country => {
        const opt = document.createElement('option');
        opt.value = country.id;
        countryMapName[country.id] = country.country_name;
        opt.textContent = country.country_name;
        select.appendChild(opt);
    });

    // Initialize Choices.js
    countryChoices = new Choices(select, {
        removeItemButton: true,
        searchEnabled: true,
        shouldSort: true,
        placeholderValue: 'Select countries...',
        searchPlaceholderValue: 'Search countries...',
        itemSelectText: '',  // Hide default "Press to select" text
    });

    select._choicesInstance = countryChoices;
}

const select = document.getElementById('countryMultiSelect');
const hiddenInput = document.getElementById('hiddenCountryId');
select.addEventListener('change', () => {
    const selectedOptions = Array.from(select.selectedOptions);
    const selectedValues = selectedOptions.map(option => option.value);
    
    // Save as comma-separated string or JSON string (choose one)
    hiddenInput.value = selectedValues.join(',');  // e.g., "1,2,3"
    
    // Optional: for JSON string (use if you prefer)
    // hiddenInput.value = JSON.stringify(selectedValues);
});
