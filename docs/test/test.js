///////////////////////////////////////////////////////////////////////////////
// Settings
///////////////////////////////////////////////////////////////////////////////

// const defaultMap = '';
// const defaultMap = 'file';
// const defaultMap = 'mito';
const defaultMap = 'contigs';
// const defaultMap = 'labels';
const defaultSize = 300;

// Add CGView
cgv = new CGV.Viewer('#my-viewer', {
  height: defaultSize,
  width: defaultSize,
});
cgv.annotation.labelPlacement = 'angled';
loadInputFromID(defaultMap);

// Is the file section visible or not
if (defaultMap === 'file') {
  document.getElementById('file-section').style.display = 'block';
} else {
  document.getElementById('file-section').style.display = 'none';
}
clearFileInput();

///////////////////////////////////////////////////////////////////////////////
// Config
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

// Add maps from maps.js to Select
// Using global variable 'inputs' from inputs.js
const inputSelect = document.getElementById('map-select');
let options = `
  <option value='' disabled ${(defaultMap == '') ? 'selected' : ''}>Select an input...</option>
  <option disabled>────────────────────</option>
  <option value='file' ${(defaultMap == 'file') ? 'selected' : ''}>Open a file...</option>
  <option disabled>────────────────────</option>
`;
for (const input of Object.keys(inputs)) {
  const selected = (input === defaultMap) ? 'selected' : '';
  options += `<option value='${input}' ${selected}>${inputs[input].name}</option>`;
}
inputSelect.innerHTML = options;

// Load map when select changes
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

function clearFileInput() {
  const fileInput = document.getElementById('file-input');
  fileInput.value = '';
}

function clearText() {
  document.getElementById('input-text').innerHTML = "Empty..."
  document.getElementById('output-intermediate').innerHTML = "Empty..."
  document.getElementById('output-json').innerHTML = "Empty..."
  document.getElementById('map-name').innerHTML = 'Empty'
  cgv.io.loadJSON({cgview: {version: "1.6.0", captions: [{name: "Empty", font: "sans-serif,italic,12", fontColor: "grey", position: {lengthPercent: 50, mapOffset: 0}}]}}); // Clear map
}


const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (event) => {
  var file = event.target.files[0];
  if (!file) { return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    const inputTextDiv = document.getElementById('input-text');
    var contents = e.target.result;
    // console.log(contents); // Do something with the file contents
    inputTextDiv.innerHTML = contents;
    testParse();
  };

  reader.onerror = function(e) {
    console.error("File could not be read! Error: " + e.target.error);
  };

  reader.readAsText(file);
});

// Load input method
function loadInputFromID(id) {
  clearText();
  if (id === 'file') { return; }
  if (id === '') { return; }
  const inputTextDiv = document.getElementById('input-text');
  // const intermediateTextDiv = document.getElementById('output-intermediate');
  // const outputTextDiv = document.getElementById('output-json');
  if (!inputs[id]) {
    console.error(`No input with id: ${id}`);
    return
  }
  const url = inputs[id].url
  console.log(`Loading Map: ${url}`);
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  // Speed of steps:
  // - Fastest is going right to map (no innerHTML)
  // - When using innerHTML, it is faster when the sequence is replaced
  // - Prism.highlight is slowest step
  request.onload = function() {
    const inputText = request.responseText;
    // Replace Sequence
    // const viewedInputText = inputText.replace(/(ORIGIN[\s\S]*\/\/)/, 'ORIGIN\n\n\n//');
    // inputTextDiv.innerHTML = viewedInputText;
    inputTextDiv.innerHTML = inputText;
    testParse();
  };
  request.send();
}

///////////////////////////////////////////////////////////////////////////////
// Parse
///////////////////////////////////////////////////////////////////////////////
function testParse() {
  const inputTextDiv = document.getElementById('input-text');
  const intermediateTextDiv = document.getElementById('output-intermediate');
  const outputTextDiv = document.getElementById('output-json');
  const prismMode = document.getElementById('option-prism').checked;
  console.log(prismMode)

  const inputText = inputTextDiv.innerHTML;
  // teselagen parsers
  const tesJSON = CGVParse.genbankToTeselagen(inputText, {inclusive1BasedStart: true, inclusive1BasedEnd: true});
  // console.log(tesJSON);
  // const tesString = JSON.stringify(tesJSON[0].parsedSequence, null, 2);
  const tesString = JSON.stringify(tesJSON, null, 2);
  // Replace Sequence (faster view when sequence is replaced)
  // FIXME: ONLY DOES FIRST SEQUENCE/CONTIG
  const viewedTesString = tesString.replace(/"sequence": ".*"/g, '"sequence": "..."');
  intermediateTextDiv.innerHTML = prismMode ? Prism.highlight(viewedTesString, Prism.languages.json, 'json') : viewedTesString;
  // intermediateTextDiv.innerHTML =  viewedTesString;
  // intermediateTextDiv.innerHTML = tesString;
  // intermediateTextDiv.innerHTML = viewedTesString;

  // CGView parsers
  const cgvParsed = CGVParse.teselagenToCGJson(tesJSON, {config: jsonConfig});
  console.log(cgvParsed);
  const cgvJSON = cgvParsed.json;
  console.log(cgvJSON);
  const cgvString = JSON.stringify(cgvJSON, null, 2);
  // Replace Sequence
  const viewedCgvString = cgvString.replace(/"seq": ".*"/g, '"seq": "..."');
  outputTextDiv.innerHTML = prismMode ? Prism.highlight(viewedCgvString, Prism.languages.json, 'json') : viewedCgvString;

  // MESSAGES
  let messages = "";
  tesJSON.forEach((tes, index) => {
    const status = tes.success ? 'PASS' : 'FAIL';
    messages += `Sequence ${index + 1} [${status}]: ${tes?.parsedSequence?.name}\n`;
  });
  const logDiv = document.getElementById('log-text');
  logDiv.innerHTML = messages;

  // MAP
  cgv.io.loadJSON(cgvJSON);

  const mapName = document.getElementById('map-name');
  mapName.innerHTML = cgv.name;
  // cgv.name = inputs[id].name;
  cgv.draw();
  myResize();
}

///////////////////////////////////////////////////////////////////////////////
// Events
///////////////////////////////////////////////////////////////////////////////
// cgv.on('mousemove', (e) => {
//   // const elements = ['caption', 'legendItem', 'label'];
//   const elements = ['caption', 'legendItem'];
//   if (elements.includes(e.elementType)) {
//     e.element.highlight();
//   }
//   if (e.elementType === 'label') {
//     const label = e.element;
//     label.feature.highlight();
//   }
//   if (e.elementType === 'feature') {
//   }
// });


///////////////////////////////////////////////////////////////////////////////
// OPTIONS
///////////////////////////////////////////////////////////////////////////////
const reloadBtn = document.getElementById('reload-btn');
reloadBtn.addEventListener('click', (e) => {
  console.log("reload")
  testParse();
});
// const prismMode = document.getElementById('option-debug');
// debugMode.addEventListener('click', (e) => {
//   if (e.target.checked) {
//     cgv.debug = true;
//   } else {
//     cgv.debug = false;
//     cgv.canvas.clear('debug');
//   }
//   cgv.draw();
// });

///////////////////////////////////////////////////////////////////////////////
// Full Size Map
///////////////////////////////////////////////////////////////////////////////

function myResize() {
  const mapSection = document.querySelector('.test-map');
  const width = mapSection.offsetWidth - 20;
  console.log(width)
  cgv.resize(width, width);
}
window.addEventListener('resize', myResize)
myResize();


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

// Example: adding openInProksee to a button
// Add to button with id of 'open-in-proksee-btn'
const openInProkseeBtn = document.getElementById('open-in-proksee-btn');
openInProkseeBtn.addEventListener('click', (e) => {
  openInProksee(cgv, 'CGVParse', true)
});