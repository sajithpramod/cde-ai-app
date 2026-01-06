const $ = (id) => document.getElementById(id);
import { validateMandatoryFields, scrollToFirstError, validateRankInputs } from './formValidation.js';
import { updateProgress, stepStatus, stepKeyMap} from './stepTracker.js';
import { validateFile, validateInputs } from './fileValidators.js';
import { showError, clearError,  hideSuccess } from './uiHelpers.js';
import { getSocket } from './socketManager.js';
let currentFileEventKey = null; 
let currentFileListener = null;
export const uploadStatus = {};
export let processedFileCount = 0;
export const totalFilesToUpload = 6;
export function showSection(id) {
    $(id)?.classList.remove('hidden');
    stepStatus.marketSelect = true;
    updateProgress();  
}
export function handleInitialFileUpload() {
    if ($('dataType').value === 'iwsr') {
        showSection('iwsrColumnSelection');
    }else if($('dataType').value === 'Neilsen'){
        hideSection('iwsrColumnSelection');
        document.getElementById('multiFileUploadSection').classList.remove('hidden');
        const el = document.getElementById('currencyExchnageSelection');
        el.classList.remove('d-none');
    }
}
export async function handleFormValidation(e, csrfToken, marketNameMap, countryMapName ) {
    e.preventDefault();
    let valid = validateMandatoryFields();  
    if (valid) {
        const spinner = document.getElementById('reportspinner');
        spinner.classList.remove('hidden'); // 👈 show spinner
  
        document.getElementById('status').innerText = 'Processing.....';
       
        const selectedGrowthType = document.querySelector('input[name="growthType"]:checked')?.value || 'CAGR';
        const forcastDuration = document.getElementById('forecastDuration').value;
  
        // CAGR
        // const cagrRows = document.querySelectorAll('#cagrSection .tier-table tr:not(:first-child)');
        // const cagrData = [];
        const clusterName = document.getElementById('comment').value;

        const selectedIds = $('hiddenMarketId').value.split(',').filter(id => id !== 'ALL');
        const marketNames = selectedIds.map(id => marketNameMap[id]);  // Replace with your actual mapping

        console.log('matket', marketNames);

        const rawCountryIds = $('hiddenCountryId').value.trim();
        const selectedCountryIds = rawCountryIds
            ? rawCountryIds.split(',').filter(id => id !== 'ALL' && id !== '')
            : [];

        const countryNames = selectedCountryIds.map(id => countryMapName[id]).filter(Boolean); // filters out undefined

        console.log('country', countryNames);
  
       
        saveCurrentCountryData();

        let cagrData = [];
        //const selectedGrowthType = document.querySelector('input[name="growthType"]:checked')?.value || 'CAGR';
        const defaultValue = selectedGrowthType === 'Base100' ? 100 : 0;

        const subClusterElement = document.getElementById('subClusterSelect');

        let countryMultiSelect = null;

        // Check if the element is not hidden
        if (subClusterElement && subClusterElement.offsetParent !== null) {
            countryMultiSelect = subClusterElement.value;
            // Now you can use countryMultiSelect
            console.log('Selected value:', countryMultiSelect);
        } else {
            console.log('subClusterSelect is hidden, skipping value.');
        }

        if(countryMultiSelect && (countryMultiSelect ==='AllCountries' || countryMultiSelect ==='MultipleCountries') ){
            window.countryNames.forEach(country => {
                const savedData = countryGrowthData[country];
    
                // If user has entered values, use them
                if (savedData && savedData.length > 0) {
                    savedData.forEach(({ tier, cagr }) => {
                        cagrData.push({ country, tier, cagr });
                    });
                } else {
                    // Otherwise, fall back to default values
                    window.currentGrowthTemplates.forEach(tierRow => {
                        const tierName = tierRow["price.tier"].trim();
                        cagrData.push({ country, tier: tierName, cagr: defaultValue });
                    });
                }
            });

        }else{
            let country;
            if (countryMultiSelect && countryMultiSelect ==='Subclusters'){
                country = document.getElementById('comment').value;
               
            }else{
             
                country = marketNames; 
            }
            const savedData = countryGrowthData[country];

            console.log('comes here for savedData', countryGrowthData);
    
            // If user has entered values, use them
            if (savedData && savedData.length > 0) {
                savedData.forEach(({ tier, cagr }) => {
                    cagrData.push({ country, tier, cagr });
                });
            } 
        }

        console.log('comes here for cagrData', cagrData);
        // Go through ALL countries
       


        const payload = { 
            cagrData,
            selectedGrowthType,
            clusterName,
            forcastDuration,
            marketNames
        };

       

        if(countryMultiSelect){
            payload.countryMultiSelect = countryMultiSelect; 
        }

       


        if (selectedCountryIds.length > 0) {
            payload.countryNames = countryNames;
        }else  if (Array.isArray(marketNames) && marketNames.length > 0) {
            payload.marketNames = marketNames;  // Send as JSON string
        } 
        // Send to backend
        const response = await fetch('/upload/forecast', {
            method: 'POST',
            headers: {
                'csrf-token': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
  
        const json = await response.json();
        const result = json.result; // Access nested 'result' object
        console.log(result);
  
        if (result?.success) {
            spinner.classList.add('hidden'); // 👈 show spinner
      
            document.getElementById('status').innerText = '✅ Forecast successful, Generating Reports..';
            setTimeout(() => {
                window.location.href = '/reports/forcast';
            }, 1000); // 1 second delay so user sees the message
        } else {
            spinner.classList.add('hidden'); // 👈 show spinner
     
            document.getElementById('status').innerText = `❌ ${json?.error || 'Something went wrong'}`;
        }
    }else{
        scrollToFirstError();
        return;
    }
}

// export   function callRscriptOnForcastTimeSelection(csrfToken,marketNameMap, countryMapName) {
//     const forecastDuration = document.getElementById('forecastDuration');
//     const warningDiv = document.getElementById("forecastWarning");
//     console.log('marketNameMap=>', marketNameMap);
  
//     if (!forecastDuration) return;
  
//     forecastDuration.addEventListener('change', async (e) => {
//         const parent = e.target.closest('.section');
//         const loader = parent.querySelector('.loader');
//         const errorBox = parent.querySelector('.error-message');
//         const spinner = document.getElementById('reportspinner');
//         spinner.classList.remove('hidden'); // 👈 show spinner
//         const rawCountryIds = $('hiddenCountryId').value.trim();
//         const selectedCountryIds = rawCountryIds
//             ? rawCountryIds.split(',').filter(id => id !== 'ALL' && id !== '')
//             : [];
//         let countryMultiSelect = null;

//         // const subClusterElement = document.getElementById('subClusterSelect'); 
//         // if (subClusterElement && subClusterElement.offsetParent !== null) {
//         //     countryMultiSelect = subClusterElement.value;
//         //     console.log('COMEs INSIDE');
//         // }else {
//         //     console.log('SORRY COMEs INSIDE', subClusterElement.value);
//         // } 

//         setTimeout(() => {
//             const subClusterElement = document.getElementById('subClusterSelect');
//             if (subClusterElement && subClusterElement.offsetParent !== null) {
//                 countryMultiSelect = subClusterElement.value;
//                 console.log('COMEs INSIDE', );
//             } else {
//                 console.log('STILL HIDDEN');
//             }
//         }, 100);
//         // Replace with your actual mapping

//         let renderCountriesForGrowth = [];
//         let  countryNames = [];
//         const selectedIds = $('hiddenMarketId').value.split(',').filter(id => id !== 'ALL');
//         console.log('selectedIds', selectedIds, marketNameMap);
//         const marketNames = selectedIds.map(id => marketNameMap[id]); 
        
//         console.log('marketNames SSSSSS', selectedIds);
//         console.log('marketNames BBBBBB', countryMultiSelect);

//         if(countryMultiSelect && countryMultiSelect ==='AllCountries'){
//             renderCountriesForGrowth = await fetchCountriesByCluster(marketNames);
//         }else if (countryMultiSelect && countryMultiSelect ==='MultipleCountries'){
//             countryNames = selectedCountryIds.map(id => countryMapName[id]).filter(Boolean);
//             console.log('COMEEEEE BBBBBB',selectedCountryIds,  countryNames);

//             renderCountriesForGrowth = countryNames;
//         }else if (countryMultiSelect && countryMultiSelect ==='Subclusters'){
//             const clusterName = document.getElementById('comment').value;
//             renderCountriesForGrowth.push(clusterName); 
//         }else{
         
//             renderCountriesForGrowth.push(marketNames); 
//         }
  
//         errorBox.classList.add('d-none');
//         errorBox.textContent = '';
//         loader.classList.remove('d-none');
  
//         const selected = forecastDuration.value;
//         if (selected === "5") {
//             warningDiv.classList.remove("d-none");
//         } else {
//             warningDiv.classList.add("d-none");
//         }
//         const rankSectionId = 'priceTierRenameRank'; // Replace with actual ID of rank section
//         const rankSection = document.getElementById(rankSectionId);
  
//         // Validate rank section only if visible
//         const isRankSectionVisible = rankSection && !rankSection.classList.contains('d-none') && !rankSection.classList.contains('hidden');
  
//         let valid = true;
  
//         if (isRankSectionVisible) {
//             valid = validateRankInputs(rankSectionId);
//         }
  
//         if (selected) {
//             if (valid) {
//                 const renameRows = document.querySelectorAll('#priceTierRenameRank tbody tr');
//                 const renameData = [];
  
//                 renameRows.forEach(row => {
//                     const original = row.cells[0].innerText.trim();
//                     const renameInput = row.querySelector('td:nth-child(2) input');
//                     const rankInput = row.querySelector('td:nth-child(3) input');
  
//                     const renamed = renameInput.value.trim() || original;
//                     const rank = rankInput.value.trim();
  
//                     if (rank) {
//                         renameData.push({ original, renamed, rank });
//                     }
//                 });
//                 forecastDuration.classList.remove('is-invalid');
//                 const error = forecastDuration.nextElementSibling;
//                 if (error && error.classList.contains('invalid-feedback')) {
//                     error.style.display = 'none';
//                 }
  
//                 document.getElementById('submit').disabled = true;
  
//                 fetch('/upload/runRscript3', {
//                     method: 'POST',
//                     credentials: 'include',
//                     headers: {
//                         'csrf-token': csrfToken,
//                         'Content-Type': 'application/json'
//                     },
//                     body: JSON.stringify({ selected, renameData, countryNames }),
//                 })
//                     .then(res => res.json())
//                     .then(response => {
//                         loader.classList.add('d-none');
//                         if(response.success && response.priceTierGrowthTemplate){
//                             window.currentGrowthTemplates = response.priceTierGrowthTemplate;
//                             window.countryNames = renderCountriesForGrowth;
  
//                             const el = document.getElementById('group5');
//                             el.classList.remove('d-none');
  
               
//                             stepStatus.forecastDuration = true;
//                             updateProgress(); 
              
//                             renderGrowth(response.priceTierGrowthTemplate, renderCountriesForGrowth);
//                             spinner.classList.add('hidden'); // 👈 show spinner
//                         }  
            
  
//                         if (!response.success) {
//                             errorBox.classList.remove('d-none');
//                             errorBox.textContent = `❌ ${response.error}`;
//                         }
//                     })
//                     .catch(err => {
//                         loader.classList.add('d-none');
//                         spinner.classList.add('hidden'); // 👈 show spinner
//                         errorBox.classList.remove('d-none');
//                         errorBox.textContent = 'Upload failed: ' + err.message;
//                         e.target.value = '';
//                     });
  
//             } else {
//                 loader.classList.add('d-none');
//                 spinner.classList.add('hidden'); // 👈 show spinner
//                 errorBox.classList.remove('d-none');
//                 errorBox.textContent = 'Please fill valid and unique ranks before selecting forecast duration.';
//                 e.target.value = '';
//                 scrollToFirstError();
//             }
//         } else {
//             loader.classList.add('d-none');
//             spinner.classList.add('hidden'); // 👈 show spinner
//             errorBox.classList.remove('d-none');
//             errorBox.textContent = 'Please select forecast duration.';
//         }
//     });
// }

export function callRscriptOnForcastTimeSelection(csrfToken, marketNameMap, countryMapName) {
    const forecastDuration = document.getElementById('forecastDuration');
    const warningDiv = document.getElementById("forecastWarning");
  
    if (!forecastDuration) return;
  
    // 🧩 STEP 1 — Extracted main handler
    async function handleForecastDurationChange(e) {
        console.log('get called here');
        const parent = e.target.closest('.section');
        const loader = parent.querySelector('.loader');
        const errorBox = parent.querySelector('.error-message');
        const spinner = document.getElementById('reportspinner');
  
        spinner.classList.remove('hidden');
        errorBox.classList.add('d-none');
        errorBox.textContent = '';
        loader.classList.remove('d-none');
  
        const rawCountryIds = $('hiddenCountryId').value.trim();
        const selectedCountryIds = rawCountryIds
            ? rawCountryIds.split(',').filter(id => id !== 'ALL' && id !== '')
            : [];
  
        // 🟢 Identify what type of country selection is active
        const subClusterElement = document.getElementById('subClusterSelect');
        const countryMultiSelect =
        subClusterElement && subClusterElement.offsetParent !== null
            ? subClusterElement.value
            : null;
  
        console.log('✅ Country Multi Select:', countryMultiSelect);
  
        let renderCountriesForGrowth = [];
        let countryNames = [];
  
        const selectedIds = $('hiddenMarketId').value.split(',').filter(id => id !== 'ALL');
        const marketNames = selectedIds.map(id => marketNameMap[id]);
  
        console.log('🌍 Market Names:', marketNames);
  
        if (countryMultiSelect === 'AllCountries') {
            renderCountriesForGrowth = await fetchCountriesByCluster(marketNames);
        } else if (countryMultiSelect === 'MultipleCountries') {
            countryNames = selectedCountryIds.map(id => countryMapName[id]).filter(Boolean);
            console.log('📦 Multiple countries:', selectedCountryIds, countryNames);
            renderCountriesForGrowth = countryNames;
        } else if (countryMultiSelect === 'Subclusters') {
            const clusterName = document.getElementById('comment').value;
            renderCountriesForGrowth.push(clusterName);
        } else {
            renderCountriesForGrowth.push(...marketNames);
        }

        console.log('📦 Just befire the api call',  renderCountriesForGrowth);
  
        // 🧠 Validation logic
        const selected = forecastDuration.value;
        const rankSectionId = 'priceTierRenameRank';
        const rankSection = document.getElementById(rankSectionId);
        const isRankSectionVisible =
        rankSection && !rankSection.classList.contains('d-none') && !rankSection.classList.contains('hidden');
  
        let valid = true;
        if (isRankSectionVisible) valid = validateRankInputs(rankSectionId);
  
        if (!selected) {
            loader.classList.add('d-none');
            spinner.classList.add('hidden');
            errorBox.classList.remove('d-none');
            errorBox.textContent = 'Please select forecast duration.';
            return;
        }
  
        if (selected === "5") {
            warningDiv.classList.remove("d-none");
        } else {
            warningDiv.classList.add("d-none");
        }
  
        if (!valid) {
            loader.classList.add('d-none');
            spinner.classList.add('hidden');
            errorBox.classList.remove('d-none');
            errorBox.textContent = 'Please fill valid and unique ranks before selecting forecast duration.';
            e.target.value = '';
            scrollToFirstError();
            return;
        }
  
        // 🧾 Prepare rename data
        const renameRows = document.querySelectorAll('#priceTierRenameRank tbody tr');
        const renameData = [];
  
        renameRows.forEach(row => {
            const original = row.cells[0].innerText.trim();
            const renameInput = row.querySelector('td:nth-child(2) input');
            const rankInput = row.querySelector('td:nth-child(3) input');
            const renamed = renameInput.value.trim() || original;
            const rank = rankInput.value.trim();
  
            if (rank) renameData.push({ original, renamed, rank });
        });
  
        // document.getElementById('submit').disabled = true;

        
  
        try {
            const res = await fetch('/upload/runRscript3', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'csrf-token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ selected, renameData, countryNames }),
            });
  
            const response = await res.json();
            loader.classList.add('d-none');
  
            if (response.success && response.priceTierGrowthTemplate) {
                window.currentGrowthTemplates = response.priceTierGrowthTemplate;
                window.countryNames = renderCountriesForGrowth;
  
                document.getElementById('group5').classList.remove('d-none');
                stepStatus.forecastDuration = true;
                updateProgress();

                console.log("HEHEHE", renderCountriesForGrowth);
  
                renderGrowth(response.priceTierGrowthTemplate, renderCountriesForGrowth);
                spinner.classList.add('hidden');
            } else {
                throw new Error(response.error || 'Unknown error');
            }
        } catch (err) {
            loader.classList.add('d-none');
            spinner.classList.add('hidden');
            errorBox.classList.remove('d-none');
            errorBox.textContent = 'Upload failed: ' + err.message;
        }
    }
  
    // 🧩 STEP 2 — Attach handler for manual user change
    forecastDuration.addEventListener('change', handleForecastDurationChange);

    // 🧩 STEP 3 — Expose trigger function for manual invocation after prefill
    window.triggerForecastDurationChange = function() {
        if (forecastDuration.value) {
            console.log('🔁 Manually triggering forecast logic after prefill...');
            handleForecastDurationChange({ target: forecastDuration });
        }
    };
}
  

async function fetchCountriesByCluster(marketNames) {
    const query = marketNames.map(name => `marketName=${encodeURIComponent(name)}`).join('&');
    const res = await fetch(`/markets/countries?${query}`);
    if (!res.ok) throw new Error('Failed to fetch countries');
    const data = await res.json();
    return data.markets || [];
}

export function renderGrowth(growthTemplates, countriesToShow) {
    console.log('growthTemplates', growthTemplates, countriesToShow);
    const tableBody = document.querySelector('#cagrSection .tier-table');

    // Clear and re-render table header
    const row = document.createElement('tr');

    const th1 = document.createElement('th');
    th1.textContent = 'Tier Name';

    const th2 = document.createElement('th');
    const span = document.createElement('span');
    span.id = 'growthTypeLabel';
    span.textContent = 'CAGR (%)';
    th2.appendChild(span);

    row.appendChild(th1);
    row.appendChild(th2);

    tableBody.innerHTML = ''; // Clear existing content if needed
    tableBody.appendChild(row);

    const selectedGrowthType = document.querySelector('input[name="growthType"]:checked')?.value || 'CAGR';
    const defaultValue = selectedGrowthType === 'Base100' ? 100 : 0;

    // tierColumn 
    growthTemplates.forEach((row) => {
        const rawName = row["price.tier"] || ''; // Use your real column
        const tierName = rawName.trim();

        const tableRow = document.createElement('tr');
        tableRow.innerHTML = `
        <td>${tierName}</td>
        <td>
          <input type="number"
                 step="0.01"
                 value="${defaultValue}"
                 class="form-control"
                 name="cagr_${tierName}"
                 data-tier="${tierName}">
        </td>
      `;
        tableBody.appendChild(tableRow);
    });

    // Country dropdown rendering
    const countryContainer = document.getElementById('countryDropdownContainer');
    countryContainer.innerHTML = ''; // clear old content

    const label = document.createElement('label');
    label.textContent = 'Select Country: ';
    label.setAttribute('for', 'countrySelector');

    const select = document.createElement('select');
    select.id = 'countrySelector';
    select.className = 'form-control';
    console.log('countriesToShow', countriesToShow);

    countriesToShow.forEach(c => {
        const option = document.createElement('option');
        option.value = c;        // use the string itself
        option.textContent = c;  // show the country name
        select.appendChild(option);
    });

    countryContainer.appendChild(label);
    countryContainer.appendChild(select);

    // Help text
    const CagerText = `Enter the % change expected for each price tier for your forecast horizon. E.g. If you are forecasting for the next 4 years and you are expecting Standard to grow by 5% over this time, enter "5" in the box for Standard.`;

    const baseText = `Enter in the % change expected for each price tier for your forecast horizon. E.g. if you are forecasting for the next 4 years and you are expecting Standard to decline by 2%, enter "98" in the box for Standard.`;

    // Update label dynamically
    document.getElementById('growthTypeLabel').textContent =
        selectedGrowthType === 'Base100' ? 'Base Value' : 'CAGR (%)';
    document.getElementById('cagerInfo').textContent =
        selectedGrowthType === 'Base100' ? baseText : CagerText;
}


function showCAGRSection() {
    const duration = $('forecastDuration').value;
    if (duration) {
        showSection('cagrSection');
        showSection('forecastButtonSection');
    }
}
  
  
function hideSection(id) {
    $(id)?.classList.add('hidden');
}
  
  
export  function initFileUploadHandlers(csrfToken, marketNameMap,countryMapName) {
  
    const fileInputs = document.querySelectorAll('.file-input');
    
    fileInputs.forEach((input, index) => {
        input.addEventListener('change', (e) => {
            const fieldToFileNameMap = {
                initialDataFile: 'pt_mapping_file',
                ForesightFile: 'foresights_raw',
                CPSdataFile: 'unmapped_latest_year_data',
                TBSNSVFile:'tba_rsv',
                CCFbackdataFile: 'unmapped_back_data',
                 ategoryRSVFile:' _rsv',
            }; 
            const file = e.target.files[0];
            const fieldName = e.target.name;
            const fieldID = e.target.id;
            const parent = e.target.closest('.file-group');
            const loader = parent.querySelector('.loader');
            const errorBox = parent.querySelector('.error-message');
            const ext = file.name.slice(file.name.lastIndexOf('.'));
            const baseName = fieldToFileNameMap[fieldName] || fieldName;
            const fileName = `${baseName}${ext}`;
            const eventKey = `upload-progress:${fileName}`;
            const socket = getSocket();  // Reuse global socket
            socket.on('connect', () => console.log('SOCKET CONNECTED', socket.id));
            socket.on('connect_error', (err) => console.error('CONNECT_ERROR', err));
            socket.on('error', (err) => console.error('SOCKET ERROR', err));
            socket.on('disconnect', (reason) => console.log('SOCKET DISCONNECTED', reason));
            socket.on('forecast-progress', (msg) => console.log('progress:', msg));
            loader.innerText='⏳ Processing...';
            loader.classList.remove('d-none');

            const spinner = document.getElementById('reportspinner');
            spinner.classList.remove('hidden'); // 👈 show spinner

            
            const subClusterElement = document.getElementById('subClusterSelect');

            let countryMultiSelect = null;

            // Check if the element is not hidden
            if (subClusterElement && subClusterElement.offsetParent !== null) {
                countryMultiSelect = subClusterElement.value;
                // Now you can use countryMultiSelect
                console.log('Selected value:', countryMultiSelect);
            } else {
                console.log('subClusterSelect is hidden, skipping value.');
            }
  
            // ⛔ Remove old listener first
            if (currentFileEventKey && currentFileListener) {
                loader.innerText='⏳ Processing...';
                loader.classList.add('d-none');
                socket.off(currentFileEventKey, currentFileListener);
            }
  
            // ✅ Setup new listener
            currentFileListener = function (msg) {
                loader.classList.remove('d-none');
                loader.innerText = `⏳ ${msg.message}`;
         
            };
            currentFileEventKey = eventKey;
            socket.on(currentFileEventKey, currentFileListener);
            // })
            hideSuccessMessage(fieldID);
  
            // errorBox.classList.add('d-none');
            // errorBox.textContent = '';
            // loader.classList.remove('d-none');

            clearError(errorBox);
            hideSuccess(fieldID);
       
            if (!file) return;

            const validationError = validateFile(file);
            if (validationError) {
                showError(errorBox, validationError);
                e.target.value = '';
                return;
            }

            const typeOfModel =  document.getElementById('typeOfModel').value || ''; 
            const marketSelect = document.getElementById('marketSelect').value || '';  
         
            const dataType = document.getElementById('dataType').value || 'iwsr';
            const fromCurrency = document.getElementById('fromCurrency')?.value || '';
            const toCurrency = document.getElementById('toCurrency')?.value || '';
            let rate = 0.0;

            if (fromCurrency && toCurrency) {
                const inputRate = document.getElementById('exchangeRate')?.value;
                rate = inputRate ? parseFloat(inputRate) : 0.0;
            }

  
            //  const rate = document.getElementById('exchangeRate').value || 0.0; 

            const selectedIds = $('hiddenMarketId').value.split(',').filter(id => id !== 'ALL');
            const marketNames = selectedIds.map(id => marketNameMap[id]);  // Replace with your actual mapping

            const rawCountryIds = $('hiddenCountryId').value.trim();
            const selectedCountryIds = rawCountryIds
                ? rawCountryIds.split(',').filter(id => id !== 'ALL' && id !== '')
                : [];

            const countryNames = selectedCountryIds.map(id => countryMapName[id]).filter(Boolean); // filters out undefined
  
  
            
  
            const formData = new FormData();
  
            const selectedPriceTier = getTextBeforeBracket(document.querySelector('input[name="tierColumn"]:checked')?.value);
            
            const inputValidationError = validateInputs(rate, selectedPriceTier, fieldName);
            if (inputValidationError) {
                showError(errorBox, inputValidationError);
                e.target.value = '';
                return;
            }

            const exchangeRate = parseFloat(rate);
            
            // formData.append('fieldName', fieldName);
            // //formData.append('file', file);
            // formData.append('dataType', dataType);  // <-- Add this line
            formData.append(fieldName, file);  // ✅ Dynamically sets field name
            formData.append('fieldName', fieldName); // Optional (if needed separately)
            formData.append('dataType', dataType);   // Optional (for backend logic)
            formData.append('selectedPriceTier', selectedPriceTier);
            formData.append('exchangeRate', exchangeRate);
            formData.append('fromCurrency', fromCurrency);
            formData.append('toCurrency', toCurrency);
            formData.append('typeOfModel', typeOfModel);
            formData.append('marketSelect', marketSelect);

            saveCurrentCountryData();
            formData.append('marketsForGrowth',  JSON.stringify(countryGrowthData));


            formData.append('market', marketNames);
            // fromCurrency toCurrency

            if (Array.isArray(countryNames) && countryNames.length > 0) {
                formData.append('countryNames', JSON.stringify(countryNames));  // Send as JSON string
            }else if (Array.isArray(marketNames) && marketNames.length > 0) {
                formData.append('marketNames', JSON.stringify(marketNames));  // Send as JSON string
            }

            console.log('countryMultiSelect', countryMultiSelect);

            if (countryMultiSelect){

                formData.append('countryMultiSelect', countryMultiSelect);
                formData.append('subClusterSelect', countryMultiSelect);

            }
  
            if(fieldName === 'initialDataFile'){
                document.getElementById('iwsrColumnSelection').classList.add('hidden');
            }
  
            if(fieldName === 'TBSNSVFile'){
                document.getElementById('tabRsvFilePriceColumn').classList.add('hidden');
            }
            const exchangeRateField = document.getElementById("exchangeRate");
            const continueBtn = document.getElementById("continueBtn"); //
            
            const forcastDuration = document.getElementById('forecastDuration').value || '';

            if(forcastDuration){
                formData.append('forcastDuration', forcastDuration); 
            }
            
  
            fetch('/upload/single', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'csrf-token': csrfToken  // This must match what the server expects
                },
                body: formData,
            })
                .then(res => res.json())
                .then(response => {
                    loader.classList.add('d-none');
                    if (response.success) {
                        handleSuccess(response, index, fieldName, fieldID);
                    } else {
                        handleFailure(response, errorBox, fieldName, index);
                        e.target.value = '';
                    }
                })
                .catch(err => {
                    if(index === 2){
                        document.getElementById("fromCurrency").choicesInstance.enable();
                        document.getElementById("toCurrency").choicesInstance.enable();
                        exchangeRateField.disabled = false;
                        continueBtn.disabled = false;
                    } 
                    loader.classList.add('d-none');
                    errorBox.classList.remove('d-none');
                    errorBox.textContent = 'Upload failed: ' + err.message;
                    e.target.value = '';
                    if (index in stepKeyMap) {
                        stepKeyMap[index].forEach(key => {
                            stepStatus[key] = false;
                        });
                        updateProgress();
                    }
                });
        });
    });
}
function getTextBeforeBracket(input) {
    if(!input) return;
    const index = input.indexOf('(');
    return index !== -1 ? input.substring(0, index).trim() : input.trim();
}
  
function showSuccessMessage(inputId, message) {
    const parent = document.getElementById(inputId).closest('.file-group');
    const successBox = parent.querySelector('.text-success');
    successBox.textContent = message;
    successBox.classList.remove('d-none');
    if (!uploadStatus[inputId]) {
        uploadStatus[inputId] = true;
        updateStatus(); // Only count once
    }
}

function handleSuccess(response, index, fieldName, fieldID, dataType) {
    const exchangeRateField = document.getElementById("exchangeRate");
    const continueBtn = document.getElementById("continueBtn");
    const spinner = document.getElementById('reportspinner');
    spinner.classList.add('hidden'); // 👈 hide spinner
  

    if (index === 2) {
        document.getElementById("fromCurrency").choicesInstance.disable();
        document.getElementById("toCurrency").choicesInstance.disable();
        exchangeRateField.disabled = true;
        continueBtn.disabled = true;
    }

    if (index > 0 && index < 4) {
        const nextGroup = document.getElementById(`group${index + 1}`);
        if (nextGroup) nextGroup.classList.remove('d-none');
    }

    if (index === 0 && dataType === 'Nielsen') {
        const nextGroup = document.getElementById('currencyExchnageSelection');
        if (nextGroup) nextGroup.classList.remove('d-none');
    }


    if (fieldName === ' ategoryRSVFile') {
        const radioGroup = document.getElementById('radio-priceTier');
        radioGroup.classList.remove('invalid'); // Add red border
    }

    if (fieldName === 'CCFbackdataFile') {
        console.log('comes here for downlaod file', fieldName);
        // Store the upload folder path in sessionStorage for later downloads
       
        const downloadSection = document.getElementById('initialDataFileDownloads');
        if (downloadSection) {
            downloadSection.classList.remove('d-none');
            console.log('✅ Showing download buttons for mapped CSV files');
        }
    }

    if (index === 5) {
        showCAGRSection();
    }

    if (response.tierColumns) {
        renderPriceTierUI(response.tierColumns, 'price');
    }

    if (response.priceTierTbaRsv) {
        document.getElementById('dataType').value = 'iwsr';
        renderPriceTierUI(response.priceTierTbaRsv, 'tba');
    }

    if (response.priceTierRenameColumns) {
        console.log(response.priceTierRenameColumns);
        renderPriceTierUI(response.priceTierRenameColumns, 'rename');
    }

    // Mark step completed and update UI progress
    if (index in stepKeyMap) {
        stepKeyMap[index].forEach(key => {
            stepStatus[key] = true;
        });
        updateProgress();
    }

    showSuccessMessage(fieldID, 'File is processed successfully');
}
function handleFailure(response, errorBox, fieldName, index) {
    const exchangeRateField = document.getElementById("exchangeRate");
    const continueBtn = document.getElementById("continueBtn");
    const spinner = document.getElementById('reportspinner');
    spinner.classList.add('hidden'); // 👈 hide spinner

    if (index === 2) {
        document.getElementById("fromCurrency").choicesInstance.enable();
        document.getElementById("toCurrency").choicesInstance.enable();
        exchangeRateField.disabled = false;
        continueBtn.disabled = false;
    }

    let errorText = `❌ ${response.error || 'Unknown error'}`;
    if (response.missing?.length) {
        errorText += ` | Missing headers: ${response.missing.join(', ')}`;
    }

    showError(errorBox, errorText);

    if (index in stepKeyMap) {
        stepKeyMap[index].forEach(key => {
            stepStatus[key] = false;
        });
        updateProgress();
    }

    if (fieldName === ' ategoryRSVFile') {
        const radioGroup = document.getElementById('radio-priceTier');
        radioGroup.classList.add('invalid'); // Add red border
    }
}
export function updateStatus() {
    processedFileCount++;
    const statusDiv = document.getElementById('file-upload-progress');
    statusDiv.textContent = `${processedFileCount}/${totalFilesToUpload} files processed`;
    if (processedFileCount === totalFilesToUpload) {
        document.getElementById('submit').disabled = false;
        document.getElementById('submit').classList.remove('d-none');
    }
}

function hideSuccessMessage(inputId) {
  
    if (uploadStatus[inputId]) {
        processedFileCount--;
        uploadStatus[inputId] = false;
        const statusDiv = document.getElementById('file-upload-progress');
        statusDiv.textContent = `${processedFileCount}/${totalFilesToUpload} files processed`;
        document.getElementById('submit').disabled = true;
    }
  
  
    // if (processedFileCount >0)  processedFileCount--;
    const parent = document.getElementById(inputId).closest('.file-group');
    const successBox = parent.querySelector('.text-success');
  
    successBox.classList.add('d-none');
}
export function renderPriceTierUI(tierColumns, type, progressData = null) {
    const radioGroup = document.getElementById('radio-priceTier');
    const priceTierLbl = document.getElementById('priceTierLbl'); 
    const tbaPriceGroup =  document.getElementById('radio-priceTier1'); 
    const tableBody = document.querySelector('#priceTierRenameRank .tier-table tbody');
  
    // if (type === 'price') {
    // // Clear only radio buttons
    //     radioGroup.innerHTML = '';
    //     if (tierColumns.length === 1) {
    //         priceTierLbl.textContent = 'Price Tier Column';
    //     } else {
    //         priceTierLbl.textContent = 'Select Price Tier Column';
    //     }
  
    //     tierColumns.forEach((col) => {
    //         const radioLabel = document.createElement('label');
    //         const dataType = document.getElementById('dataType').value || 'iwsr';
    //         if(dataType ==='Nielsen'){
    //             radioLabel.innerHTML = `
    //       <input type="radio" name="tierColumn" value="${col}" checked> ${col}
    //     `;
  
    //         }else{
    //             radioLabel.innerHTML = `
    //       <input type="radio" name="tierColumn" value="${col}"> ${col}
    //     `;
    //         }
    //         radioGroup.appendChild(radioLabel);
    //     });
  
    //     const defaultSelected = document.querySelector('input[name="tierColumn"]:checked');
    //     if (defaultSelected) {
    //         const nextGroup = document.getElementById(`currencyExchnageSelection`);
    //         if (nextGroup) nextGroup.classList.remove('d-none');
    //     }
  
    //     document.getElementById('iwsrColumnSelection').classList.remove('hidden');
    //     document.getElementById('multiFileUploadSection').classList.remove('hidden');
  
    //     radioGroup.addEventListener('change', (event) => {
    //         if (event.target.name === 'tierColumn') {
    //             const nextGroup = document.getElementById(`currencyExchnageSelection`);
    //             if (nextGroup) nextGroup.classList.remove('d-none');
         
    //         }
    //     });
    // }

    if (type === 'price') {
        // Clear only radio buttons
        radioGroup.innerHTML = '';
        priceTierLbl.textContent =
          tierColumns.length === 1 ? 'Price Tier Column' : 'Select Price Tier Column';
    
        const dataType = document.getElementById('dataType').value || 'iwsr';
    
        tierColumns.forEach((col) => {
            const radioLabel = document.createElement('label');
            radioLabel.innerHTML = `
            <input type="radio" name="tierColumn" value="${col}">
            ${col}
          `;
            radioGroup.appendChild(radioLabel);
        });
    
        // ✅ If progressData.selectedPriceTier exists, preselect it
      
        setTimeout(() => {
            if (progressData?.selectedPriceTier) {
                const savedTier = progressData.selectedPriceTier.trim();
          
                const radios = Array.from(
                    radioGroup.querySelectorAll('input[name="tierColumn"]')
                );
          
                console.log('🔍 Saved tier:', savedTier);
                console.log('🎯 Rendered radio values:', radios.map(r => r.value));
          
                // Match by prefix (before any '(' in the radio value)
                const savedRadio = radios.find((r) => {
                    const radioBase = r.value.split('(')[0].trim(); // get only the first part
                    return radioBase === savedTier;
                });
          
                if (savedRadio) {
                    savedRadio.checked = true;
                    savedRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Preselected radio:', savedRadio.value);
                } else {
                    console.warn('⚠️ No match found for', savedTier);
                }
            }
        }, 0);
          
          
        
        if (dataType === 'Nielsen' && tierColumns.length > 0) {
            // Fallback default for Nielsen
            const firstRadio = radioGroup.querySelector('input[name="tierColumn"]');
            if (firstRadio) {
                firstRadio.checked = true;
                firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    
        const defaultSelected = document.querySelector('input[name="tierColumn"]:checked');
        if (defaultSelected) {
            const nextGroup = document.getElementById('currencyExchnageSelection');
            if (nextGroup) nextGroup.classList.remove('d-none');
        }
    
        document.getElementById('iwsrColumnSelection').classList.remove('hidden');
        document.getElementById('multiFileUploadSection').classList.remove('hidden');
    
        // Handle changes dynamically
        radioGroup.addEventListener('change', (event) => {
            if (event.target.name === 'tierColumn') {
                const nextGroup = document.getElementById('currencyExchnageSelection');
                if (nextGroup) nextGroup.classList.remove('d-none');
            }
        });
    }
  
    if(type === 'tba'){
    // Clear only radio buttons
        tbaPriceGroup.innerHTML = '';
        tierColumns.forEach((col) => {
            const radioLabel = document.createElement('label');
            radioLabel.innerHTML = `${col}`;
            tbaPriceGroup.appendChild(radioLabel);
        });
   
        document.getElementById('tabRsvFilePriceColumn').classList.remove('hidden');
  
    }
  
    // if (type === 'rename') {
    // // Clear only table body
    //     tableBody.innerHTML = '';
  
    //     tierColumns.forEach((col, index) => {
    //         const row = document.createElement('tr');
    //         row.innerHTML = `
    //       <td>${col}</td>
    //       <td>
    //         <input
    //           type="text"
    //           class="form-control"
    //           placeholder="New Name for ${col}"
    //           id="name-input-${index}"
    //         >
    //       </td>
    //       <td>
    //         <div class="position-relative">
    //           <input
    //             type="number"
    //             id="rank-input-${index}"
    //             class="form-control rank-input"
    //             placeholder="Rank"
    //             inputmode="numeric"
    //           >
    //           <div class="invalid-feedback">Rank is required.</div>
    //         </div>
    //       </td>
    //     `;
    //         tableBody.appendChild(row);
    //         const rankInput = row.querySelector('.rank-input');
    //         if (rankInput) {
    //             // Prevent non-numeric characters like '.', '-', 'e'
    //             rankInput.addEventListener('keydown', (e) => {
    //                 if (
    //                     e.key === '.' || 
    //             e.key === '-' || 
    //             e.key === 'e' || 
    //             e.key === '+' || 
    //             e.key === ',' 
    //                 ) {
    //                     e.preventDefault();
    //                 }
    //             });
  
    //             // Sanitize pasted content
    //             rankInput.addEventListener('input', (e) => {
    //                 e.target.value = e.target.value.replace(/[^\d]/g, '');
    //             });
    //         } });
    //     document.getElementById('priceTierRenameRank').classList.remove('hidden');
    //     document.getElementById('durationSection').classList.remove('hidden');
    // }

    if (type === 'rename') {
        // Clear only the table body
        tableBody.innerHTML = '';

       
      
        // Assume `parsedTiers` is the result from your parsePriceTierCsv() function
        // e.g. [{ original: 'Mainstream', renamed: 'Mainstream', rank: 1 }, ...]
        tierColumns.forEach((tier, index) => {
            const original = tier['Original price tier']?.trim() || '';
            const renamed = tier['Renamed price tier']?.trim() || '';
            const rank = tier['Rank price tier']?.trim() || '';
            console.log('tierColumns rename', tier);
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${original}</td>
            <td>
              <input
                type="text"
                class="form-control"
                placeholder="New Name for ${original}"
                id="name-input-${index}"
                value="${renamed || ''}"
              >
            </td>
            <td>
              <div class="position-relative">
                <input
                  type="number"
                  id="rank-input-${index}"
                  class="form-control rank-input"
                  placeholder="Rank"
                  inputmode="numeric"
                  value="${rank || ''}"
                >
                <div class="invalid-feedback">Rank is required.</div>
              </div>
            </td>
          `;
            tableBody.appendChild(row);
      
            const rankInput = row.querySelector('.rank-input');
            if (rankInput) {
            // Prevent non-numeric characters
                rankInput.addEventListener('keydown', (e) => {
                    if (['.', '-', 'e', '+', ','].includes(e.key)) {
                        e.preventDefault();
                    }
                });
      
                // Sanitize pasted content
                rankInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^\d]/g, '');
                });
            }
        });
      
        document.getElementById('priceTierRenameRank').classList.remove('hidden');
        document.getElementById('durationSection').classList.remove('hidden');
    }
} 

export function setGrowthTypeValue(countryMapName) {
    const radios = document.querySelectorAll('input[name="growthType"]');
    console.log('🎯 Found radios:', radios.length);

  

    const rawCountryIds = $('hiddenCountryId').value.trim();
    const selectedCountryIds = rawCountryIds
        ? rawCountryIds.split(',').filter(id => id !== 'ALL' && id !== '')
        : [];

    const countryNames = selectedCountryIds.map(id => countryMapName[id]).filter(Boolean); 
    console.log('GrothtypeChange counrty', countryNames);
  
    radios.forEach((radio) => {
        radio.addEventListener('change', () => {
            console.log('📻 Radio changed:', radio.value);
            if (window.currentGrowthTemplates) {
                saveCurrentCountryData(); // save current
                renderGrowth(window.currentGrowthTemplates, window.countryNames);
            }
        });
    });
}

let countryGrowthData = {}; // stores growth per country
let currentCountry = null;

function renderGrowthForCountry(country, growthTemplates) {
    console.log('growthTemplates', growthTemplates);
    const tableBody = document.querySelector('#cagrSection .tier-table');
    tableBody.innerHTML = '';

    const row = document.createElement('tr');
    row.innerHTML = `
    <th>Tier Name</th>
    <th><span id="growthTypeLabel">CAGR (%)</span></th>
  `;
    tableBody.appendChild(row);
    const selectedGrowthType = document.querySelector('input[name="growthType"]:checked')?.value || 'CAGR';
    const defaultValue = selectedGrowthType === 'Base100' ? 100 : 0;

    // Get saved data for this country or empty
    const savedData = countryGrowthData[country] || [];

    growthTemplates.forEach(tierRow => {
        const tierName = tierRow["price.tier"].trim();

        // find saved value if available
        const savedTier = savedData.find(d => d.tier === tierName);
        const value = savedTier ? savedTier.cagr : defaultValue;

        const tableRow = document.createElement('tr');
        tableRow.innerHTML = `
      <td>${tierName}</td>
      <td>
        <input type="number"
               step="0.01"
               value="${value}"
               class="form-control"
               name="cagr_${tierName}"
               data-tier="${tierName}">
      </td>
    `;
        tableBody.appendChild(tableRow);
    });

    currentCountry = country;
}

// Save current inputs before switching
function saveCurrentCountryData() {
    if (!currentCountry) {
        const countrySelector = document.getElementById('countrySelector');
        console.log('countrySelector', countrySelector);
        if (countrySelector) {
            currentCountry = countrySelector.value; 
        }
    }    

    const rows = document.querySelectorAll('#cagrSection .tier-table tr');
    let data = [];

    rows.forEach((row, index) => {
        if (index === 0) return; // skip header
        const tier = row.cells[0].innerText.trim();
        const input = row.querySelector('input');
        const cagr = parseFloat(input.value);
        data.push({ tier, cagr: isNaN(cagr) ? null : cagr });
    });

    countryGrowthData[currentCountry] = data;
}

// Handle dropdown change
document.addEventListener('change', e => {
    if (e.target.id === 'countrySelector') {
        saveCurrentCountryData(); // save current
        renderGrowthForCountry(e.target.value, window.currentGrowthTemplates); // load new
    }
});
