///////////////////////////////////////////////////////////////////////////////
// Settings
///////////////////////////////////////////////////////////////////////////////

// Initial input file to load: '', 'file', or input from input.js (e.g. 'mito')
// const defaultMap = '';     // Empty
// const defaultMap = 'file'; // File Choose
// const defaultMap = 'mito_fa';
const defaultMap = 'mito_gb';
// const defaultMap = 'contigs';

// Deafult Options
const prettyPrint = false;
const showInput = true;
const showSeqJson = true;
const showTesJson = false;
const showCgvJson = true;
const showMap = true;
const filterSequence = true;

///////////////////////////////////////////////////////////////////////////////
// Initialize
///////////////////////////////////////////////////////////////////////////////

// Initalize CGView
const defaultSize = 300;
cgv = new CGV.Viewer('#my-viewer', {
  height: defaultSize,
  width: defaultSize,
});

// Initialize File Section: hide or show
const fileSectionDisplayStyle = (defaultMap === 'file') ? 'block' : 'none';
document.getElementById('file-section').style.display = fileSectionDisplayStyle;
clearFileInput();

// Initialize Options
// Prism/Pretty Print
const prettyPrintCheckbox = document.querySelector('#option-prism');
prettyPrintCheckbox.checked = prettyPrint;
// Filter Sequence
const filterSeqCheckbox = document.querySelector('#option-filter-seq');
filterSeqCheckbox.checked = filterSequence;
// Show/Hide Input
const showInputCheckbox = document.querySelector('#option-show-input');
showInputCheckbox.checked = showInput;
// Show/Hide Seq JSON
const showSeqJsonCheckbox = document.querySelector('#option-show-seq-json');
showSeqJsonCheckbox.checked = showSeqJson;
// Show/Hide Teselagen JSON
const showTesJsonCheckbox = document.querySelector('#option-show-tes-json');
showTesJsonCheckbox.checked = showTesJson;
// Show/Hide CGV JSON
const showCgvJsonCheckbox = document.querySelector('#option-show-cgv-json');
showCgvJsonCheckbox.checked = showCgvJson;
// Show/Hide Map
const showMapCheckbox = document.querySelector('#option-show-map');
showMapCheckbox.checked = showMap;
updatePageLayout();

// Load default map
loadInputFromID(defaultMap);

///////////////////////////////////////////////////////////////////////////////
// Config JSON passed to parser
///////////////////////////////////////////////////////////////////////////////
const jsonConfig = {
  legend: {
    position: 'top-right',
    alignment: 'left',
    backgroundColor: 'rgba(255,255,255,0.75)',
    defaultFont: 'sans-serif, plain, 14',
    defaultFontColor: 'black',
    items: [
      {name: 'CDS', swatchColor: 'rgba(0,0,153,0.5)', decoration: 'arrow'},
    ]
  }
};

///////////////////////////////////////////////////////////////////////////////
// Map Creation and Selection
///////////////////////////////////////////////////////////////////////////////

// File selector
// Add maps from maps.js to Select
// Using global variable 'inputs' from inputs.js
const inputSelect = document.getElementById('map-select');
let options = `
  <option value='' disabled ${(defaultMap == '') ? 'selected' : ''}>Select an input...</option>
  <option disabled>─────────</option>
  <option value='file' ${(defaultMap == 'file') ? 'selected' : ''}>Open a file...</option>
  <option disabled>─────────</option>
`;
for (const input of Object.keys(inputs)) {
  const selected = (input === defaultMap) ? 'selected' : '';
  options += `<option value='${input}' ${selected}>${inputs[input].name}</option>`;
}

// Choose a predefined file or show the file input section
// Load map when select changes
inputSelect.innerHTML = options;
inputSelect.addEventListener('change', (e) => {
  const id = e.target.value;
  const fileSection = document.getElementById('file-section');
  if (id === 'file') {
    fileSection.style.display = 'block';
    clearText();
    return;
  } else {
    fileSection.style.display = 'none';
    clearText();
    clearFileInput();
  }
  loadInputFromID(id);
});

// Clear the file input when the file section is closed
function clearFileInput() {
  const fileInput = document.getElementById('file-input');
  fileInput.value = '';
}

// Clear text boxes and the map
function clearText() {
  // Clear inputs and outpus
  document.getElementById('input-text').innerHTML = "Empty..."
  document.getElementById('output-seq-json').innerHTML = "Empty..."
  document.getElementById('output-tes-json').innerHTML = "Empty..."
  document.getElementById('output-cgv-json').innerHTML = "Empty..."
  document.getElementById('map-name').innerHTML = 'Empty'
  // Clear runtimes
  var timeEls = document.getElementsByClassName('section-time');
  for (var i = 0; i < timeEls.length; i++) {
      timeEls[i].innerHTML = 'n/a';
  }
  // Clear Map
  cgv.io.loadJSON({cgview: {version: "1.6.0", captions: [{name: "Empty", font: "sans-serif,italic,12", fontColor: "grey", position: {lengthPercent: 50, mapOffset: 0}}]}}); // Clear map
}

// Load from file chooser
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (event) => {
  var file = event.target.files[0];
  if (!file) { return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    const inputTextDiv = document.getElementById('input-text');
    var contents = e.target.result;
    inputTextDiv.innerHTML = contents;
    runParse();
  };

  reader.onerror = function(e) {
    console.error("File could not be read! Error: " + e.target.error);
  };

  reader.readAsText(file);
});

// Load local predefined file (by id)
function loadInputFromID(id) {
  clearText();
  if (id === 'file') { return; }
  if (id === '') { return; }
  const inputTextDiv = document.getElementById('input-text');
  if (!inputs[id]) {
    console.error(`No input with id: ${id}`);
    return
  }
  const url = inputs[id].url
  console.log(`Loading Map: ${url}`);
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onload = function() {
    const inputText = request.responseText;
    console.log("Loaded Map", inputText)
    inputTextDiv.innerHTML = inputText;
    runParse();
  };
  request.send();
}

///////////////////////////////////////////////////////////////////////////////
// Parse
///////////////////////////////////////////////////////////////////////////////
// Speed of steps:
// - Fastest is going right to map (no innerHTML)
// - When using innerHTML, it is faster when the sequence is replaced
// - Prism.highlight is slowest step
// Notes:
// - async is only for anyToTeselagen
async function runParse() {
  window.json = {}; // For debugging
  const inputTextDiv = document.getElementById('input-text');
  const outputSeqJsonDiv = document.getElementById('output-seq-json');
  const outputTesJsonDiv = document.getElementById('output-tes-json');
  const outputCgvJsonDiv = document.getElementById('output-cgv-json');
  // Using prism can be slow for large files
  const prismMode = prettyPrintCheckbox.checked;
  const filterSeqMode = filterSeqCheckbox.checked;

  // Get input text
  const inputText = inputTextDiv.textContent;
  console.log("Input Text", inputText)

  // Parse to seqJson
  const seqJsonStartTime = new Date().getTime();
  // const seqJSON = CGVParse.seqToSeqJSON(inputText, {config: jsonConfig});
  // const seqFile = new CGVParse.SequenceFile(inputText, {addFeatureSequences: true});
  const seqFile = new CGVParse.SequenceFile(inputText);
  const seqJSON = seqFile.records;
  console.log(seqJSON)
  const seqJsonRunTime = elapsedTime(seqJsonStartTime);
  updateTime('time-seq-json', seqJsonRunTime);
  let seqString = JSON.stringify(seqJSON, null, 2);
  if (filterSeqMode) {
    seqString = seqString.replace(/"sequence": ".*"/g, '"sequence": "..."');
  }
  // Compact the locations array to a single line for easier viewing
  seqString = seqString.replace(/"locations":(.*?)(\s+)([}"])/smg, (match, p1, p2, p3) => {
    return `"locations": ${p1.replace(/\s+/g, '')}${p2}${p3}`;
  });
  outputSeqJsonDiv.innerHTML = prismMode ? Prism.highlight(seqString, Prism.languages.json, 'json') : seqString;
  window.json.seq = seqJSON; // For debugging
  // return;

  // Parse to teselagen JSON
  if (showTesJsonCheckbox.checked) {
    const tesJsonStartTime = new Date().getTime();
    const tesJSON = await CGVParse.anyToTeselagen(inputText, {inclusive1BasedStart: true, inclusive1BasedEnd: true});
    const tesJsonRunTime = elapsedTime(tesJsonStartTime);
    updateTime('time-tes-json', tesJsonRunTime);
    // Convert to string (and pretty print with 2 spaces)
    let tesString = JSON.stringify(tesJSON, null, 2);
    if (filterSeqMode) {
      tesString = tesString.replace(/"sequence": ".*"/g, '"sequence": "..."');
    }
    outputTesJsonDiv.innerHTML = prismMode ? Prism.highlight(tesString, Prism.languages.json, 'json') : tesString;
    window.json.tes = tesJSON; // For debugging
  }

  // Parse to CGView JSON
  let cgvJSON;
  if (showCgvJsonCheckbox.checked) {
    const cgvJsonStartTime = new Date().getTime();
    // cgvJSON = CGVParse.seqJSONToCgvJSON(seqJSON, {config: jsonConfig});
    cgvJSON = seqFile.toCGVJSON({config: jsonConfig});
    const cgvJsonRunTime = elapsedTime(cgvJsonStartTime);
    updateTime('time-cgv-json', cgvJsonRunTime);
    // Convert to string (and pretty print with 2 spaces)
    let cgvString = JSON.stringify(cgvJSON, null, 2);
    if (filterSeqMode) {
      cgvString = cgvString.replace(/"seq": ".*"/g, '"sequence": "..."');
    }
    outputCgvJsonDiv.innerHTML = prismMode ? Prism.highlight(cgvString, Prism.languages.json, 'json') : cgvString;
    window.json.cgv = cgvJSON; // For debugging
  }

  // MESSAGES
  // let messages = "";
  // tesJSON.forEach((tes, index) => {
  //   const status = tes.success ? 'PASS' : 'FAIL';
  //   messages += `Sequence ${index + 1} [${status}]: ${tes?.parsedSequence?.name}\n`;
  // });
  const logDiv = document.getElementById('log-text');
  const messages = seqFile.logger.history({showTimestamps: false});
  console.log(messages)
  logDiv.innerHTML = messages;

  // Load Map with JSON
  if (cgvJSON) {
    cgv.io.loadJSON(cgvJSON);
    const mapName = document.getElementById('map-name');
    mapName.innerHTML = cgv.name;
    cgv.draw();
    myResize();
  }
}

///////////////////////////////////////////////////////////////////////////////
// Options
///////////////////////////////////////////////////////////////////////////////

// Reparse
const reparseBtn = document.getElementById('reparse-btn');
reparseBtn.addEventListener('click', (e) => {
  console.log("Reparse...")
  runParse();
});

showInputCheckbox.addEventListener('click', (e) => {
  updatePageLayout();
});
showSeqJsonCheckbox.addEventListener('click', (e) => {
  updatePageLayout();
});
showTesJsonCheckbox.addEventListener('click', (e) => {
  updatePageLayout();
});
showCgvJsonCheckbox.addEventListener('click', (e) => {
  updatePageLayout();
});
showMapCheckbox.addEventListener('click', (e) => {
  updatePageLayout();
});

function updatePageLayout() {
  // Input
  const inputDiv = document.querySelector('.section-input');
  inputDiv.style.display = showInputCheckbox.checked ? 'flex' : 'none';
  // Sequence JSON
  const seqJsonDiv = document.querySelector('.section-seq-json');
  seqJsonDiv.style.display = showSeqJsonCheckbox.checked ? 'flex' : 'none';
  // Teselagen JSON
  const tesJsonDiv = document.querySelector('.section-tes-json');
  tesJsonDiv.style.display = showTesJsonCheckbox.checked ? 'flex' : 'none';
  // CGView JSON
  const cgvJsonDiv = document.querySelector('.section-cgv-json');
  cgvJsonDiv.style.display = showCgvJsonCheckbox.checked ? 'flex' : 'none';
  // Map
  const cgvMapDiv = document.querySelector('.sidebar-map');
  cgvMapDiv.style.display = showMapCheckbox.checked ? 'block' : 'none';
}

///////////////////////////////////////////////////////////////////////////////
// Full Size Map
///////////////////////////////////////////////////////////////////////////////

function myResize() {
  const mapSection = document.querySelector('.sidebar-map');
  const width = mapSection.offsetWidth - 20;
  console.log(width)
  cgv.resize(width, width);
}
window.addEventListener('resize', myResize)
myResize();

///////////////////////////////////////////////////////////////////////////////
// Label Highlighting
///////////////////////////////////////////////////////////////////////////////

cgv.on('mousemove', (e) => {
  // const elements = ['caption', 'legendItem', 'label'];
  const elements = ['caption', 'legendItem'];
  if (elements.includes(e.elementType)) {
    e.element.highlight();
  }
  if (e.elementType === 'label') {
    const label = e.element;
    label.feature.highlight();
  }
  if (e.elementType === 'feature') {
  }
});

///////////////////////////////////////////////////////////////////////////////
// UTILS
///////////////////////////////////////////////////////////////////////////////
function elapsedTime(oldTime) {
  const elapsed = (new Date().getTime()) - oldTime;
  return `${elapsed} ms`;
};

function updateTime(id, time) {
  const timeDiv = document.getElementById(id);
  timeDiv.innerHTML = time;
}

///////////////////////////////////////////////////////////////////////////////
// Open in Proksee API
///////////////////////////////////////////////////////////////////////////////

function openInProksee(cgv, origin, open=false) {
  let responseData = {};
  const url = 'https://proksee.ca/api/v1/projects.json';
  const data = { origin, data: JSON.stringify(cgv.io.toJSON()) };
  const response = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    if (data?.status === 'success' && data?.url) {
      if (open) {
        window.location.href = data.url;
      }
    } else {
      alert(`Unable to send map to Proksee: ${data?.error} `)
    }
  })
  .catch((error) => {
    console.log('Error:', error);
  });
  return responseData;
}

// Add openInProksee to a button with id of 'open-in-proksee-btn'
const openInProkseeBtn = document.getElementById('open-in-proksee-btn');
openInProkseeBtn.addEventListener('click', (e) => {
  openInProksee(cgv, 'CGVParse', true)
});