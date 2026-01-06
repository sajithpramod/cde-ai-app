// document.getElementById("exportPPT").addEventListener("click", async function () {
//   const statusDiv = document.getElementById("exportStatus");
//   statusDiv.innerText = "Preparing charts...";

//   const chartContainers = document.querySelectorAll(".mekko-chart");
//   const chartsArray = [];

//   if (chartContainers.length === 0) {
//     statusDiv.innerText = "No charts found.";
//     return;
//   }

//   chartContainers.forEach((container, index) => {
//     const chart = window.renderedCharts.get(container.id);
//     if (chart && typeof chart.toJson === "function") {
//       try {
//         const jsonStr = JSON.stringify(chart.toJson());
//         const cid = `container_${index}`;              // ← unique ID
//         const script = `
//           anychart.onDocumentReady(function () {
//             var chart = anychart.fromJson(${jsonStr});
//             chart.container("${cid}");
//             chart.draw();
//           });
//         `;
//         chartsArray.push({ script, containerId: cid });
//       } catch (err) {
//         console.warn(`Chart JSON retrieval failed for ${container.id}`, err);
//       }
//     } else {
//       console.warn(`Chart not found or unsupported: ${container.id}`);
//     }
//   });

//   if (chartsArray.length === 0) {
//     statusDiv.innerText = "No valid charts to export.";
//     return;
//   }

//   statusDiv.innerText = "Sending charts to server...";

//   try {
//     const response = await fetch("/reports/generate-ppt-from-json", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ charts: chartsArray }),
//     });

//     if (!response.ok) throw new Error("PPTX generation failed");

//     const blob = await response.blob();
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.download = "MekkoCharts.pptx";
//     link.click();
//     URL.revokeObjectURL(url);

//     statusDiv.innerText = "Download complete!";
//   } catch (err) {
//     console.error("Export failed:", err);
//     statusDiv.innerText = "Failed to export. Check console.";
//   }
// });


// public/js/exportLocalPPT.js

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportPPT");
  const status = document.getElementById("exportStatus");

  btn.addEventListener("click", async () => {
    status.innerText = "Collecting chart data…";

    const charts = [];
    window.renderedCharts.forEach((chart, id) => {
      const data = chart._originalData;
      if (!data) {
        console.warn("No originalData for", id);
        return;
      }
      const title = (chart.title && chart.title().text()) || "";
      charts.push({ data, title });
    });

    if (charts.length === 0) {
      status.innerText = "No charts to export.";
      return;
    }

    status.innerText = "Sending to server…";
    try {
      const resp = await fetch("/reports/export-local-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charts })
      });
      if (!resp.ok) throw new Error(await resp.text());

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ReportCharts.pptx";
      a.click();
      URL.revokeObjectURL(url);

      status.innerText = "Download ready!";
    } catch (err) {
      console.error("Export failed", err);
      status.innerText = "Export failed. See console.";
    }
  });
});

