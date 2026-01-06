/* global Choices */
const currencyList = [
    'AED','ARS','AUD','BBD','BGN','BHD','BRL','BZD','CAD','CHF','CLP','CNY','COP','CRC','CUP','CYP',
    'CZK','DKK','DOP','EEK','EUR','FJD','GBP','GHC','GHS','GTQ','GYD','HKD','HTG','HUF','IDR','INR',
    'JMD','JPY','KES','KRN','KRW','LBP','LKR','LRD','LYD','MTL','MUR','MXN','MYR','NAD','NGN','NOK',
    'NTD','NZD','OMR','PHP','PLN','RON','RUB','RUR','SAR','SCR','SEK','SGD','SKK','SLL','SVC','THB',
    'TRL','TTD','TWD','TZS','UGX','USD','UYU','VEB','VND','XAF','XCD','ZAR','PEN','PYG','SDG','TRY',
    'UAH','ETB','SSP','VEF','AOA','MZN','BMD','KZT','RWF','XOF','XPF','BOB','BSD','BWP','ECS','HNL',
    'HRK','ILS','IQD','ISK','JOD','KYD','MAD','MWK','NIO','NPR','TND','VES','KHR','MMK','RSD','SZL',
    'CUC','VE1','RMB','CLF','MZM'
];
  
export function populateCurrencyDropdowns() {
    const fromSelect = document.getElementById('fromCurrency');
    const toSelect = document.getElementById('toCurrency');
  
    const placeholderOptionFrom = document.createElement("option");
    placeholderOptionFrom.value = "";
    placeholderOptionFrom.textContent = "Select currency";
    placeholderOptionFrom.disabled = true;
    placeholderOptionFrom.selected = true;
  
    const placeholderOptionTo = document.createElement("option");
    placeholderOptionTo.value = "";
    placeholderOptionTo.textContent = "Select currency";
    placeholderOptionTo.disabled = true;
    placeholderOptionTo.selected = true;
    toSelect.appendChild(placeholderOptionTo);
    fromSelect.appendChild(placeholderOptionFrom);
   
  
  
    currencyList.forEach(code => {
        const option1 = new Option(code, code);
        const option2 = new Option(code, code);
        fromSelect.add(option1);
        toSelect.add(option2);
    });
  
    
  
    // Initialize Choices.js on both dropdowns
    fromSelect.choicesInstance = new Choices(fromSelect, {
        placeholder: true,
        searchEnabled: true,
        shouldSort: true,
        itemSelectText: '',
        placeholderValue: 'Currency for uploaded files',
        searchPlaceholderValue: 'Search...'
    });
  
    toSelect.choicesInstance = new Choices(toSelect, {
        placeholder: true,
        searchEnabled: true,
        shouldSort: true,
        itemSelectText: '',
        placeholderValue: 'Currency for Report',
        searchPlaceholderValue: 'Search...'
    });
}

export function initCurrencyHandlers() {
    document.getElementById("fromCurrency").addEventListener("change", function () {
        if (this.value) {
            document.getElementById("fromCurrencyError").classList.add("d-none");
        }
        checkCurrencyMatch();
    });
  
    document.getElementById("toCurrency").addEventListener("change", function () {
        if (this.value) {
            document.getElementById("toCurrencyError").classList.add("d-none");
        }
        checkCurrencyMatch();
    });
  
    document.getElementById("exchangeRate").addEventListener("input", function () {
        const rate = parseFloat(this.value);
        if (rate && rate > 0) {
            document.getElementById("exchangeRateError").classList.add("d-none");
        }
    });

    function checkCurrencyMatch() {
        const fromCurrency = document.getElementById("fromCurrency").value;
        const toCurrency = document.getElementById("toCurrency").value;
        const exchangeRateInput = document.getElementById("exchangeRate");
    
        if (fromCurrency && toCurrency && fromCurrency === toCurrency) {
            exchangeRateInput.value = "1";
            exchangeRateInput.readOnly = true; // Prevent user input
            document.getElementById("exchangeRateError").classList.add("d-none");
        } else {
            exchangeRateInput.readOnly = false; // Allow input
        }
    }
}
  
export function initContinueBtnHandler(stepStatus, updateProgress) {
    document.getElementById('continueBtn').addEventListener('click', function (e) {
        e.preventDefault(); // Prevent form submit
        console.log('⚡ continueBtn clicked');
        let valid = true;
        console.log("✅ validateMandatoryFields called Currency");
  
        const fromCurrency = document.getElementById("fromCurrency").value;
        const toCurrency = document.getElementById("toCurrency").value;
        const exchangeRate = parseFloat(document.getElementById('exchangeRate').value);
  
        const fromError = document.getElementById("fromCurrencyError");
        const toError = document.getElementById("toCurrencyError");
        const rateError = document.getElementById("exchangeRateError");
  
        // Reset errors
        fromError.classList.add("d-none");
        toError.classList.add("d-none");
        rateError.classList.add("d-none");
  
        if (!fromCurrency) {
            fromError.classList.remove("d-none");
            valid = false;
        }
  
        if (!toCurrency) {
            toError.classList.remove("d-none");
            valid = false;
        }
  
        if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
            rateError.classList.remove("d-none");
            valid = false;
        }
  
        if (valid) {
            stepStatus.currencyExchange = true;
            updateProgress();
            const nextGroup = document.getElementById(`group1`);
            if (nextGroup) nextGroup.classList.remove('d-none');
        }
    });
}

export function restoreExchangeRateSection(progressData) {
    if (!progressData) return;
  
    const fromCurrencySelect = document.getElementById('fromCurrency');
    const toCurrencySelect = document.getElementById('toCurrency');
    const exchangeRateInput = document.getElementById('exchangeRate');
    const continueBtn = document.getElementById('continueBtn');
  
    if (!fromCurrencySelect || !toCurrencySelect || !exchangeRateInput) return;
  
    const { fromCurrency, toCurrency, exchangeRate } = progressData;
    console.log('Restoring exchange data:', { fromCurrency, toCurrency, exchangeRate });
  
    // ✅ Use Choices.js API to set selected values
    if (fromCurrency && fromCurrencySelect.choicesInstance) {
        const fromChoices = fromCurrencySelect.choicesInstance;
        fromChoices.setChoiceByValue(fromCurrency);
    }
  
    if (toCurrency && toCurrencySelect.choicesInstance) {
        const toChoices = toCurrencySelect.choicesInstance;
        toChoices.setChoiceByValue(toCurrency);
    }
  
    // ✅ Set exchange rate if valid
    if (exchangeRate && !isNaN(parseFloat(exchangeRate))) {
        exchangeRateInput.value = exchangeRate;
    }
  
    // ✅ Trigger dependent logic
    fromCurrencySelect.dispatchEvent(new Event('change', { bubbles: true }));
    toCurrencySelect.dispatchEvent(new Event('change', { bubbles: true }));
    exchangeRateInput.dispatchEvent(new Event('input', { bubbles: true }));
  
    // ✅ Trigger the Continue button automatically if all values are set
    if (fromCurrency && toCurrency && exchangeRate) {
        console.log('Auto-clicking continue button...');
        setTimeout(() => continueBtn.click(), 600); // small delay for Choices render
    }
}



  