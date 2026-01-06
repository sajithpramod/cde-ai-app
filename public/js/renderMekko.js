/* global anychart */
document.addEventListener("DOMContentLoaded", function () {
    const chartDivs = document.querySelectorAll(".mekko-chart");
    window.renderedCharts = new Map();

    chartDivs.forEach(container => {
        const id = container.dataset.key;
        const jsonEl = document.getElementById(`mekko-data-${id}`);
        if (!jsonEl) return;

        const chartTitle = container.dataset.title || "Untitled Mekko Chart";

        let rawData;
        try {
            rawData = JSON.parse(jsonEl.textContent);
        } catch (e) {
            console.error(`Invalid JSON in mekko-data-${id}`, e);
            return;
        }

        if (!rawData.length) return;

        const motivations = ['relax', 'reward', 'savour', 'revel', 'connect', 'impress'];

        const tierKeyMap = {};
        

        const tierLabels = [];

        rawData.forEach(entry => {
            const tier = entry['price.tier'];
            if (tier && !(tier in tierKeyMap)) {
                const key = tier
                    .toLowerCase()
                    .replace(/[^\w\s]/g, '')    // Remove special characters
                    .replace(/\s+/g, '_');      // Replace spaces with underscore
    
                tierKeyMap[tier] = key;
                tierLabels.push(tier); // Maintain order of first appearance
            }
        });
        tierLabels.reverse();

        console.log(tierLabels);
    
        // Define tick values based on number of tiers
        const tickCount = tierLabels.length;
        const tickStep = Math.floor(100 / (tickCount - 1));
        const yTickValues = tierLabels.map((_, i) => i * tickStep);

        const fillColors = {
            "Relax": "#31B3EE",
            "Reward": "#035EAD",
            "Savour": "#EC0089",
            "Revel": "#F3751F",
            "Connect": "#66BC47",
            "Impress": "#8B6AD8"
        };

        // Step 1: Transpose data to match AnyChart format
        const transposedData = motivations.map(motivation => {
            const label = motivation.charAt(0).toUpperCase() + motivation.slice(1);
            const row = {
                x: label,
                stroke: "#ffffff",
                fill: fillColors[label] || "#ccc"
            };

            rawData.forEach(entry => {
                const tierKey = tierKeyMap[entry['price.tier']];
                if (tierKey && entry[motivation]) {
                    row[tierKey] = parseFloat(entry[motivation].replace('%', '')) || 0;
                }
            });

            return row;
        });

        // Wait for AnyChart to initialize
        anychart.onDocumentReady(function () {
            const chart = anychart.mekko();
            chart.title(chartTitle);

            // Set custom Y-axis ticks
            const yScale = chart.yScale();
            yScale.ticks().set(yTickValues);

            const yAxisLabels = chart.yAxis().labels();
            yAxisLabels.format(function() {
                const idx = yTickValues.indexOf(this.value);
                return idx !== -1 ? tierLabels[idx] : this.value + '%';
            });
            console.log("Y-axis ticks + labels:", tierLabels);
            chart.yAxis().title("Price Tier");

            const dataset = anychart.data.set(transposedData);

            // Add series using the mapped tier keys
            const tierKeys = Object.values(tierKeyMap);

            tierKeys.forEach(tier => {
                chart.mekko(dataset.mapAs({ x: "x", value: tier })).name(tier);
            });

            chart.container(container);
            chart.draw();


            // Save chart instance
            // renderedCharts.set(id, chart);
        });
    });
});
