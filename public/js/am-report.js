import { showFlashMessage } from './uiHelpers.js';
import { fetchCSRFToken } from './csrf.js';

// Move renderTable outside DOMContentLoaded so it can be called from refreshReport
function renderTable(data) {
    const container = document.getElementById('resultsTable');
    container.innerHTML = ''; // clear old data

    if (data.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="fa fa-info-circle me-2"></i>No data available.</div>';
        return;
    }

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#dataTable')) {
        $('#dataTable').DataTable().destroy();
    }

    const table = document.createElement('table');
    table.id = 'dataTable';
    table.classList.add('table', 'table-hover', 'table-striped', 'w-100');

    // Create header
    const headers = Object.keys(data[0]);
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
            const td = document.createElement('td');
            td.textContent = row[h];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // Initialize DataTable with advanced features
    $('#dataTable').DataTable({
        responsive: true,
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        order: [[0, 'asc']],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
            '<"row"<"col-sm-12"tr>>' +
            '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search records...",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "No entries available",
            infoFiltered: "(filtered from _TOTAL_ total entries)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const marketTypeSelect = document.getElementById('marketType');
    const marketNameSelect = document.getElementById('marketName');
    const regionSelect = document.getElementById('region');
    const productCategorySelect = document.getElementById('productCategory');

    // Initialize Choices.js for Market Name multi-select
    const choices = new Choices(marketNameSelect, {
        removeItemButton: true,
        placeholderValue: '-- Select Market --',
        searchPlaceholderValue: 'Search markets...',
        shouldSort: false,
    });

    // Initialize page state - hide ensemble question and charts
    const ensembleQuestion = document.getElementById('ensembleQuestion');
    if (ensembleQuestion) {
        ensembleQuestion.style.display = 'none';
    }

    // Ensure all chart sections are collapsed on page load
    hideAllGraphs();

    // Download Excel Report Button Handler
    document.getElementById('downloadReportBtn').addEventListener('click', async () => {
        const marketType = marketTypeSelect.value;
        const region = regionSelect.value;
        const selectedMarkets = choices.getValue(true);
        const productCategory = productCategorySelect.value;

        if (!marketType || !region || selectedMarkets.length === 0) {
            showFlashMessage('Please select Market Type, Region, and at least one Market before downloading the report.', 'warning', 5000);
            return;
        }

        // Check if user has confirmed ensemble weights (either "Yes" with custom weights or "No" with defaults)
        if (!window.ensembleConfirmed) {
            showFlashMessage('Please confirm your ensemble weight selection (Yes or No, use default) before downloading the report.', 'warning', 5000);
            return;
        }

        const marketsParam = selectedMarkets.join(',');
        let downloadUrl = `/markets/download-excel?marketType=${encodeURIComponent(marketType)}&region=${encodeURIComponent(region)}&markets=${encodeURIComponent(marketsParam)}`;

        // Add category to URL if selected
        if (productCategory) {
            downloadUrl += `&category=${encodeURIComponent(productCategory)}`;
        }

        // Trigger download
        window.location.href = downloadUrl;
    });

    marketTypeSelect.addEventListener('change', async () => {
        const marketType = marketTypeSelect.value;

        // Clear existing choices
        choices.clearStore();
        choices.setChoices([{ value: '', label: '-- Loading... --', disabled: true }]);

        if (!marketType) {
            choices.setChoices([{ value: '', label: '-- Select Market --', disabled: true }]);
            return;
        }

        try {
            const response = await fetch(`/markets/above-markets?marketType=${encodeURIComponent(marketType)}`);
            const data = await response.json();

            if (data.success) {
                choices.clearStore();
                const marketOptions = data.markets.map(m => ({
                    value: m.market_name,
                    label: m.market_name
                }));
                choices.setChoices(marketOptions, 'value', 'label', true);
            } else {
                choices.clearStore();
                choices.setChoices([{ value: '', label: '-- Error loading markets --', disabled: true }]);
            }
        } catch (err) {
            console.error('Error fetching markets:', err);
            choices.clearStore();
            choices.setChoices([{ value: '', label: '-- Error loading markets --', disabled: true }]);
        }
    });

    // document.getElementById('applyFilterBtn').addEventListener('click', () => {
    //     const region = document.getElementById('region').value;
    //     const marketType = marketTypeSelect.value;
    //     const selectedMarkets = choices.getValue(true); // returns array of selected values

    //     if (!region || !marketType || selectedMarkets.length === 0) {
    //         alert('Please select all fields before applying filter.');
    //         return;
    //     }

    //     const marketsQuery = selectedMarkets.join(',');
    //     window.location.href = `/reports?region=${region}&marketType=${marketType}&marketName=${marketsQuery}`;
    // });

    document.getElementById('applyFilterBtn').addEventListener('click', async () => {
        const region = document.getElementById('region').value;
        const marketType = marketTypeSelect.value;
        const selectedMarkets = choices.getValue(true); // from Choices.js multi-select
        const productCategory = productCategorySelect.value;

        if (!region || !marketType || selectedMarkets.length === 0) {
            showFlashMessage('Please select all fields before applying filter.', 'warning', 5000);
            return;
        }

        try {
            const marketsParam = selectedMarkets.join(',');
            let url = `/markets/final-category-result?marketType=${encodeURIComponent(marketType)}&region=${encodeURIComponent(region)}&markets=${encodeURIComponent(marketsParam)}`;

            // Add category to URL if selected
            if (productCategory) {
                url += `&category=${encodeURIComponent(productCategory)}`;
            }

            const response = await fetch(url);
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                // Store filter state for later use
                window.currentFilterState = {
                    marketType,
                    region,
                    selectedMarkets,
                    marketsParam,
                    productCategory
                };

                // Reset confirmation flag when filter changes
                window.ensembleConfirmed = false;

                // Render ONLY the data table
                renderTable(result.data);

                // Hide ALL graph sections
                hideAllGraphs();

                // Show ensemble question
                showEnsembleQuestion();
            } else {
                document.getElementById('resultsTable').innerHTML = '<p>No data found for the selected filters.</p>';
            }
        } catch (err) {
            console.error('Error fetching results:', err);
            showFlashMessage('Error fetching data. Please try again.', 'danger', 5000);
        }
    });

    // renderTable function moved to global scope above DOMContentLoaded
});

// Global chart instances for cleanup
let incrementalChart = null;
let futureValueChartInstance = null;
let greatestValueChartInstance = null;

async function renderIncrementalChart(marketType) {
    try {
        console.log('renderIncrementalChart called with marketType:', marketType);
        const response = await fetch(`/markets/top-incremental-growth?marketType=${encodeURIComponent(marketType)}`);
        console.log('top-incremental-growth response status:', response.status);
        const result = await response.json();
        console.log('top-incremental-growth result:', result);

        if (!result.success) {
            console.warn('top-incremental-growth returned success=false');
            return;
        }

        const labels = result.data.map(d => d.label);
        const data = result.data.map(d => d.value);
        const motivations = result.data.map(d => d.motivation);

        // Assign colors based on Motivation
        const colorMap = {
            'Connect': '#2ca02c',
            'Savour': '#EC0089',
            'Reward': '#035EAD',
            'Impress': '#8B6AD8',
            'Revel': '#F3751F',
            'Relax': '#31B3EE',
            'Value': '#17becf'
        };



        const backgroundColors = motivations.map(m => colorMap[m] || '#999');

        const ctx = document.getElementById('incrementalGrowthChart').getContext('2d');

        // Destroy existing chart if it exists
        if (incrementalChart) {
            incrementalChart.destroy();
        }

        incrementalChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Incremental Growth',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        ticks: {
                            callback: val => {
                                // Format in millions
                                return (val / 1000000).toFixed(2) + 'M';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Incremental Growth (Millions)',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                }
            }
        });
        console.log('Incremental chart created successfully');
    } catch (err) {
        console.error('Error loading incremental chart:', err);
        throw err; // Re-throw so we can see it in the main handler
    }
}


// async function renderIncrementalChart(marketType) {
//     try {
//         const response = await fetch(`/markets/top-incremental-growth?marketType=${encodeURIComponent(marketType)}`);
//         const result = await response.json();

//         if (!result.success) return;

//         const labels = result.data.map(d => d.label);
//         const rawData = result.data.map(d => d.value);
//         const data = rawData.map(v => Math.abs(v)); // ✅ make bars positive
//         const motivations = result.data.map(d => d.motivation);

//         // Color mapping
//         const colorMap = {
//             'Connect': '#2ca02c',
//             'Savour': '#e377c2',
//             'Reward': '#1f77b4',
//             'Impress': '#9467bd',
//             'Revel': '#ff7f0e',
//             'Relax': '#8c564b',
//             'Value': '#17becf'
//         };

//         const backgroundColors = motivations.map(m => colorMap[m] || '#999');

//         const ctx = document.getElementById('incrementalGrowthChart').getContext('2d');

//         // Destroy old chart instance if it exists (prevents duplicate rendering)
//         if (window.incrementalChart) {
//             window.incrementalChart.destroy();
//         }

//         window.incrementalChart = new Chart(ctx, {
//             type: 'bar',
//             data: {
//                 labels,
//                 datasets: [{
//                     label: 'Incremental Growth',
//                     data,
//                     backgroundColor: backgroundColors,
//                 }]
//             },
//             options: {
//                 indexAxis: 'y',
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 scales: {
//                     x: {
//                         beginAtZero: true,
//                         ticks: {
//                             callback: val => val.toLocaleString()
//                         },
//                         title: {
//                             display: true,
//                             text: 'Incremental Growth'
//                         }
//                     }
//                 },
//                 plugins: {
//                     legend: { display: false },
//                     tooltip: {
//                         callbacks: {
//                             label: function(context) {
//                                 // Show original (possibly negative) value in tooltip
//                                 const original = rawData[context.dataIndex];
//                                 return `Incremental Growth: ${original.toLocaleString()}`;
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//     } catch (err) {
//         console.error('Error loading chart:', err);
//     }
// }


async function renderFutureValueChart(marketType, region, selectedMarkets, valuepoolFilter = '', priceTierFilter = '') {
    try {
        const marketsParam = selectedMarkets;
        console.log('region', region);
        console.log('marketsParam', marketsParam);
        console.log('valuepoolFilter', valuepoolFilter);
        console.log('priceTierFilter', priceTierFilter);

        // Build URL with valuepool and priceTier parameters if provided
        let url = `/markets/future-valuepools?marketType=${encodeURIComponent(marketType)}&region=${encodeURIComponent(region)}&markets=${encodeURIComponent(marketsParam)}`;
        if (valuepoolFilter) {
            url += `&valuepool=${encodeURIComponent(valuepoolFilter)}`;
        }
        if (priceTierFilter) {
            url += `&priceTier=${encodeURIComponent(priceTierFilter)}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            const canvas = document.getElementById('futureValueChart');
            const parent = canvas.parentElement;
            const filterMsg = valuepoolFilter || priceTierFilter ? ` for selected filters` : '';
            parent.innerHTML = `<div class="alert alert-warning"><i class="fa fa-exclamation-triangle me-2"></i>No data available${filterMsg}.</div>`;
            return;
        }

        const labels = result.data.map(d => d.label);
        const data = result.data.map(d => d.value);
        const motivations = result.data.map(d => d.motivation);

        // Same color mapping logic
        const colorMap = {
            'Connect': '#2ca02c',
            'Savour': '#EC0089',
            'Reward': '#035EAD',
            'Impress': '#8B6AD8',
            'Revel': '#F3751F',
            'Relax': '#31B3EE',
            'Value': '#17becf'
        };
        const backgroundColors = motivations.map(m => colorMap[m] || '#999');

        const ctx = document.getElementById('futureValueChart').getContext('2d');

        // Destroy existing chart if it exists
        if (futureValueChartInstance) {
            futureValueChartInstance.destroy();
        }

        futureValueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Future Size',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        ticks: {
                            callback: val => {
                                // Format in millions
                                return (val / 1000000).toFixed(2) + 'M';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Future Size (Millions)',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error loading future value chart:', err);
    }
}

async function rendergreatestIncrementalityValuepoolChart(marketType, region, selectedMarkets, valuepoolFilter = '', priceTierFilter = '') {
    try {
        const marketsParam = selectedMarkets;
        console.log('region', region);
        console.log('marketsParam', marketsParam);
        console.log('valuepoolFilter', valuepoolFilter);
        console.log('priceTierFilter', priceTierFilter);

        // Build URL with valuepool and priceTier parameters if provided
        let url = `/markets/greatest-incrementality-valuepool?marketType=${encodeURIComponent(marketType)}&region=${encodeURIComponent(region)}&markets=${encodeURIComponent(marketsParam)}`;
        if (valuepoolFilter) {
            url += `&valuepool=${encodeURIComponent(valuepoolFilter)}`;
        }
        if (priceTierFilter) {
            url += `&priceTier=${encodeURIComponent(priceTierFilter)}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!result.success || result.data.length === 0) {
            const canvas = document.getElementById('gratestValueChart');
            const parent = canvas.parentElement;
            const filterMsg = valuepoolFilter || priceTierFilter ? ` for selected filters` : '';
            parent.innerHTML = `<div class="alert alert-warning"><i class="fa fa-exclamation-triangle me-2"></i>No data available${filterMsg}.</div>`;
            return;
        }

        const labels = result.data.map(d => d.label);
        const data = result.data.map(d => d.value);
        const occasions = result.data.map(d => d.occasion);

        // Same color mapping logic
        const colorMap = {
            'Connect': '#2ca02c',
            'Savour': '#EC0089',
            'Reward': '#035EAD',
            'Impress': '#8B6AD8',
            'Revel': '#F3751F',
            'Relax': '#31B3EE',
            'Value': '#17becf'
        };
        const backgroundColors = occasions.map(m => colorMap[m] || '#999');

        const ctx = document.getElementById('gratestValueChart').getContext('2d');

        // Destroy existing chart if it exists
        if (greatestValueChartInstance) {
            greatestValueChartInstance.destroy();
        }

        greatestValueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Incremental Growth',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        ticks: {
                            callback: val => {
                                // Format in millions
                                return (val / 1000000).toFixed(2) + 'M';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Incremental Growth (Millions)',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error loading greatest incrementality chart:', err);
    }
}

// Function to render Mekko charts
async function renderMekkoCharts(marketType) {
    try {
        console.log('Loading Mekko charts for market type:', marketType);

        // Load Current Value Pool Mekko chart
        const currentChartUrl = `/markets/mekko-chart?marketType=${encodeURIComponent(marketType)}&chartType=current`;
        const currentFrame = document.getElementById('currentValuePoolFrame');
        currentFrame.src = currentChartUrl;

        // Load Forecasted Value Pool Mekko chart
        const forecastedChartUrl = `/markets/mekko-chart?marketType=${encodeURIComponent(marketType)}&chartType=forecasted`;
        const forecastedFrame = document.getElementById('forecastedValuePoolFrame');
        forecastedFrame.src = forecastedChartUrl;

        console.log('Mekko charts loaded successfully');
    } catch (err) {
        console.error('Error loading Mekko charts:', err);
        document.getElementById('currentValuePoolContainer').innerHTML = '<p>Error loading Current Value Pool chart.</p>';
        document.getElementById('forecastedValuePoolContainer').innerHTML = '<p>Error loading Forecasted Value Pool chart.</p>';
    }
}

// Function to render Bubble chart
async function renderBubbleChart(marketType) {
    try {
        console.log('Loading Bubble chart for market type:', marketType);

        // Load Bubble chart
        const bubbleChartUrl = `/markets/bubble-chart?marketType=${encodeURIComponent(marketType)}`;
        const bubbleFrame = document.getElementById('bubbleChartFrame');

        // Add loading state
        bubbleFrame.parentElement.classList.add('bubble-chart-container');
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'bubbleChartLoading';
        loadingDiv.className = 'bubble-chart-loading';
        loadingDiv.innerHTML = '<div class="loading-spinner"></div><p>Loading bubble chart...</p>';
        bubbleFrame.parentElement.appendChild(loadingDiv);

        // Set the iframe source
        bubbleFrame.src = bubbleChartUrl;

        // Remove loading state when iframe loads
        bubbleFrame.onload = function () {
            const loader = document.getElementById('bubbleChartLoading');
            if (loader) {
                loader.remove();
            }
            console.log('Bubble chart loaded successfully');
        };

        // Handle error
        bubbleFrame.onerror = function () {
            const loader = document.getElementById('bubbleChartLoading');
            if (loader) {
                loader.remove();
            }
            bubbleFrame.parentElement.innerHTML = '<div class="alert alert-danger"><i class="fa fa-exclamation-circle me-2"></i>Error loading Bubble chart.</div>';
        };

    } catch (err) {
        console.error('Error loading Bubble chart:', err);
        const bubbleContainer = document.getElementById('bubbleChartFrame').parentElement;
        bubbleContainer.innerHTML = '<div class="alert alert-danger"><i class="fa fa-exclamation-circle me-2"></i>Error loading Bubble chart.</div>';
    }
}

// ============================================
// ENSEMBLE WEIGHT SELECTION FUNCTIONALITY
// ============================================

// Helper functions for processing overlay
function showProcessingOverlay() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideProcessingOverlay() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Helper functions for graph visibility
function hideAllGraphs() {
    document.getElementById('FutureValue').classList.remove('in');
    document.getElementById('GreatestValuepool').classList.remove('in');
    document.getElementById('MekkoCharts').classList.remove('in');
    document.getElementById('BubbleChart').classList.remove('in');
}

function showAllGraphs() {
    console.log('showAllGraphs called');
    // Use jQuery to properly show Bootstrap 3 collapse panels
    $('#FutureValue').collapse('show');
    $('#GreatestValuepool').collapse('show');
    $('#MekkoCharts').collapse('show');
    $('#BubbleChart').collapse('show');

    // Also add 'in' class for immediate visibility
    $('#FutureValue').addClass('in');
    $('#GreatestValuepool').addClass('in');
    $('#MekkoCharts').addClass('in');
    $('#BubbleChart').addClass('in');

    console.log('All graph panels expanded');
}

function showEnsembleQuestion() {
    document.getElementById('ensembleQuestion').style.display = 'block';
}

function hideEnsembleQuestion() {
    document.getElementById('ensembleQuestion').style.display = 'none';
}

// Ensemble "No" button handler - use default data and show all graphs
document.addEventListener('DOMContentLoaded', () => {
    const ensembleNoBtn = document.getElementById('ensembleNoBtn');
    if (ensembleNoBtn) {
        ensembleNoBtn.addEventListener('click', async () => {
            hideEnsembleQuestion();

            const { marketType, region, marketsParam, selectedMarkets } = window.currentFilterState || {};
            if (!marketType || !region || !marketsParam) {
                showFlashMessage('Filter state not found. Please apply filter again.', 'warning', 5000);
                return;
            }

            // Disable button and show loading overlay
            ensembleNoBtn.disabled = true;
            ensembleNoBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Processing...';
            showProcessingOverlay();

            try {
                // Fetch CSRF token
                console.log('Fetching CSRF token for default ensemble...');
                const csrfToken = await fetchCSRFToken();

                // Build ensemble selections with "Default" for all selected markets
                const ensembleSelections = {};
                selectedMarkets.forEach(market => {
                    ensembleSelections[market] = 'Default';
                });

                console.log('Calling execute-ensemble-script with default weights:', { marketType, ensembleSelections });

                // Call R script with default weights (no market/weight arguments passed)
                const response = await fetch('/markets/execute-ensemble-script', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        marketType,
                        ensembleSelections,
                        useDefault: true  // Flag to indicate default processing
                    })
                });

                console.log('Response status:', response.status, response.statusText);

                if (!response.ok && response.status !== 207) {
                    const errorText = await response.text();
                    console.error('Server error response:', errorText);
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Execute ensemble script result:', result);

                if (result.success) {
                    console.log('Success! Refreshing report with default data...');

                    // Set confirmation flag for download
                    window.ensembleConfirmed = true;

                    // Check if there's a warning (partial success - HTTP 207)
                    if (result.warning) {
                        showFlashMessage(`Default ensemble applied successfully! Warning: ${result.warning}`, 'warning', 7000);
                    } else {
                        showFlashMessage('Default ensemble applied successfully and bubble charts generated!', 'success', 5000);
                    }

                    // Refresh the entire report
                    try {
                        console.log('Starting report refresh...');
                        await refreshReport();
                        console.log('Report refresh completed successfully');
                    } catch (refreshError) {
                        console.error('Error refreshing report:', refreshError);
                    }

                    // Hide overlay and reset button
                    hideProcessingOverlay();
                    ensembleNoBtn.disabled = false;
                    ensembleNoBtn.innerHTML = '<i class="fa fa-times me-2"></i>No, use default';
                } else {
                    console.error('Server returned success=false:', result);
                    hideProcessingOverlay();
                    ensembleNoBtn.disabled = false;
                    ensembleNoBtn.innerHTML = '<i class="fa fa-times me-2"></i>No, use default';
                    showFlashMessage(`Failed to apply default ensemble: ${result.message}`, 'danger', 5000);
                }
            } catch (error) {
                console.error('Caught error in default ensemble handler:', error);
                console.error('Error stack:', error.stack);
                hideProcessingOverlay();
                ensembleNoBtn.disabled = false;
                ensembleNoBtn.innerHTML = '<i class="fa fa-times me-2"></i>No, use default';
                showFlashMessage('Error executing R script. Please try again.', 'danger', 5000);
            }
        });
    }
});

// Ensemble "Yes" button handler - open modal
document.addEventListener('DOMContentLoaded', () => {
    const ensembleYesBtn = document.getElementById('ensembleYesBtn');
    if (ensembleYesBtn) {
        ensembleYesBtn.addEventListener('click', () => {
            const { selectedMarkets } = window.currentFilterState || {};
            if (!selectedMarkets || selectedMarkets.length === 0) {
                showFlashMessage('No markets selected. Please apply filter again.', 'warning', 5000);
                return;
            }

            // Populate modal with ensemble selectors
            populateEnsembleSelectors(selectedMarkets);

            // Open modal using Bootstrap 3 jQuery API
            $('#ensembleModal').modal('show');
        });
    }
});

// Populate ensemble selectors in modal with accordion/search functionality
function populateEnsembleSelectors(markets) {
    const container = document.getElementById('ensembleSelectors');
    container.innerHTML = '';

    // Update total markets count
    document.getElementById('totalMarketsCount').textContent = markets.length;
    updateSelectedMarketsCount();

    // Group markets by size for accordion
    const groups = groupMarketsBySize(markets);

    // If markets are few (<=8), show all expanded without accordion
    if (markets.length <= 8) {
        const simpleContainer = document.createElement('div');
        simpleContainer.className = 'ensemble-simple-list';
        simpleContainer.style.padding = '10px';

        markets.forEach(market => {
            simpleContainer.appendChild(createMarketSelector(market));
        });

        container.appendChild(simpleContainer);
    } else {
        // Create accordion groups for many markets
        Object.entries(groups).forEach(([groupName, groupMarkets]) => {
            const groupDiv = createAccordionGroup(groupName, groupMarkets);
            container.appendChild(groupDiv);
        });
    }

    // Initialize search functionality
    initializeMarketSearch();

    // Initialize bulk actions
    initializeBulkActions();

    // Update counts when selections change
    container.addEventListener('change', updateSelectedMarketsCount);
}

// Helper: Group markets into manageable accordion sections
function groupMarketsBySize(markets) {
    const itemsPerGroup = 10;
    const groups = {};

    if (markets.length <= itemsPerGroup) {
        groups['All Markets'] = markets;
    } else {
        const totalGroups = Math.ceil(markets.length / itemsPerGroup);
        for (let i = 0; i < totalGroups; i++) {
            const start = i * itemsPerGroup;
            const end = Math.min(start + itemsPerGroup, markets.length);
            const groupMarkets = markets.slice(start, end);
            groups[`Markets ${start + 1}-${end}`] = groupMarkets;
        }
    }

    return groups;
}

// Helper: Create accordion group
function createAccordionGroup(groupName, markets) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'ensemble-accordion-group';

    const header = document.createElement('button');
    header.className = 'ensemble-accordion-header';
    header.type = 'button';
    header.innerHTML = `
        <div class="accordion-title">
            <i class="fa fa-chevron-right accordion-icon"></i>
            <span>${groupName}</span>
            <span class="accordion-count">${markets.length}</span>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'ensemble-accordion-body';

    markets.forEach(market => {
        body.appendChild(createMarketSelector(market));
    });

    // Toggle accordion
    header.addEventListener('click', () => {
        const isActive = header.classList.contains('active');

        // Close all other accordions
        document.querySelectorAll('.ensemble-accordion-header').forEach(h => {
            h.classList.remove('active');
        });
        document.querySelectorAll('.ensemble-accordion-body').forEach(b => {
            b.classList.remove('show');
        });

        // Toggle current
        if (!isActive) {
            header.classList.add('active');
            body.classList.add('show');
        }
    });

    // Open first group by default
    if (groupDiv.parentElement === null || document.querySelectorAll('.ensemble-accordion-group').length === 0) {
        setTimeout(() => {
            header.classList.add('active');
            body.classList.add('show');
        }, 100);
    }

    groupDiv.appendChild(header);
    groupDiv.appendChild(body);

    return groupDiv;
}

// Helper: Create individual market selector
function createMarketSelector(market) {
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'ensemble-selector';
    selectorDiv.dataset.market = market.toLowerCase();

    selectorDiv.innerHTML = `
        <div class="ensemble-selector-label">
            <i class="fa fa-map-marker"></i>
            <span>${market}</span>
        </div>
        <div class="ensemble-selector-control">
            <select class="form-control ensemble-weight-select" data-market="${market}">
                <option value="">-- Skip (Use Default) --</option>
                <option value="100-0">100-0</option>
                <option value="75-25">75-25</option>
                <option value="50-50">50-50</option>
            </select>
        </div>
    `;

    return selectorDiv;
}

// Initialize market search functionality
function initializeMarketSearch() {
    const searchInput = document.getElementById('marketSearchInput');
    const resultCount = document.getElementById('searchResultCount');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const allSelectors = document.querySelectorAll('.ensemble-selector');
        let visibleCount = 0;

        if (searchTerm === '') {
            // Show all and restore accordion state
            allSelectors.forEach(selector => {
                selector.classList.remove('hidden');
            });

            // Show accordion headers if they exist
            document.querySelectorAll('.ensemble-accordion-header, .ensemble-accordion-body').forEach(el => {
                el.style.display = '';
            });

            resultCount.textContent = '';
        } else {
            // Hide accordion headers during search
            document.querySelectorAll('.ensemble-accordion-header').forEach(el => {
                el.style.display = 'none';
            });

            // Expand all accordion bodies
            document.querySelectorAll('.ensemble-accordion-body').forEach(el => {
                el.classList.add('show');
                el.style.display = 'block';
            });

            // Filter markets
            allSelectors.forEach(selector => {
                const marketName = selector.dataset.market;
                if (marketName.includes(searchTerm)) {
                    selector.classList.remove('hidden');
                    visibleCount++;
                } else {
                    selector.classList.add('hidden');
                }
            });

            resultCount.textContent = `Found ${visibleCount} market${visibleCount !== 1 ? 's' : ''}`;
        }
    });
}

// Initialize bulk action controls
function initializeBulkActions() {
    // Select All
    const selectAllBtn = document.getElementById('bulkSelectAll');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const visibleSelects = getVisibleWeightSelects();
            visibleSelects.forEach(select => {
                if (!select.value) {
                    select.value = '50-50'; // Default to 50-50
                }
            });
            updateSelectedMarketsCount();
            showFlashMessage(`Applied default weight to ${visibleSelects.length} markets`, 'success', 3000);
        });
    }

    // Deselect All
    const deselectAllBtn = document.getElementById('bulkDeselectAll');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            const visibleSelects = getVisibleWeightSelects();
            visibleSelects.forEach(select => {
                select.value = '';
            });
            updateSelectedMarketsCount();
            showFlashMessage(`Cleared ${visibleSelects.length} market selections`, 'info', 3000);
        });
    }

    // Apply specific weight to all visible
    const bulkWeightLinks = document.querySelectorAll('[data-bulk-weight]');
    bulkWeightLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const weight = link.dataset.bulkWeight;
            const visibleSelects = getVisibleWeightSelects();

            visibleSelects.forEach(select => {
                select.value = weight;
            });

            updateSelectedMarketsCount();

            const message = weight
                ? `Applied ${weight} to ${visibleSelects.length} visible markets`
                : `Cleared ${visibleSelects.length} visible markets`;

            showFlashMessage(message, 'success', 3000);
        });
    });
}

// Helper: Get visible weight selects (not hidden by search)
function getVisibleWeightSelects() {
    const allSelects = document.querySelectorAll('.ensemble-weight-select');
    return Array.from(allSelects).filter(select => {
        const parent = select.closest('.ensemble-selector');
        return parent && !parent.classList.contains('hidden');
    });
}

// Helper: Update selected markets count badge
function updateSelectedMarketsCount() {
    const allSelects = document.querySelectorAll('.ensemble-weight-select');
    const selectedCount = Array.from(allSelects).filter(select => select.value !== '').length;
    const selectedCountEl = document.getElementById('selectedMarketsCount');

    if (selectedCountEl) {
        selectedCountEl.textContent = selectedCount;
    }
}

// Preview Data button handler
document.addEventListener('DOMContentLoaded', () => {
    const previewBtn = document.getElementById('previewEnsembleBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', async () => {
            const selectors = document.querySelectorAll('.ensemble-weight-select');
            const ensembleSelections = {};

            selectors.forEach(select => {
                const market = select.dataset.market;
                const weight = select.value;
                if (weight) {
                    ensembleSelections[market] = weight;
                }
            });

            // Validate at least one selection
            if (Object.keys(ensembleSelections).length === 0) {
                showFlashMessage('Please select at least one ensemble weight to preview.', 'warning', 5000);
                return;
            }

            // Show loading
            const previewContent = document.getElementById('ensemblePreviewContent');
            previewContent.innerHTML = '<div class="text-center my-4"><i class="fa fa-spinner fa-spin fa-3x text-primary"></i><p class="mt-3">Loading preview data...</p></div>';

            try {
                const { marketType, region } = window.currentFilterState;

                // Fetch preview data for selected markets
                const allData = [];
                const marketDataMap = {}; // Store data per market for grouped display

                for (const [market, weight] of Object.entries(ensembleSelections)) {
                    console.log(`Fetching data for market: ${market}, weight: ${weight}`);

                    const response = await fetch(
                        `/markets/ensemble-category-result?marketType=${encodeURIComponent(marketType)}&region=${encodeURIComponent(region)}&markets=${encodeURIComponent(market)}&ensembleWeight=${encodeURIComponent(weight)}`
                    );

                    if (!response.ok) {
                        throw new Error(`Failed to fetch data for ${market}`);
                    }

                    const result = await response.json();
                    console.log(`Received data for ${market}:`, result.success ? `${result.data.length} rows` : 'no data');

                    if (result.success && result.data.length > 0) {
                        allData.push(...result.data);
                        marketDataMap[market] = {
                            weight: weight,
                            data: result.data
                        };
                    }
                }

                console.log(`Total markets processed: ${Object.keys(marketDataMap).length}`);
                console.log(`Total combined rows: ${allData.length}`);

                if (allData.length === 0) {
                    previewContent.innerHTML = '<div class="alert alert-warning"><i class="fa fa-exclamation-triangle me-2"></i>No data found for the selected ensemble weights.</div>';
                    return;
                }

                // Store preview data for confirm
                window.ensemblePreviewData = {
                    data: allData,
                    selections: ensembleSelections
                };

                // Display preview with market grouping
                displayPreviewTable(allData, ensembleSelections, marketDataMap);

            } catch (error) {
                console.error('Error fetching preview:', error);
                previewContent.innerHTML = '<div class="alert alert-danger"><i class="fa fa-times-circle me-2"></i>Error loading preview data. Please try again.</div>';
            }
        });
    }
});

function displayPreviewTable(data, selections, marketDataMap) {
    const previewContent = document.getElementById('ensemblePreviewContent');

    if (data.length === 0) {
        previewContent.innerHTML = '<div class="alert alert-warning">No data available.</div>';
        return;
    }

    const markets = Object.keys(marketDataMap);
    const multipleMarkets = markets.length > 1;

    let html = '<div class="alert alert-success"><i class="fa fa-check-circle me-2"></i><strong>Preview Data Loaded</strong> - ';
    html += 'Found ' + data.length + ' total rows for ' + markets.length + ' market(s) with custom ensemble weights.</div>';

    // Add market filter dropdown if multiple markets
    if (multipleMarkets) {
        html += '<div class="mb-3" style="padding: 10px; background-color: #f8f9fa; border-radius: 5px;">';
        html += '<label for="marketFilterSelect" class="form-label" style="margin-bottom: 5px; font-weight: 500;">';
        html += '<i class="fa fa-filter me-2"></i>Filter by Market:</label>';
        html += '<select id="marketFilterSelect" class="form-select" style="max-width: 400px;">';
        html += '<option value="all">All Markets (' + markets.length + ')</option>';

        markets.forEach(function(market) {
            const info = marketDataMap[market];
            html += '<option value="' + market + '">' + market + ' (' + info.weight + ') - ' + info.data.length + ' rows</option>';
        });

        html += '</select>';
        html += '</div>';
    }

    // Container for market sections
    html += '<div id="marketSectionsContainer">';

    // Display data for each market
    for (const [market, info] of Object.entries(marketDataMap)) {
        const { weight, data: marketData } = info;

        if (marketData.length === 0) continue;

        const headers = Object.keys(marketData[0]);

        html += '<div class="market-preview-section" data-market="' + market + '" style="margin-bottom: 20px; padding: 15px; border: 2px solid #dee2e6; border-radius: 5px; background-color: #f8f9fa;">';
        html += '<h6 style="margin-bottom: 10px; color: #0d6efd;"><i class="fa fa-map-marker me-2"></i><strong>' + market + '</strong> - Ensemble Weight: <span class="badge bg-info">' + weight + '</span></h6>';
        html += '<p class="text-muted mb-2"><i class="fa fa-database me-1"></i>Total rows: ' + marketData.length + '</p>';

        html += '<div class="table-responsive" style="max-height: 300px; overflow-y: auto;">';
        html += '<table class="table table-sm table-striped table-bordered table-hover">';
        html += '<thead class="table-dark" style="position: sticky; top: 0; z-index: 10;">';
        html += '<tr>' + headers.map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr>';
        html += '</thead><tbody>';

        // Show first 50 rows per market (increased from 10)
        const displayRows = marketData.slice(0, 50);
        displayRows.forEach(function(row) {
            html += '<tr>' + headers.map(function(h) {
                const value = row[h] !== null && row[h] !== undefined ? row[h] : '';
                return '<td>' + value + '</td>';
            }).join('') + '</tr>';
        });

        html += '</tbody></table></div>';

        if (marketData.length > 50) {
            html += '<p class="text-muted mb-0 mt-2" style="font-size: 0.9em;"><i class="fa fa-info-circle me-1"></i>Showing first 50 of ' + marketData.length + ' rows for this market</p>';
        }

        html += '</div>'; // Close market-preview-section
    }

    html += '</div>'; // Close marketSectionsContainer

    previewContent.innerHTML = html;

    // Add event listener for market filter if multiple markets
    if (multipleMarkets) {
        const filterSelect = document.getElementById('marketFilterSelect');
        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                filterMarketSections(this.value);
            });
        }
    }
}

// Filter market sections based on selected market
function filterMarketSections(selectedMarket) {
    const sections = document.querySelectorAll('.market-preview-section');

    sections.forEach(function(section) {
        const marketName = section.getAttribute('data-market');

        if (selectedMarket === 'all' || marketName === selectedMarket) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

// Confirm button handler - execute R script and refresh
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmEnsembleBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            // Collect all ensemble selections
            const ensembleSelections = {};
            const selectors = document.querySelectorAll('.ensemble-weight-select');

            selectors.forEach(select => {
                const market = select.dataset.market;
                const weight = select.value;

                if (weight) {  // Only include if not "Skip"
                    ensembleSelections[market] = weight;
                }
            });

            // Validate at least one selection
            if (Object.keys(ensembleSelections).length === 0) {
                showFlashMessage('Please select at least one ensemble weight or click "No, use default"', 'warning', 5000);
                return;
            }

            // Disable button and show loading overlay
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Processing...';

            // Close modal first, then show overlay
            $('#ensembleModal').modal('hide');

            // Wait a bit for modal to close, then show overlay
            setTimeout(() => {
                showProcessingOverlay();
            }, 300);

            try {
                // Fetch CSRF token
                console.log('Fetching CSRF token...');
                const csrfToken = await fetchCSRFToken();

                // Call R script
                const { marketType } = window.currentFilterState;
                console.log('Calling execute-ensemble-script with:', { marketType, ensembleSelections });

                const response = await fetch('/markets/execute-ensemble-script', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        marketType,
                        ensembleSelections
                    })
                });

                console.log('Response status:', response.status, response.statusText);

                // Check if response is ok (2xx status codes including 207)
                if (!response.ok && response.status !== 207) {
                    const errorText = await response.text();
                    console.error('Server error response:', errorText);
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Execute ensemble script result:', result);

                if (result.success) {
                    console.log('Success! Refreshing report...');

                    // Hide the ensemble question section
                    hideEnsembleQuestion();

                    // Set confirmation flag for download
                    window.ensembleConfirmed = true;

                    // Check if there's a warning (partial success - HTTP 207)
                    if (result.warning) {
                        showFlashMessage(`Ensemble weights applied successfully! Warning: ${result.warning}`, 'warning', 7000);
                    } else {
                        showFlashMessage('Ensemble weights applied successfully and bubble charts generated!', 'success', 5000);
                    }

                    // Refresh the entire report
                    try {
                        console.log('Starting report refresh...');
                        await refreshReport();
                        console.log('Report refresh completed successfully');
                    } catch (refreshError) {
                        console.error('Error refreshing report:', refreshError);
                        // Don't throw - just show warning
                    }

                    // Hide overlay and reset button for next use
                    hideProcessingOverlay();
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fa fa-check me-2"></i>Confirm & Apply';
                } else {
                    console.error('Server returned success=false:', result);
                    // Re-enable button on failure so user can try again
                    hideProcessingOverlay();
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fa fa-check me-2"></i>Confirm & Apply';
                    showFlashMessage(`Failed to apply ensemble weights: ${result.message}`, 'danger', 5000);
                }
            } catch (error) {
                console.error('Caught error in execute-ensemble-script handler:', error);
                console.error('Error stack:', error.stack);
                // Re-enable button on error so user can try again
                hideProcessingOverlay();
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fa fa-check me-2"></i>Confirm & Apply';
                showFlashMessage('Error executing R script. Please try again.', 'danger', 5000);
            }
        });
    }
});

// Refresh report with updated data
async function refreshReport() {
    console.log('refreshReport started');
    const { marketType, region, selectedMarkets, marketsParam, productCategory } = window.currentFilterState;

    try {
        // Expand all graph sections FIRST before rendering charts
        // This is important because Chart.js needs visible containers to render properly
        console.log('Expanding all graph panels first...');
        showAllGraphs();

        // Re-fetch all data - use ensemble results since this is called after confirmation
        console.log('Fetching final-category-result with ensemble results...');
        let url = `/markets/final-category-result?marketType=${encodeURIComponent(marketType)}&region=${encodeURIComponent(region)}&markets=${encodeURIComponent(marketsParam)}&useEnsembleResults=true`;

        // Add category filter if selected
        if (productCategory) {
            url += `&category=${encodeURIComponent(productCategory)}`;
        }

        const response = await fetch(url);
        const result = await response.json();
        console.log('final-category-result response:', result);
        console.log('Data source file:', result.source || 'unknown');

        if (result.success && result.data && result.data.length > 0) {
            console.log('Rendering table with', result.data.length, 'rows');
            renderTable(result.data);
        } else {
            console.warn('No data to render in table. Success:', result.success, 'Data length:', result.data?.length);
        }

        // Wait a moment for panels to expand
        await new Promise(resolve => setTimeout(resolve, 300));

        // Show all graphs
        console.log('Rendering charts...');
        await renderIncrementalChart(marketType);
        console.log('Incremental chart rendered');

        // Render with default filters: Connect - Premium
        await renderFutureValueChart(marketType, region, marketsParam, 'Connect', 'Premium');
        console.log('Future value chart rendered with Connect - Premium');

        await rendergreatestIncrementalityValuepoolChart(marketType, region, marketsParam, 'Connect', 'Premium');
        console.log('Greatest incrementality chart rendered with Connect - Premium');

        await renderMekkoCharts(marketType);
        console.log('Mekko charts rendered');

        await renderBubbleChart(marketType);
        console.log('Bubble chart rendered');

        // Expand all graph sections
        showAllGraphs();
        console.log('All graphs expanded');

        // Hide ensemble question
        hideEnsembleQuestion();
        console.log('Ensemble question hidden');

        console.log('refreshReport completed successfully');
    } catch (error) {
        console.error('Error in refreshReport:', error);
        throw error; // Re-throw to be caught by outer handler
    }
}

// Add event listeners for combined filters
document.addEventListener('DOMContentLoaded', () => {
    // Combined filter for Future Value Pools chart
    const futureValueCombinedFilter = document.getElementById('futureValueCombinedFilter');

    if (futureValueCombinedFilter) {
        futureValueCombinedFilter.addEventListener('change', async () => {
            const filterValue = futureValueCombinedFilter.value;
            const [valuepool, priceTier] = filterValue.split('|');
            const { marketType, region, marketsParam } = window.currentFilterState || {};

            if (marketType && region && marketsParam) {
                console.log('Future Value filter changed to:', valuepool, priceTier);

                // Update heading
                const heading = document.getElementById('futureValueChartHeading');
                if (heading) {
                    heading.innerHTML = `<i class="fa fa-pie-chart me-2"></i>${valuepool} - ${priceTier} - Top 10 Biggest Future Value Pools`;
                }

                await renderFutureValueChart(marketType, region, marketsParam, valuepool, priceTier);
            }
        });
    }

    // Combined filter for Greatest Incrementality Valuepool chart
    const greatestValueCombinedFilter = document.getElementById('greatestValueCombinedFilter');

    if (greatestValueCombinedFilter) {
        greatestValueCombinedFilter.addEventListener('change', async () => {
            const filterValue = greatestValueCombinedFilter.value;
            const [valuepool, priceTier] = filterValue.split('|');
            const { marketType, region, marketsParam } = window.currentFilterState || {};

            if (marketType && region && marketsParam) {
                console.log('Greatest Incrementality filter changed to:', valuepool, priceTier);

                // Update heading
                const heading = document.getElementById('greatestValueChartHeading');
                if (heading) {
                    heading.innerHTML = `<i class="fa fa-trophy me-2"></i>${valuepool} - ${priceTier} - Greatest Incrementality Valuepool`;
                }

                await rendergreatestIncrementalityValuepoolChart(marketType, region, marketsParam, valuepool, priceTier);
            }
        });
    }
});
