const totalSteps = 11;
export const stepStatus = {
    marketSelect: false,
    dataTypeSection: false,
    initialDataFile: false,
    tierColumn: false,
    TBSNSVFile: false,
     ategoryRSVFile: false,
    CPSdataFile: false,
    CCFbackdataFile: false,
    forecastDuration:false,
    ForesightFile:false,
    currencyExchange:false,
    finalSubmit: false,
};



export const stepKeyMap = {
    0: ['initialDataFile'],
    1: ['tierColumn', 'TBSNSVFile'],
    2: [' ategoryRSVFile'],
    3: ['CPSdataFile'],
    4: ['CCFbackdataFile'],
    5: ['ForesightFile']
};

export function updateProgress() {
  
    const completed = Object.values(stepStatus).filter(Boolean).length;
    document.getElementById('progressStatus').textContent = `Progress: ${completed} / ${totalSteps} steps completed`;
    document.getElementById('progressBar').value = completed;
}   