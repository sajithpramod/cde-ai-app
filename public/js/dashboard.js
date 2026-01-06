const rowsPerPage = 10;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", function () {
    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

    const comparer = (idx, asc) => (a, b) => {
        const valA = getCellValue(a, idx).toLowerCase();
        const valB = getCellValue(b, idx).toLowerCase();
        return valA.localeCompare(valB) * (asc ? 1 : -1);
    };

    document.querySelectorAll(".sort-link").forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const th = e.target.closest("th");
            const table = th.closest("table");
            const tbody = table.querySelector("tbody");
            const ths = [...th.parentNode.children];
            const index = ths.indexOf(th);
            const asc = !th.classList.contains("asc");

            [...tbody.querySelectorAll("tr")]
                .sort(comparer(index, asc))
                .forEach(tr => tbody.appendChild(tr));

            // Toggle sort class
            ths.forEach(t => t.classList.remove("asc", "desc"));
            th.classList.toggle(asc ? "asc" : "desc");
        });
    });

    // Initialize after DOM is ready
    populateFilterOptions();
    paginateTable();
});

function populateFilterOptions() {
    // Note: Filter options are now rendered server-side in the EJS template
    // This function is kept for backward compatibility but is no longer used
    // The dataType and duration filters are pre-populated in the HTML
}

// function sortTable(n) {
//     const table = document.getElementById("forecastTable");
//     let rows = Array.from(table.rows).slice(1); // skip header
//     let dir = "asc";

//     rows.sort((a, b) => {
//         let x = a.cells[n].innerText.toLowerCase();
//         let y = b.cells[n].innerText.toLowerCase();

//         return dir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
//     });

//     rows.forEach(row => table.tBodies[0].appendChild(row));
//     paginateTable();
// }

// function applyFilters() {
//     const typeMarket = $('#filter-type-market').val().toLowerCase();
//     const marketModel = $('#filter-market-model').val().toLowerCase();
//     const dataType = $('#filter-data-type').val().toLowerCase();
//     const duration = $('#filter-duration').val();
//     const now = new Date();

//     $('#forecastTable tbody tr').each(function () {
//         const row = $(this);
//         const tMarket = row.find('td:nth-child(6)').text().toLowerCase();
//         const mModel = row.find('td:nth-child(5)').text().toLowerCase();
//         const dType = row.find('td:nth-child(4)').text().toLowerCase();
//         const pubDate = new Date(row.find('td:nth-child(7)').text());

//         let show = true;
//         if (typeMarket && tMarket !== typeMarket) show = false;
//         if (marketModel && mModel !== marketModel) show = false;
//         if (dataType && dType !== dataType) show = false;

//         if (duration) {
//             const daysAgo = (now - pubDate) / (1000 * 3600 * 24);
//             if (duration === '3m' && daysAgo > 90) show = false;
//             if (duration === '6m' && daysAgo > 180) show = false;
//             if (duration === '1y' && daysAgo > 365) show = false;
//         }

//         row.toggle(show);
//     });

//     currentPage = 1;
//     paginateTable();
// }

function paginateTable() {
    // Note: Pagination is now handled server-side in routes/dashboard.js
    // This function is kept for backward compatibility but is no longer used
    // The pagination UI is rendered in the EJS template with proper query strings
}