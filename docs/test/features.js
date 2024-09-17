///////////////////////////////////////////////////////////////////////////////
// Settings
///////////////////////////////////////////////////////////////////////////////

// import CSVFeatureFile from "../../src/Features/FeatureFileFormats/CSVFeatureFile";

// Initial input file to load: '', 'file', or input from input.js (e.g. 'mito')
// const defaultMap = '';     // Empty
// const defaultMap = 'file'; // File Choose
// const defaultMap = 'sample_gff3';
// const defaultMap = 'sample_gtf';
const defaultMap = 'sample_csv';
// const defaultMap = 'sample_tsv';
// const defualtMap = 'arabidopsis_gtf';
// const defaultMap = 'bed12';
// const defaultMap = 'mito';

// const defaultFormat = 'auto';
// const defaultFormat = 'bed';
// const defaultFormat = 'gff3';
// const defaultFormat = 'gtf';
const defaultFormat = 'csv';
// const defaultFormat = 'tsv';


// Deafult Options
const prettyPrint = false;
const showInput = true;
const showFeatJson = true;
const showCgvJson = true;
const showMap = false;
const showAllText = false; // or only the first 1000 lines
// CSV/TSV Options
const noHeader = false;

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
// Show/Hide Input
const showInputCheckbox = document.querySelector('#option-show-input');
showInputCheckbox.checked = showInput;
// Show/Hide Seq JSON
const showSeqJsonCheckbox = document.querySelector('#option-show-seq-json');
showSeqJsonCheckbox.checked = showFeatJson;
// Show/Hide CGV JSON
const showCgvJsonCheckbox = document.querySelector('#option-show-cgv-json');
showCgvJsonCheckbox.checked = showCgvJson;
// Show/Hide Map
const showMapCheckbox = document.querySelector('#option-show-map');
showMapCheckbox.checked = showMap;
// Show All Text (or only the first 1000 lines)
const showAllTextCheckbox = document.querySelector('#option-show-all-text');
showAllTextCheckbox.checked = showAllText;
// CSV/TSV Options
// Show/Hide Input
const noHeaderCheckbox = document.querySelector('#option-no-header');
noHeaderCheckbox.checked = noHeader;
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
const groups = { bed: 'BED', gff3: 'GFF3', gtf: 'GTF', csv: 'CSV', bad: 'Bad' };
const order = ['gff3', 'gtf', 'bed', 'csv', 'bad'];
const optionsByGroup = {};
for (const inputKey of Object.keys(inputs)) {
  const input = inputs[inputKey];
  const selected = (inputKey === defaultMap) ? 'selected' : '';
  const option = `<option value='${inputKey}' ${selected}>${input.name}</option>`;
  if (optionsByGroup[input.type]) {
    optionsByGroup[input.type].push(option);
  } else {
    optionsByGroup[input.type] = [option];
  }
}

let optionGroups = "";
for (const group of order) {
  if (!optionsByGroup[group]) { continue; }
  const groupOptions = optionsByGroup[group].join('\n');
  optionGroups += `<optgroup label="${groups[group]}">${groupOptions}</optgroup>`;
}

let options = `
  <option value='' disabled ${(defaultMap == '') ? 'selected' : ''}>Select an input...</option>
  <option disabled>─────────</option>
  <option value='file' ${(defaultMap == 'file') ? 'selected' : ''}>Open a file...</option>
  <option disabled>─────────</option>
  ${optionGroups}
`;

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
  setTimeout(() => {
    loadInputFromID(id);
  }, 100);
});

// Format Select
const formatSelect = document.getElementById('format-select');
formatSelect.value = defaultFormat || 'auto';

// Format Changed
let selectedFormat = formatSelect.value;
const csvOptions = document.getElementById('csv-options');
formatSelect.addEventListener('change', (e) => {
  selectedFormat = e.target.value;
  if (['csv', 'tsv'].includes(selectedFormat)) {
    csvOptions.style.display = 'block';
  } else {
    csvOptions.style.display = 'none';
  }
});
formatSelect.dispatchEvent(new Event('change'));


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
    createCSVColumns();
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
    createCSVColumns();
    runParse();
  };
  request.send();
}
///////////////////////////////////////////////////////////////////////////////
// CSV/TSV Columns
///////////////////////////////////////////////////////////////////////////////

// - columnMap should be:
//   - key: column name or index
// - columnIndexMap should be:
//   - columnKeyIndexMap should be:
//   - key: column index
// - we need an iverted version:
//   - index: key
//   - columnIndexKeyMap
// - keys: contig, name, start, stop, strand, score, ignored, etc
// 
// defaultColumnMap should be static property of the delegate
// also add columnKeys as static property of the delegate


function createCSVColumns(providedColumnMap={}) {
  const selectedFormat = formatSelect.value;
  const noHeader = noHeaderCheckbox.checked;
  if (selectedFormat !== 'csv' && selectedFormat !== 'tsv') { return; }

  const csvColumns = document.getElementById('csv-columns');
  const csvText = document.getElementById('input-text').textContent;

  const featureFile = new CGParse.FeatureFile(csvText, {format: selectedFormat, maxLogCount: 1, columnMap: providedColumnMap, noHeader: noHeader});


  const columnKeys = CGParse.CSVFeatureFile.columnKeys;
  columnKeys.unshift('ignored');

  const csvFile = featureFile.delegate;
  const columnIndexToKeyMap = csvFile?.columnIndexToKeyMap || {};
  const columnCount = csvFile?.columnCount;

  const separator = (selectedFormat === 'csv') ? ',' : '\t';
  const columnData = CGParse.CSVFeatureFile.columnData(csvText, separator, 5);

  console.log("----------------------------------")
  console.log(columnIndexToKeyMap)
  console.log(columnData)
  console.log("----------------------------------")

  const rows = [];
  for (let i = 0; i < columnCount; i++) {
    const header = noHeader ? "" : columnData[i][0];
    // Join data for the index together with a comma. but if noHeader is false, skip the first row
    if (!noHeader) { columnData[i].shift(); }
    const data = `<span class='data-line'>${columnData[i].join(', ')}</span>`;

    const options = columnKeys.map((key) => {
      let selected = '';
      if (columnIndexToKeyMap[i] === key) {
        selected = 'selected';
      }
      return `<option value='${key}' ${selected}>${key}</option>`;
    });

    const colKeySelect = `<select class='small-select form-select form-select-sm'>${options}</select>`;
    rows.push(`<tr><td>${i}</td><td>${colKeySelect}</td><td class='data-col'><span class='data-header'>${header}</span>: ${data}</td></tr>`);
  };
  csvColumns.innerHTML = rows.join('\n');
}

function getCSVColumnMap() {
  const csvColumns = document.getElementById('csv-columns');
  const rows = csvColumns.querySelectorAll('tr');
  const columnMap = {};
  rows.forEach((row) => {
    const select = row.querySelector('select');
    const columnIndex = parseInt(row.querySelector('td').textContent);
    const columnKey = select.value;
    columnMap[columnKey] = columnIndex;
  });
  console.log("***************");
  console.log(columnMap);
  console.log("***************");
  return columnMap;
}

///////////////////////////////////////////////////////////////////////////////
// Parse
///////////////////////////////////////////////////////////////////////////////
// Speed of steps:
// - Fastest is going right to map (no innerHTML)
// - When using innerHTML, it is faster when the sequence is replaced
// - Prism.highlight is slowest step
function runParse(columnMap) {
  window.json = {}; // For debugging
  const inputTextDiv = document.getElementById('input-text');
  const outputSeqJsonDiv = document.getElementById('output-seq-json');
  const outputCgvJsonDiv = document.getElementById('output-cgv-json');
  // Clear outputs
  outputSeqJsonDiv.innerHTML = "Loading...";
  outputCgvJsonDiv.innerHTML = "Loading...";
  // Using prism can be slow for large files
  const prismMode = prettyPrintCheckbox.checked;

  // Get input text
  const inputText = inputTextDiv.textContent;
  console.log("Input Text", inputText)

  const selectedFormat = formatSelect.value;

  let parseColumnMap;
  if (selectedFormat === 'csv' || selectedFormat === 'tsv') {
    parseColumnMap = columnMap;
    console.log("---------")
    console.log(parseColumnMap)
    console.log("---------")
  }


  // Parse to featureJson
  const featureJsonStartTime = new Date().getTime();
  const featureFile = new CGParse.FeatureFile(inputText, {format: selectedFormat, maxLogCount: 1, noHeader: noHeaderCheckbox.checked, columnMap: parseColumnMap});
  const featureJSON = featureFile.records;
  json.featureFile = featureFile; // For debugging
  console.log(featureJSON)
  const featureJsonRunTime = elapsedTime(featureJsonStartTime);
  updateTime('time-seq-json', featureJsonRunTime);
  let seqString = JSON.stringify(featureJSON, null, 2);
  // Compact the locations array to a single line for easier viewing
  // seqString = seqString.replace(/"locations":(.*?)(\s+)([}"])/smg, (match, p1, p2, p3) => {
  //   return `"locations": ${p1.replace(/\s+/g, '')}${p2}${p3}`;
  // });
  seqString = compacetLocations(seqString);
  outputSeqJsonDiv.innerHTML = filterJSONText(seqString);
  window.json.feature = featureJSON; // For debugging
  // return;

  // Parse to CGView Feature JSON
  let cgvJSON;
  let builder;
  if (showCgvJsonCheckbox.checked) {
    const cgvJsonStartTime = new Date().getTime();
    // cgvJSON = CGParse.seqJSONToCgvJSON(seqJSON, {config: jsonConfig});
    // builder = new CGParse.CGViewBuilder(seqFile, {logger: seqFile.logger, config: jsonConfig, includeQualifiers: true, maxLogCount: 2});
    //   // cgvJSON = seqFile.toCGViewJSON({config: jsonConfig, includeQualifiers: true, maxLogCount: 2});
    builder = new CGParse.FeatureBuilder(featureFile, {logger: featureFile.logger, includeQualifiers: true, maxLogCount: 2});
    cgvJSON = builder.toJSON();

    const cgvJsonRunTime = elapsedTime(cgvJsonStartTime);
    updateTime('time-cgv-json', cgvJsonRunTime);
    // Convert to string (and pretty print with 2 spaces)
    if (builder.passed && cgvJSON) {
      let cgvString = JSON.stringify(cgvJSON, null, 2);
      cgvString = compacetLocations(cgvString);
      outputCgvJsonDiv.innerHTML = prismMode ? Prism.highlight(cgvString, Prism.languages.json, 'json') : cgvString;
    }
    window.json.cgv = cgvJSON; // For debugging
  }

  // MESSAGES
  const logDiv = document.getElementById('log-text');
  const messages = featureFile.logger.history({showIcons: true});
  console.log(messages)
  logDiv.innerHTML = messages;

  // // Load Map with JSON
  // if (cgvJSON) {
  //   cgv.io.loadJSON(cgvJSON);
  //   const mapName = document.getElementById('map-name');
  //   mapName.innerHTML = cgv.name;
  //   cgv.draw();
  //   myResize();
  // }
}

function compacetLocations(seqString) {
  return seqString.replace(/"locations":(.*?)(\s+)([}"])/smg, (match, p1, p2, p3) => {
    return `"locations": ${p1.replace(/\s+/g, '')}${p2}${p3}`;
  });
}


function filterJSONText(text) {
  // let filteredText = text;
  const skipLines = 1000;
  const prismMode = prettyPrintCheckbox.checked;
  const allMode = showAllTextCheckbox.checked;
  if (!allMode) {
    const lines = text.split('\n');
    const firstLines = lines.slice(0, skipLines);
    if (lines.length > skipLines) {
      firstLines.push(`...skipping ${lines.length - skipLines} lines...`);
    }
    text = firstLines.join('\n');
  }

  filteredText = prismMode ? Prism.highlight(text, Prism.languages.json, 'json') : text;
  return filteredText;
}

///////////////////////////////////////////////////////////////////////////////
// Options
///////////////////////////////////////////////////////////////////////////////

// Reparse
const reparseBtn = document.getElementById('reparse-btn');
reparseBtn.addEventListener('click', (e) => {
  console.log("Reparse...")
  const columnMap = getCSVColumnMap();
  createCSVColumns(columnMap);
  runParse(columnMap);
});

showInputCheckbox.addEventListener('click', (e) => {
  updatePageLayout();
});
showSeqJsonCheckbox.addEventListener('click', (e) => {
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
  const featureJsonDiv = document.querySelector('.section-feature-json');
  featureJsonDiv.style.display = showSeqJsonCheckbox.checked ? 'flex' : 'none';
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
  openInProksee(cgv, 'CGParse', true)
});