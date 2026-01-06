let marketMap = {}; // id -> market_type

document.addEventListener('DOMContentLoaded', () => {
  const typeSelect = document.getElementById('typeOfModel');
  const modelSection = document.getElementById('marketModelSection');
  const modelSelect = document.getElementById('marketModel');
  const marketSelect = document.getElementById('marketSelect');
  const hiddenModelInput = document.getElementById('hiddenMarketModelId');
  const hiddenMarketIdInput = document.getElementById('hiddenMarketId');

  // Load markets by default for FPA
  // fetchMarkets('FPA');

  // ✅ Handle model type change (Above/In Market)
  typeSelect.addEventListener('change', () => {
    const selected = typeSelect.value;
console.log('selected', modelSelect.value);
    if (selected === 'above') {
      modelSection.classList.remove('d-none');
      fetchMarkets(modelSelect.value || 'FPA'); // load FPA by default
    } else {
      modelSection.classList.add('d-none');
      fetchMarkets('FPA'); // or clear if needed
    }
  });

  // ✅ Market model dropdown change (FPA/MGF)
  modelSelect.addEventListener('change', () => {
    hiddenModelInput.value = modelSelect.value;
    fetchMarkets(modelSelect.value);
  });

  // ✅ Market dropdown change
  marketSelect.addEventListener('change', () => {
    hiddenMarketIdInput.value = marketSelect.value;
  });

  // ✅ Fetch markets from server filtered by model
  function fetchMarkets(model) {
    fetch('/markets', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error);
        // filter only if model is provided
        const filtered = model
          ? data.markets.filter(m => m.model_type === model)
          : [];

        console.log('model',filtered )  ;

        marketSelect.innerHTML = '<option value="">-- Select Market --</option>';
        filtered.forEach(m => {
          console.log('Adding market:', m.name);
          marketMap[m.id] = m.market_type; // Store mapping
          const option = document.createElement('option');
          option.value = m.id;
          option.textContent = m.name;
          marketSelect.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error loading markets:', err);
        marketSelect.innerHTML = '<option value="">-- Error loading markets --</option>';
      });
  }
});


// fetch('/markets', { credentials: 'include' })
//   .then((res) => res.json())
//   .then((data) => {
//     if (!data.success) throw new Error(data.error || 'Failed to fetch markets');

//     const select = document.getElementById('marketSelect');
//     select.innerHTML = '<option value="">-- Select Market --</option>';

//     data.markets.forEach((m) => {
//       marketMap[m.id] = m.market_type; // Store mapping
//       const option = document.createElement('option');
//       option.value = m.id;
//       option.textContent = m.name;
//       select.appendChild(option);
//     });
//   })
//   .catch((err) => {
//     console.error('Market loading error:', err);
//     alert('Error loading markets');
//   });

  document.addEventListener('DOMContentLoaded', () => {
    const subClusterSelect = document.getElementById('dataTypeSection');
    if (subClusterSelect) {
      subClusterSelect.addEventListener('change', handleDataTypeChange);
    }
  });
 
  document.addEventListener('DOMContentLoaded', () => {
    const subClusterSelect = document.getElementById('initialDataFile');
    if (subClusterSelect) {
      subClusterSelect.addEventListener('change', handleInitialFileUpload);
    }
  });
 
   
  document.addEventListener('DOMContentLoaded', () => {
    const subClusterSelect = document.getElementById('radio-priceTier');
    if (subClusterSelect) {
      subClusterSelect.addEventListener('change', handlePriceTierSelected);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const subClusterSelect = document.getElementById('forecastDuration');
    if (subClusterSelect) {
      subClusterSelect.addEventListener('change', showCAGRSection);
    }
  });


//   document.addEventListener('DOMContentLoaded', () => {
//     const fileInputs = document.querySelectorAll('.file-input');
    
//     fileInputs.forEach(input => {
//       input.addEventListener('change', checkAllFiveUploaded);
//     });
//   });
  
  function showSection(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function hideSection(id) {
    document.getElementById(id).classList.add("hidden");
  }

  document.addEventListener('DOMContentLoaded', () => {
    const marketSelect = document.getElementById('marketSelect');
    marketSelect.addEventListener('change', handleMarketChange);
  });

  function handleMarketChange(event) {
    const marketId = event.target.value;
    console.log('Market selected:', marketId);
    // You can update hidden field or fetch market_type from marketMap here
  }

  function handleMarketChange() {
    // const market = document.getElementById("marketSelect").value;
    showSection("dataTypeSection");

    // if (market === "cluster") {
    //   showSection("subClusterSection");
    // } else {
    //   hideSection("subClusterSection");
    // }

    const select = document.getElementById('marketSelect');
    const selectedId = select.value;
  console.log(selectedId);
    document.getElementById('hiddenMarketId').value = selectedId;
  
    if (selectedId && marketMap[selectedId]) {
      const selectedType = marketMap[selectedId];
      console.log('Market Type:', selectedType);
  
      // Perform actions based on market_type
    //  if (selectedType === 'CM') {
    //     document.getElementById('clusterFields').style.display = 'block';
    //   } else {
    //     document.getElementById('clusterFields').style.display = 'none';
    //   }

    if (selectedType === "CM") {
        showSection("subClusterSection");
       
        subclusterteaxtarea.classList.remove('d-none');
      } else {
        hideSection("subClusterSection");
        subclusterteaxtarea.classList.add('d-none');
        
      }
    }
  }

  function handleDataTypeChange() {
    showSection("initialFileUpload");
  }

  function handleInitialFileUpload() {
    const dataType = document.getElementById("dataType").value;
    if (dataType === "iwsr") {
      showSection("iwsrColumnSelection");
    }
  }

  function handlePriceTierSelected() {
    showSection("priceTierRenameRank");
    showSection("multiFileUploadSection");
  }

  function checkAllFiveUploaded() {
    const fileInputs = document.querySelectorAll("#multiFileUploadSection input[type='file']");
    const allUploaded = [...fileInputs].every(input => input.files.length > 0);
    if (allUploaded) {
      showSection("durationSection");
    }
  }

  function showCAGRSection() {
    const duration = document.getElementById("forecastDuration").value;
    if (duration) {
      showSection("cagrSection");
      showSection("forecastButtonSection");
    }
  }

  function submitForecast() {
    const duration = document.getElementById("forecastDuration").value;
    if (!duration) {
      alert("Please select forecast duration.");
      return;
    }
    alert("Forecast initiated for " + duration + " year(s).");
  }
  



const socket = io();

socket.on('r-progress', msg => {
  document.getElementById('status').innerText = "Processing: " + msg;
});

socket.on('r-error', err => {
  document.getElementById('status').innerText = "Error: " + err;
});

socket.on('r-done', result => {
  if (result.success) {
    const table = document.createElement('table');
    table.classList.add('table', 'table-bordered');
    const data = result.data;
    const headers = Object.keys(data[0]);
    const thead = table.insertRow();
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      thead.appendChild(th);
    });
    data.forEach(row => {
      const tr = table.insertRow();
      headers.forEach(h => {
        const td = tr.insertCell();
        td.textContent = row[h];
      });
    });
    document.getElementById("resultTable").innerHTML = "";
    document.getElementById("resultTable").appendChild(table);
  } else {
    document.getElementById('status').innerText = "Processing failed: " + result.error;
  }
});

// document.getElementById('uploadForm').addEventListener('submit', async function(e) {
//   e.preventDefault();
//   const formData = new FormData(this);
//   const res = await fetch('/upload', { method: 'POST', body: formData });
//   if (!res.ok) {
//     const msg = await res.text();
//     document.getElementById('status').innerText = "Upload failed: " + msg;
//   }
// });

// document.addEventListener('DOMContentLoaded', () => {
//     const form = document.getElementById('uploadForm');
//     const statusDiv = document.getElementById('status');
//     const resultDiv = document.getElementById('resultTable');
  
//     form.addEventListener('submit', async (e) => {
//       e.preventDefault();
  
//       const formData = new FormData(form);
//       statusDiv.textContent = 'Uploading and validating...';
//       resultDiv.innerHTML = '';
  
//       try {
//         const response = await fetch('/upload', {
//           method: 'POST',
//           body: formData,
//           credentials: 'include' // important if auth/session
//         });
  
//         const result = await response.json();
  
//         if (!result.success) {
//           statusDiv.textContent = 'Upload failed.';
//           return;
//         }
  
//         statusDiv.textContent = 'Upload complete.';
  
//         result.results.forEach((fileResult) => {
//           const p = document.createElement('p');
//           if (fileResult.success) {
//             p.textContent = `✅ ${fileResult.file} processed successfully.`;
//           } else {
//             p.textContent = `❌ ${fileResult.file} failed: ${fileResult.error}`;
//             if (fileResult.missingHeaders) {
//               const ul = document.createElement('ul');
//               fileResult.missingHeaders.forEach((header) => {
//                 const li = document.createElement('li');
//                 li.textContent = `Missing header: ${header}`;
//                 ul.appendChild(li);
//               });
//               p.appendChild(ul);
//             }
//           }
//           resultDiv.appendChild(p);
//         });
//       } catch (err) {
//         statusDiv.textContent = 'Error uploading file.';
//         console.error(err);
//       }
//     });
//   });



document.addEventListener('DOMContentLoaded', () => {
    const fileInputs = document.querySelectorAll('.file-input');
  
    fileInputs.forEach((input, index) => {
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const fieldName = e.target.name;
        const parent = e.target.closest('.file-group');
        const loader = parent.querySelector('.loader');
        const errorBox = parent.querySelector('.error-message');
  
        errorBox.classList.add('d-none');
        errorBox.textContent = '';
        loader.classList.remove('d-none');
  
        if (!file) return;
  
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fieldName', fieldName);
  
        fetch('/upload/single', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
          .then(res => res.json())
          .then(response => {
            loader.classList.add('d-none');
            if (response.success) {
              console.log(`✅ ${file.name} processed`, response);
              
              // ✅ Show the next input
              const nextGroup = document.getElementById(`group${index + 2}`);
              if (nextGroup) nextGroup.classList.remove('d-none');
            } else {
              errorBox.classList.remove('d-none');
              errorBox.textContent = `❌ ${response.error}`;
              if (response.missing?.length) {
                errorBox.textContent += ` | Missing headers: ${response.missing.join(', ')}`;
              }
              e.target.value = ''; // Clear the file input
            }
          })
          .catch(err => {
            loader.classList.add('d-none');
            errorBox.classList.remove('d-none');
            errorBox.textContent = 'Upload failed: ' + err.message;
            e.target.value = '';
          });
      });
    });
  });


  // document.getElementById('uploadForm').addEventListener('submit', function (e) {
  //   e.preventDefault(); // 👈 Always prevent by default
  //   let valid = true;
  
  //   // PRICE TIER validation
  //   const priceTierSection = document.getElementById('priceTierRenameRank');
  //   if (!priceTierSection.classList.contains('hidden') && !priceTierSection.classList.contains('d-none')) {
  //     const rankInputs = priceTierSection.querySelectorAll('.rank-input');
  //     console.log(rankInputs);
  
  //     rankInputs.forEach(input => {
  //       const feedback = input.nextElementSibling;
  //       if (!input.value.trim()) {
  //         input.classList.add('is-invalid');
  //         feedback.style.display = 'block';
  //         valid = false;
  //       }
  //     });
  //   }
  
  //   // SUBCLUSTER text area validation
  //   const subclusterSection = document.getElementById('subclusterteaxtarea');
  //   const commentInput = document.getElementById('comment');
  //   const commentFeedback = commentInput.nextElementSibling;
  
  //   if (!subclusterSection.classList.contains('hidden') && !subclusterSection.classList.contains('d-none')) {
  //     if (!commentInput.value.trim()) {
  //       commentInput.classList.add('is-invalid');
  //       commentFeedback.style.display = 'block';
  //       valid = false;
  //     }
  //   }
  
  //   if (!valid) e.preventDefault();
  // });
  document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;
  
    // PRICE TIER validation
    const priceTierSection = document.getElementById('priceTierRenameRank');
    if (!priceTierSection.classList.contains('hidden') && !priceTierSection.classList.contains('d-none')) {
      const rankInputs = priceTierSection.querySelectorAll('.rank-input');
      
      rankInputs.forEach(input => {
        const feedback = input.parentElement.querySelector('.invalid-feedback');
        console.log('here come');
        if (!input.value.trim()) {
          input.classList.add('is-invalid');
          feedback.style.display = 'block';
          valid = false;
        } else {
          input.classList.remove('is-invalid');
          feedback.style.display = 'none';
        }
  
        input.addEventListener('input', () => {
          input.classList.remove('is-invalid');
          feedback.style.display = 'none';
        });
      });
    }
  
    // SUBCLUSTER textarea validation
    const subclusterSection = document.getElementById('subclusterteaxtarea');
    const commentInput = document.getElementById('comment');
    const commentFeedback = commentInput.nextElementSibling;
  
    if (!subclusterSection.classList.contains('hidden') && !subclusterSection.classList.contains('d-none')) {
      if (!commentInput.value.trim()) {
        commentInput.classList.add('is-invalid');
        commentFeedback.style.display = 'block';
        valid = false;
      } else {
        commentInput.classList.remove('is-invalid');
        commentFeedback.style.display = 'none';
      }
  
      commentInput.addEventListener('input', () => {
        commentInput.classList.remove('is-invalid');
        commentFeedback.style.display = 'none';
      });
    }
  
    if (valid) {
      // Submit the form via JS or continue with the flow
      console.log("Form is valid, you can proceed.");
      // this.submit(); // optional
    }
  });
  
  
  // Clean up on user input
  document.querySelectorAll('.rank-input, #comment').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const feedback = input.nextElementSibling;
      if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.style.display = 'none';
      }
    });
  });
  
  
  
  

