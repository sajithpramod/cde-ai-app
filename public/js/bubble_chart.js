
const categories = ["Anise Drinks", "Aperitif", "Beer", "Brandy / Cognac", "Cider", "Gin", "Liqueur", "Mezcal", "Other Spirits", "Rtd", "Rum", "Tequila", "Vodka", "Whisk(E)Y", "Wine", "Indian Whisky", "Thai Spirits", "Aguardiente", "Agave-Based"];
const regions = ["Africa", "Apac (Ex. India)", "Et", "India", "Lac (Ex. Gt)", "Nam"];
const markets = ["Australia", "Benelux And Nordics", "Brazil", "Ccv", "Colombia", "Dach", "East Africa", "Eastern Europe", "Gb", "Greater China", "Greece", "Iberia", "India", "Ireland", "Japan", "Korea", "Mexico", "Nam", "Nigeria", "Poland", "Sea", "South Lac", "Southern Europe", "Swc Africa"];

// Store original chart data for filtering
const chartData = {};

function getSelectedMarkets() {
    const marketAllCheckbox = document.getElementById('market_all');
    const marketCheckboxes = document.querySelectorAll('.market-checkbox');
    if (marketAllCheckbox && marketAllCheckbox.checked) {
        return ['All Markets'];
    }
    if (marketCheckboxes.length === 0) {
        return ['All Markets'];
    }
    const selected = Array.from(marketCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    return selected.length === 0 ? ['All Markets'] : selected;
}

function updateChart() {
    const category = document.getElementById('categorySelect').value;
    const region = document.getElementById('regionSelect').value;
    const selectedMarkets = getSelectedMarkets();
    
    // Handle "All Markets" selection - if selected, show all markets
    const showAllMarkets = selectedMarkets.includes('All Markets') || selectedMarkets.length === 0;
    
    // Hide all containers
    document.querySelectorAll('.chart-container')
        .forEach(c => c.classList.remove('active'));

    // Show selected category container
    const id = 'container_' + category.replace(/ /g, '_');
    const container = document.getElementById(id);
    if (!container) return;
    
    container.classList.add('active');
    
    // Get the chart div
    const chartId = 'chart_' + category.replace(/ /g, '_');
    const chartDiv = document.getElementById(chartId);
    if (!chartDiv) return;
    
    // Apply filters
    if (chartData[category]) {
        const filteredData = chartData[category].fullData.map(trace => {
            const filtered = {};
            Object.keys(trace).forEach(key => {
                if (Array.isArray(trace[key])) {
                    filtered[key] = [];
                } else {
                    filtered[key] = trace[key];
                }
            });
            
            // Filter points by region and market
            // customdata[0] is Market, customdata[1] is Region
            if (trace.customdata) {
                for (let i = 0; i < trace.customdata.length; i++) {
                    const pointMarket = trace.customdata[i][0];
                    const pointRegion = trace.customdata[i][1];
                    
                    // Check region filter
                    const regionMatch = (region === 'All Regions' || pointRegion === region);
                    
                    // Check market filter (multiselect)
                    const marketMatch = showAllMarkets || selectedMarkets.includes(pointMarket);
                    
                    if (regionMatch && marketMatch) {
                        Object.keys(trace).forEach(key => {
                            if (Array.isArray(trace[key]) && Array.isArray(filtered[key])) {
                                filtered[key].push(trace[key][i]);
                            }
                        });
                    }
                }
            }
            
            return filtered;
        });
        
        Plotly.react(chartDiv, filteredData, chartData[category].layout);
        fixNegativeSigns(chartDiv);
    }
}

// Fix negative sign encoding issue in axis labels
function fixNegativeSigns(chartDiv) {
    // Replace Unicode minus sign (U+2212) with ASCII hyphen-minus (U+002D)
    const unicodeMinus = String.fromCharCode(0x2212); // −
    const asciiMinus = '-';
    
    function fixLabels() {
        // Fix x-axis labels
        const xAxisLabels = chartDiv.querySelectorAll('.xtick text');
        xAxisLabels.forEach(label => {
            if (label.textContent) {
                let text = label.textContent;
                text = text.replace(unicodeMinus, asciiMinus);
                text = text.replace(/â\^'/g, '-');
                text = text.replace(/−/g, '-'); // Unicode minus
                text = text.replace(/–/g, '-'); // En dash
                text = text.replace(/—/g, '-'); // Em dash
                if (text !== label.textContent) {
                    label.textContent = text;
                }
            }
        });
        
        // Fix y-axis labels
        const yAxisLabels = chartDiv.querySelectorAll('.ytick text');
        yAxisLabels.forEach(label => {
            if (label.textContent) {
                let text = label.textContent;
                text = text.replace(unicodeMinus, asciiMinus);
                text = text.replace(/â\^'/g, '-');
                text = text.replace(/−/g, '-'); // Unicode minus
                text = text.replace(/–/g, '-'); // En dash
                text = text.replace(/—/g, '-'); // Em dash
                if (text !== label.textContent) {
                    label.textContent = text;
                }
            }
        });
    }
    
    // Fix immediately
    fixLabels();
    
    // Also fix after a short delay to catch async updates
    setTimeout(fixLabels, 50);
    setTimeout(fixLabels, 200);
}

document.addEventListener('DOMContentLoaded', () => {
    // Store reference to all Plotly charts
    document.querySelectorAll('[id^="chart_"]').forEach(chartDiv => {
        const categoryName = chartDiv.id.replace('chart_', '').replace(/_/g, ' ');
        if (chartDiv.data) {
            chartData[categoryName] = {
                fullData: JSON.parse(JSON.stringify(chartDiv.data)),
                layout: chartDiv.layout
            };
        }
    });

    // Set initial state
    updateChart();
    
    // Fix negative signs after charts are rendered
    setTimeout(() => {
        document.querySelectorAll('[id^="chart_"]').forEach(chartDiv => {
            fixNegativeSigns(chartDiv);
        });
    }, 100);
    
    // Add event listeners
    document.getElementById('categorySelect')
        .addEventListener('change', updateChart);
    document.getElementById('regionSelect')
        .addEventListener('change', updateChart);
    
    // Custom multiselect dropdown handling
    const marketButton = document.getElementById('marketSelectButton');
    const marketDropdown = document.getElementById('marketSelectDropdown');
    const marketAllCheckbox = document.getElementById('market_all');
    const marketCheckboxes = document.querySelectorAll('.market-checkbox');
    
    // Toggle dropdown
    marketButton.addEventListener('click', (e) => {
        e.stopPropagation();
        marketDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!marketButton.contains(e.target) && !marketDropdown.contains(e.target)) {
            marketDropdown.classList.remove('show');
        }
    });
    
    // Handle "All Markets" checkbox
    marketAllCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            marketCheckboxes.forEach(cb => cb.checked = false);
        }
        updateMarketButtonText();
        updateChart();
    });
    
    // Handle individual market checkboxes
    marketCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                marketAllCheckbox.checked = false;
            }
            updateMarketButtonText();
            updateChart();
        });
    });
    
    function updateMarketButtonText() {
        const selectedMarkets = getSelectedMarkets();
        if (selectedMarkets.length === 0 || marketAllCheckbox.checked) {
            document.getElementById('marketSelectText').textContent = 'All Markets';
        } else if (selectedMarkets.length === 1) {
            document.getElementById('marketSelectText').textContent = selectedMarkets[0];
        } else {
            document.getElementById('marketSelectText').textContent = `${selectedMarkets.length} Markets Selected`;
        }
    }
});
