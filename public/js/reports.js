const $ = (id) => document.getElementById(id);
import { fetchCSRFToken } from './csrf.js';
import { showFlashMessage } from './uiHelpers.js';





document.addEventListener('DOMContentLoaded', () => {
    const countrySelect = document.getElementById('countrySelect');
    const downloadBtn = document.getElementById('downloadReportBtn');
    const tableConfigs = new Map([
        ['TBA_RSV_Output', {}],
        ['Absolute-Change-in-Share-by-Value-Pool', { bar: true }],
        ['Current-Value-Pool-Heat-Map', { heatMap: true }],
        [' -Value-Pool-Heat-Map', { heatMap: true }],
        [' _RSV_Output', {}],
        ['Forecasted-value-pool-heat-map', { heatMap: true }],
        ['Top-Down-serves-forecast', {}],
        ['LY', {}],
        ['Forecast-shares-result', {}],
        ['Motivations-trend', {}],
        ['Foresights-trend', {}],
        ['Foresight-Weight', { colorBg: true }],
        ['Bottomup-serves-forecast', {}],
        ['Ensemble-weights', {}],
        ['Ensemble-serves-forecast', {}],
        ['Decision-Matrix', {}],
        ['OM_summ_tba', {mekko: true}],
        ['PT_summ_tba', {}],
        ['OM_summ_chng', {mekko: true}],
        ['PT_summ_chng', {}],
        ['OM_summ_dg', {mekko: true}],
        ['PT_summ_dg', {}]

    ]);

 
  
    // Update download link whenever the country changes
    if (countrySelect && downloadBtn) {
        downloadBtn.addEventListener('click', function (e) {
            e.preventDefault(); // prevent default empty href navigation
            const selectedCountry = countrySelect.value;
            window.location.href = `/reports/excel?country=${encodeURIComponent(selectedCountry)}`;
        });
    }

   
    console.log('here comes ......');
    (async () => {
        const csrfToken = await fetchCSRFToken();
        console.log('csrfToken after fetch:', csrfToken);

        // 👇 pass token into form handler
        initWeightForm(csrfToken, tableConfigs);
        initPublishReport(csrfToken);
    })();
  
    document.getElementById('countrySelect').addEventListener('change', async function () {
        const country = this.value;
        const reportName = 'forcast';
        localStorage.setItem('selectedCountry', country);

        const spinner = document.getElementById('reportspinner');
       

        try {
            spinner.classList.remove('hidden'); // 👈 show spinner
            const resp = await fetch(`/reports/${encodeURIComponent(reportName)}/data?country=${encodeURIComponent(country)}`);
            const { success, data, mekkoPath1, error } = await resp.json();
            console.log('ddd', mekkoPath1);
            if (!success) throw new Error(error);

            

            for (const [tableId, config] of tableConfigs.entries()) {
                renderTable(tableId, data[humanizeKey(tableId)], config.heatMap, config.bar, config.colorBg, config.mekko);
            }

            renderMekkoChart(country, reportName);
        } catch (err) {
            console.error(err);
            showFlashMessage('Error loading report: ' + err.message, 'error', 5000);

        }finally {
            spinner.classList.add('hidden'); // 👈 hide spinner
        }
    });

    for (const [tableId, config] of tableConfigs.entries()) {
        applyTableEnhancements(tableId, config);
    }

  

   
      
   

    document.querySelectorAll(".arrow").forEach(arrow => {
        arrow.addEventListener("click", e => {
            const sidebar = e.target.closest(".sidebar");
            if (sidebar) sidebar.classList.toggle("showMenu");
        });
    });

    // Sidebar menu button toggle
    const sidebarBtn = document.querySelector(".btn-menu");
    const sidebar = document.querySelector(".sidebar");

    if (sidebarBtn && sidebar) {
        sidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("close");
        });
    } else {
        console.warn('.btn-menu or .sidebar not found in DOM');
    }

    // Menu toggle
    $('.btn-menu').on('click', function (e) {
        e.preventDefault();
        $(this).toggleClass('actived');
    });

    const initialTableConfigs = new Map([
        ['Current-Value-Pool-Heat-Map', { heatMap: true }],
        [' -Value-Pool-Heat-Map', { heatMap: true }],
        ['Forecasted-value-pool-heat-map', { heatMap: true }],
        ['Absolute-Change-in-Share-by-Value-Pool', { bar: true }],
        ['Foresight-Weight', { colorBg: true }]

    ]);

    for (const [tableId, config] of initialTableConfigs.entries()) {
        const table = document.getElementById(tableId);
        if (table) {
            if (config.heatMap) colorGradeTable(tableId);
            if (config.bar) renderDivergingBars(table);
            if (config.colorBg) applyColorCoding(table);
           
        }
    }

    // Country select listener

   
      

      
  
});

function applyTableEnhancements(tableId, config) {
    const table = document.getElementById(tableId);
    if (!table) return;

    if (config.heatMap) colorGradeTable(tableId);
    if (config.bar) renderDivergingBars(table);
    if (config.colorBg) applyColorCoding(table);
    if (config.mekko) applyCellColor(table);
}

function getTierColumnBg(name) {
    switch (name) {
    case 'Relax':
        return 'Relax-bg';
    case 'Reward':
        return 'Reward-bg';
    case 'Savour':
        return 'Savour-bg';
    case 'Revel':
        return 'Revel-bg';
    case 'Connect':
        return 'Connect-bg';
    case 'Impress':
        return 'Impress-bg';
    default:
        return '';
    }
}

function resizeIframe(frameId) {
    var iframe = document.getElementById(frameId);
   
    if (iframe) {
        if(iframe.contentWindow.document.body.scrollHeight>200){
            iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
        }else {
            iframe.style.height = '800px';
        }   

    }
}


function renderMekkoChart(country, reportName) {
    const safePattern = /^[A-Za-z0-9 _-]{1,50}$/;
    if (!safePattern.test(country) || !safePattern.test(reportName)) {
        console.error('Invalid input detected');
        return;
    }

    const charts = [
        { frameId: 'mekkoFrame',   spinnerId: 'loadingSpinner',   chartId: 'chart1', chartNum: 1 },
        { frameId: 'mekkoFrame1',  spinnerId: 'loadingSpinner1',  chartId: 'chart2', chartNum: 2 },
        { frameId: 'mekkoFrame2',  spinnerId: 'loadingSpinner2',  chartId: 'chart3', chartNum: 3 }
    ];

    charts.forEach(({ frameId, spinnerId, chartId, chartNum }) => {
        const iframe = document.getElementById(frameId);
        const spinner = document.getElementById(spinnerId);

        // Remove any existing iframe content to avoid showing old chart
        iframe.src = 'about:blank';  
        iframe.classList.add('hidden');
        iframe.style.height = '1px';

        // Show loading spinner immediately
        spinner.style.display = 'block';

        // Also clear any HTML container if present
        const chartContainer = document.getElementById(chartId);
        if (chartContainer) chartContainer.textContent = '';

        // Build new chart URL
        const srcUrl = `/reports/${encodeURIComponent(reportName)}/type/chart`
            + `?country=${encodeURIComponent(country)}&chart=${chartNum}`;

        // Set iframe sandbox for security
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

        // Load new chart
        iframe.onload = () => {
            spinner.style.display = 'none';
            iframe.classList.remove('hidden');
            resizeIframe(frameId);
        };
        iframe.src = srcUrl;
    });
}


function renderTable(tableId, data, heatMap = false, bar = false, colorBg = false, mekko = false) {
    const table = document.getElementById(tableId);
    if (!table) return console.error(`renderTable: No table with ID "${tableId}"`);

    table.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
        table.createCaption().textContent = 'No data available';
        return;
    }

    const cols = Object.keys(data[0]);

    // Header
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    cols.forEach(col => {
        const th = document.createElement('th');
        th.textContent =  humanizeColumn(col);
        th.className= getTierColumnBg(humanizeColumn(col));
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach(item => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');

            if (tableId === 'Absolute-Change-in-Share-by-Value-Pool' && col !== 'price.tier') {
                td.className = 'bar-data';
            }

            let colValue = item[col];
            if (col === 'price.tier') colValue = colValue?.toUpperCase();

            td.textContent = colValue != null ? colValue : '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    applyTableEnhancements(tableId, { heatMap, bar, colorBg, mekko });

    // if (heatMap) colorGradeRows(tableId);
    // if (bar) renderDivergingBars(table);
    // if (colorBg) applyColorCoding(table);
    // if (mekko)   applyCellColor(table);
}

function humanizeColumn(key) {
    return key.replace(/[._]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function humanizeKey(str) {
    return str.replace(/-/g, ' ');
}


// function getColor(value, min, median, max) {
//     if (value <= median) {
//         const ratio = (value - min) / (median - min || 1e-6);
//         return `rgb(255, ${Math.round(255 * ratio)}, 0)`;
//     } else {
//         const ratio = (value - median) / (max - median || 1e-6);
//         return `rgb(${Math.round(255 * (1 - ratio))}, 255, 0)`;
//     }
// }

// function colorGradeRows(tableId) {
//     const rows = document.querySelectorAll(`#${tableId} tbody tr`);
//     rows.forEach(row => {
//         const cells = Array.from(row.cells).slice(1, -1); // skip first & last if needed
//         const values = cells.map(cell => parsePercent(cell.textContent));
//         const sorted = [...values].sort((a, b) => a - b);
//         const [min, median, max] = [sorted[0], sorted[Math.floor(values.length / 2)], sorted[sorted.length - 1]];

//         cells.forEach((cell, i) => {
//             cell.style.backgroundColor = getColor(values[i], min, median, max);
//             cell.style.color = 'black';
//         });
//     });
// }

function getColor(value, min, median, max) {
    if (value <= median) {
        const ratio = (value - min) / (median - min || 1e-6);
        // red → yellow
        return `rgb(255, ${Math.round(255 * ratio)}, 0)`;
    } else {
        const ratio = (value - median) / (max - median || 1e-6);
        // yellow → dark green
        const r = Math.round(255 * (1 - ratio));
        const g = Math.round(255 - 105 * ratio); // reduce green brightness
        return `rgb(${r}, ${g}, 0)`;
    }
}
  
function parsePercent1(text) {
    const num = parseFloat(text.replace('%', '').trim());
    return isNaN(num) ? 0 : num;
}
  
// function colorGradeTable(tableId) {
//     const table = document.getElementById(tableId);
//     const rows = table.querySelectorAll('tbody tr');
  
//     const cells = [];
//     const values = [];
  
//     rows.forEach(row => {
//         const tds = Array.from(row.querySelectorAll('td'));
//         // Skip first (Price Tier) and last (Total) columns
//         const targetCells = tds.slice(1, -1);
//         targetCells.forEach(td => {
//             const val = parsePercent1(td.textContent);
//             if (!isNaN(val)) {
//                 cells.push(td);
//                 values.push(val);
//             }
//         });
//     });
  
//     const sorted = [...values].sort((a, b) => a - b);
//     const min = sorted[0];
//     const median = sorted[Math.floor(sorted.length / 2)];
//     const max = sorted[sorted.length - 1];
  
//     cells.forEach((cell, i) => {
//         const value = values[i];
//         cell.style.backgroundColor = getColor(value, min, median, max);
//         cell.style.color = 'black';
//     });
// }

function colorGradeTable(tableId) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tbody tr');
  
    const cells = [];
    const values = [];

    rows.forEach(row => {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length === 0) return;

        const firstCellText = tds[0].textContent.trim();

        // ✅ Skip row if first column contains 'Total'
        if (firstCellText.toLowerCase().includes('total')) return;

        // ✅ Skip first (Price Tier) and last (Total) columns
        const targetCells = tds.slice(1, -1);
        targetCells.forEach(td => {
            const val = parsePercent1(td.textContent);
            if (!isNaN(val)) {
                cells.push(td);
                values.push(val);
            }
        });
    });

    if (values.length === 0) return; // nothing to color

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = sorted[sorted.length - 1];

    // ✅ Apply color only to included cells
    cells.forEach((cell, i) => {
        const value = values[i];
        cell.style.backgroundColor = getColor(value, min, median, max);
        cell.style.color = 'black';
    });
}


  
  
  
  

function renderDivergingBars(tableElement) {
    const minBarWidth = 8;
    const cells = tableElement.querySelectorAll('td.bar-data');

    const values = Array.from(cells).map(td => {
        const raw = td.textContent.trim().replace('%', '');
        return parseFloat(raw) || 0;
    });

    const maxValue = Math.max(...values.map(Math.abs), 0.0001);

    cells.forEach(td => {
        const raw = td.textContent.trim().replace('%', '');
        const value = parseFloat(raw) || 0;
        td.innerHTML = '';
        console.log(value);

        const barCell = document.createElement('div');
        barCell.className = 'bar-cell';

        const label = document.createElement('div');
        label.className = 'value-label';
        label.textContent = (value > 0 ? '+' : '') + value.toFixed(1) + '%';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';

        const bar = document.createElement('div');
        bar.classList.add('bar');

        barCell.appendChild(label);
        barCell.appendChild(bar);
        td.appendChild(barCell);

        const labelWidth = label.offsetWidth;
        const cellWidth = barCell.offsetWidth || 100;
        const scaledWidth = Math.max((Math.abs(value) / maxValue) * 100, minBarWidth) / 2;

        if (value > 0) {
            bar.classList.add('bar-positive');
            bar.style.left = `calc(50% + ${labelWidth / 2}px)`;
            bar.style.width = `calc(${scaledWidth}% - ${labelWidth / 2 * 100 / cellWidth}%)`;
        } else if (value < 0) {
            bar.classList.add('bar-negative');
            bar.style.right = `calc(50% + ${labelWidth / 2}px)`;
            bar.style.width = `calc(${scaledWidth}% - ${labelWidth / 2 * 100 / cellWidth}%)`;
        }
    });
}
function applyCellColor(tableElement) {
    const rows = tableElement.querySelectorAll('tr');
    rows.forEach((row, index) => {
        if (index === 0) return; // Skip header row

        const cells = row.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) { // Skip first column
            const cell = cells[i];
            const val = cell.textContent.trim();
            const className = getTierColumnBg(humanizeColumn(val));
            

            if (className) {
                cell.className = className; // Overwrites all classes
                // or cell.classList.add(className); // Adds without overwriting
            }
        }
    });
}
function applyColorCoding(tableElement) {
    const rows = tableElement.querySelectorAll('tr');
    rows.forEach((row, index) => {
        if (index === 0) return;
        const cells = row.querySelectorAll('td');
        for (let i = 1; i < cells.length; i++) {
            const cell = cells[i];
            const val = parseFloat(cell.textContent.trim());
            if (!isNaN(val)) {
                if (val > 0.5) cell.classList.add('cell-green');
                else if (val < -0.5) cell.classList.add('cell-red');
                else cell.classList.add('cell-yellow');
            }
        }
    });
}

// function applyColorCoding(tableElement) {
//     const rows = tableElement.querySelectorAll('tr');
//     const values = [];

//     // 1️⃣ Gather all numeric values from the table
//     rows.forEach((row, index) => {
//         if (index === 0) return; // skip header
//         const cells = row.querySelectorAll('td');
//         for (let i = 1; i < cells.length; i++) {
//             const val = parseFloat(cells[i].textContent.replace('%', '').trim());
//             if (!isNaN(val)) values.push(val);
//         }
//     });

//     // 2️⃣ Get global min, max, and avg
//     const min = Math.min(...values);
//     const max = Math.max(...values);
//     const avg = (max + min) / 2;

//     // 3️⃣ Apply color scaling to each cell
//     rows.forEach((row, index) => {
//         if (index === 0) return;
//         const cells = row.querySelectorAll('td');
//         for (let i = 1; i < cells.length; i++) {
//             const cell = cells[i];
//             const val = parseFloat(cell.textContent.replace('%', '').trim());
//             if (isNaN(val)) continue;

//             // 🔹 Use avg-centered normalization
//             const norm = (val - avg) / (max - min); // range ~ -0.5 to +0.5
//             const hue = norm > 0 ? 120 : 0;         // green or red
//             const lightness = 90 - Math.abs(norm) * 80; // darker for stronger deviation

//             const color = `hsl(${hue}, 90%, ${lightness}%)`;

//             cell.style.backgroundColor = color;
//             cell.style.color = lightness < 50 ? '#fff' : '#000';
//         }
//     });
// }

/**
 * Apply heatmap coloring to a table.
 * tableElement: <table> element
 * options: { mode: 'column' | 'center' | 'global' } (default 'column')
 */

// function applyColorCoding(tableElement) {
//     const rows = Array.from(tableElement.querySelectorAll('tr'));
//     if (rows.length < 2) return;
  
//     const parseNumber = txt => {
//         const cleaned = String(txt).replace(/[,%\s]/g, '');
//         const num = parseFloat(cleaned);
//         return isFinite(num) ? num : NaN;
//     };
  
//     // Collect all numbers in the table
//     const allValues = [];
//     rows.slice(1).forEach(row => {
//         row.querySelectorAll('td').forEach(cell => {
//             const val = parseNumber(cell.textContent);
//             if (!isNaN(val)) allValues.push(val);
//         });
//     });
  
//     if (!allValues.length) return;
  
//     const min = Math.min(...allValues);
//     const max = Math.max(...allValues);
//     const absMax = Math.max(Math.abs(min), Math.abs(max));
  
//     console.debug('Global min/max:', { min, max, absMax });
  
//     // Apply global scale to every numeric cell
//     rows.slice(1).forEach(row => {
//         row.querySelectorAll('td').forEach(cell => {
//             const val = parseNumber(cell.textContent);
//             if (isNaN(val)) return;
  
//             // Normalize around 0
//             const norm = Math.max(-1, Math.min(1, val / absMax));
  
//             let color;
//             if (norm >= 0) {
//                 // Positive values → green
//                 const intensity = Math.round(255 * (1 - norm)); // darker = higher value
//                 color = `rgb(${intensity},255,${intensity})`;
//             } else {
//                 // Negative values → red
//                 const intensity = Math.round(255 * (1 + norm)); // darker = lower value
//                 color = `rgb(255,${intensity},${intensity})`;
//             }
  
//             cell.style.backgroundColor = color;
//             cell.style.color = Math.abs(norm) > 0.5 ? 'white' : 'black';
//         });
//     });
// }
  
  


// function applyGlobalColorCoding(tableElement) {
//     const rows = Array.from(tableElement.querySelectorAll('tr'));
//     if (rows.length < 2) return;
  
//     const parseNumber = txt => {
//         const cleaned = String(txt).replace(/[,%\s]/g, '');
//         const num = parseFloat(cleaned);
//         return isFinite(num) ? num : NaN;
//     };
  
//     // 🔹 Step 1: Collect all numeric values across the ENTIRE table
//     const allValues = [];
//     rows.slice(1).forEach(row => {
//         row.querySelectorAll('td').forEach(cell => {
//             const val = parseNumber(cell.textContent);
//             if (!isNaN(val)) allValues.push(val);
//         });
//     });
  
//     if (!allValues.length) return;
  
//     // 🔹 Step 2: Find global min/max (for entire table)
//     const min = Math.min(...allValues);
//     const max = Math.max(...allValues);
  
//     console.debug('🌈 Global min/max:', min, max);
  
//     // 🔹 Step 3: Apply color based on where the value lies between min and max
//     rows.slice(1).forEach(row => {
//         row.querySelectorAll('td').forEach(cell => {
//             const val = parseNumber(cell.textContent);
//             if (isNaN(val)) return;
  
//             // Normalize between 0 and 1 across the full table range
//             const norm = (val - min) / (max - min);
  
//             // Interpolate from red → white → green
//             let r, g, b;
  
//             if (norm < 0.5) {
//                 // From red (min) to white (mid)
//                 const t = norm / 0.5;
//                 r = 255;
//                 g = Math.round(255 * t);
//                 b = Math.round(255 * t);
//             } else {
//                 // From white (mid) to green (max)
//                 const t = (norm - 0.5) / 0.5;
//                 r = Math.round(255 * (1 - t));
//                 g = 255;
//                 b = Math.round(255 * (1 - t));
//             }
  
//             const color = `rgb(${r},${g},${b})`;
//             cell.style.backgroundColor = color;
//             cell.style.color = (r + g + b) / 3 < 150 ? 'white' : 'black';
//         });
//     });
// }
  


  
  





document.getElementById('updateWeightsBtn').addEventListener('click', () => {
    document.getElementById('weightsModal').style.display = 'block';
});
  
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('weightsModal').style.display = 'none';
});

function initWeightForm(csrfToken, tableConfigs) {
    // document.getElementById('weightsForm').addEventListener('submit', async (e) => {
    //     e.preventDefault();

    //     const reportName = 'forcast';
    //     const topdown = parseInt(document.getElementById('topdown').value, 10);
    //     const bottomup = parseInt(document.getElementById('bottomup').value, 10);
    //     const market = document.getElementById('countrySelect').value;

    //     if ((topdown + bottomup) > 100 || (topdown + bottomup) < 100) {
    //         const errorMsg = document.getElementById('errorMsg');
    //         errorMsg.innerText = "Total must be  100";
    //         errorMsg.style.display = 'block';
    //         return;
    //     }

    //     const spinner = document.getElementById('reportspinner');
    //     spinner.classList.remove('hidden'); // show spinner immediately

    //     try {
    //         const res = await fetch('/reports/update-weights', {
    //             method: 'POST',
    //             credentials: 'include',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'csrf-token': csrfToken  // must match what server expects
    //             },
    //             body: JSON.stringify({ topdown, bottomup, market })
    //         });

    //         const data = await res.json();

    //         if (!data.success) {
    //             throw new Error(data.error || "Unknown error");
    //         }

    //         // refresh report after successful update
    //         const resp = await fetch(`/reports/${encodeURIComponent(reportName)}/data?country=${encodeURIComponent(market)}`);
    //         const { success, data: reportData, mekkoPath1, error } = await resp.json();

    //         if (!success) throw new Error(error);

    //         console.log('ddd', mekkoPath1);

    //         for (const [tableId, config] of tableConfigs.entries()) {
    //             renderTable(
    //                 tableId, 
    //                 reportData[humanizeKey(tableId)], 
    //                 config.heatMap, 
    //                 config.bar, 
    //                 config.colorBg, 
    //                 config.mekko
    //             );
    //         }

    //         renderMekkoChart(market, reportName);
    //         document.getElementById('weightsModal').style.display = 'none';

    //     } catch (err) {
    //         console.error(err);
    //         alert('Error loading report: ' + err.message);
    //     } finally {
    //         spinner.classList.add('hidden'); // always hide spinner
    //     }
    // });
    document.getElementById('weightsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const reportName = 'forcast';
        const topdown = parseInt(document.getElementById('topdown').value, 10);
        const bottomup = parseInt(document.getElementById('bottomup').value, 10);
        const market = document.getElementById('countrySelect').value;
        const errorMsg = document.getElementById('errorMsg');
        const spinner = document.getElementById('reportspinner');
        const successMsg = document.getElementById('successMsg'); // add this element in HTML
    
        // Hide messages initially
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';
    
        // Validate total
        if ((topdown + bottomup) !== 100) {
            errorMsg.innerText = "Total must be 100";
            errorMsg.style.display = 'block';
            return;
        }
    
        spinner.classList.remove('hidden'); // show spinner
    
        try {
            const res = await fetch('/reports/update-weights', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': csrfToken
                },
                body: JSON.stringify({ topdown, bottomup, market })
            });
    
            const data = await res.json();
    
            if (!data.success) {
                throw new Error(data.error || "Unknown error while updating weights");
            }
    
            // ✅ Show success message briefly before proceeding
            successMsg.innerText = "Ensemble weights successfully updated, refreshing the report!";
            successMsg.style.display = 'block';
    
            // wait a short time (e.g., 1.5 seconds) before proceeding
            await new Promise(resolve => setTimeout(resolve, 1500));
    
            // Now fetch updated report data
            const resp = await fetch(`/reports/${encodeURIComponent(reportName)}/data?country=${encodeURIComponent(market)}`);
            const { success, data: reportData, mekkoPath1, error } = await resp.json();
    
            if (!success) throw new Error(error);
    
            console.log('ddd', mekkoPath1);
    
            for (const [tableId, config] of tableConfigs.entries()) {
                renderTable(
                    tableId, 
                    reportData[humanizeKey(tableId)], 
                    config.heatMap, 
                    config.bar, 
                    config.colorBg, 
                    config.mekko
                );
            }
    
            renderMekkoChart(market, reportName);
    
            // Close popup after everything finishes
            document.getElementById('weightsModal').style.display = 'none';
    
        } catch (err) {
            console.error(err);
            errorMsg.innerText = 'Error: ' + err.message;
            errorMsg.style.display = 'block';
        } finally {
            spinner.classList.add('hidden'); // always hide spinner
        }
    });
    
}

var menuBtn = document.getElementById('menuBtn')
var sideNav = document.getElementById('sideNav')
sideNav.style.top = '0px'
menuBtn.onclick = function () {
    if (sideNav.style.top == '0px') {
        sideNav.style.top = '230px'
    } else {
        sideNav.style.top = '0px'
    }
}

// Initialize publish report functionality
function initPublishReport(csrfToken) {
    const confirmPublishBtn = document.getElementById('confirmPublishBtn');
    const publishStatus = document.getElementById('publishStatus');
    const publishAlert = document.getElementById('publishAlert');

    if (!confirmPublishBtn) {
        console.warn('Publish button not found');
        return;
    }

    confirmPublishBtn.addEventListener('click', async () => {
        // Get report ID from the page (assuming it's available in a data attribute or global variable)
        const reportId = window.reportId || document.querySelector('[data-report-id]')?.dataset.reportId;

        if (!reportId) {
            publishAlert.className = 'alert alert-danger';
            publishAlert.textContent = 'Report ID not found. Cannot publish report.';
            publishStatus.style.display = 'block';
            return;
        }

        // Disable button and show loading state
        confirmPublishBtn.disabled = true;
        confirmPublishBtn.textContent = 'Publishing...';

        publishAlert.className = 'alert alert-info';
        publishAlert.textContent = 'Publishing report to Azure Blob Storage...';
        publishStatus.style.display = 'block';

        try {
            const response = await fetch(`/reports/publish/${reportId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': csrfToken
                }
            });

            const result = await response.json();

            if (result.success) {
                publishAlert.className = 'alert alert-success';
                publishAlert.textContent = 'Report published successfully!';

                // Close modal after 2 seconds
                setTimeout(() => {
                    $('#publish').modal('hide');
                    publishStatus.style.display = 'none';
                }, 2000);
            } else {
                publishAlert.className = 'alert alert-danger';
                publishAlert.textContent = result.error || 'Failed to publish report';
            }
        } catch (error) {
            console.error('Error publishing report:', error);
            publishAlert.className = 'alert alert-danger';
            publishAlert.textContent = 'An error occurred while publishing the report';
        } finally {
            // Re-enable button
            confirmPublishBtn.disabled = false;
            confirmPublishBtn.textContent = 'Publish Report';
        }
    });

    // Reset modal when closed
    $('#publish').on('hidden.bs.modal', function () {
        publishStatus.style.display = 'none';
        confirmPublishBtn.disabled = false;
        confirmPublishBtn.textContent = 'Publish Report';
    });
}
