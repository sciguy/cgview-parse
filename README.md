# CGParse

[![npm version](https://img.shields.io/npm/v/cgparse)](https://www.npmjs.com/package/cgparse)
![bundle size](https://img.shields.io/bundlephobia/min/cgparse)
[![jsDelivr hits](https://data.jsdelivr.com/v1/package/npm/cgparse/badge)](https://www.jsdelivr.com/package/npm/cgparse)
![Last Commit](https://img.shields.io/github/last-commit/stothard-group/CGView-Parse.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Docs](https://img.shields.io/badge/docs-available-blue)](https://parse.cgview.ca)

A JavaScript library for parsing biological sequence and feature files (GenBank, EMBL, FASTA, GFF3, BED, etc.) and converting them to CGView-compatible JSON format for genome visualization with [CGView.js](https://js.cgview.ca).

🔗 **[Live Demo & Test Page](https://sciguy.github.io/cgview-parse)**


## Table of Contents

1. [Features](#features)  
2. [Installation](#installation)  

## Features

- **Multi-format support**: GenBank, EMBL, FASTA, RAW, GFF3, GTF, BED, CSV, TSV
- **Two-stage pipeline**: Parse to intermediate JSON → Build to CGView JSON
- **Flexible filtering**: Include/exclude features by type, qualifiers, etc.
- **Robust validation**: Comprehensive error checking and warnings
- **Structured logging**: Built-in logger with levels, icons, and history

## Installation

### Installing from npm
```bash
npm install cgparse
# or
yarn add cgparse
```

### Installing as a script from jsDilvr
```html
<script src="https://cdn.jsdelivr.net/npm/cgview/dist/CGParse.min.js"></script>
<!-- CGParse will be available as a global variable -->
```


## Quick Start

### Sequence Files (GenBank, EMBL, FASTA)

```js
import { SequenceFile, CGViewBuilder } from 'cgparse';

// Parse sequence file
const genbankText = `LOCUS AF177870 3123 bp DNA...`;
const seqFile = new SequenceFile(genbankText);

console.log(seqFile.summary);
// {
//   inputType: 'genbank',
//   sequenceType: 'dna',
//   sequenceCount: 1,
//   featureCount: ??,
//   totalLength: 3123,
//   status: 'success'
// }

// Convert to CGView JSON
const cgvJSON = seqFile.toCGViewJSON({
  featureTypes: { mode: 'exclude', items: ['gene', 'product'] },
  qualifiers: { mode: 'all' },
});
```

### Feature Files (GFF3, BED, GTF)

```js
import { FeatureFile, FeatureBuilder } from 'cgparse';

const gff3Text = `##gff-version 3
chr1	.	gene	1000	2000	.	+	.	ID=gene1;Name=myGene`;

const featureFile = new FeatureFile(gff3Text);
const builder = new FeatureBuilder(featureFile);
const featuresJSON = builder.toJSON();
```

## Workflows

Therea are several ways to convert a sequence file to the CGView JSON format
```js
import { SequenceFile, CGViewBuilder } from 'cgparse';

const genbankText = `LOCUS AF177870 3123 bp DNA...`;
const seqFile = new SequenceFile(genbankText);
// The seqFile is an intermediate JSON format that contains most of the information of the sequence file
// This JSON format can used be used by other programs.
// The intermediate form is converte to CGView JSON with CGView Builder
const builder = new CGParse.CGViewBuilder(seqFile);
const cgviewJSON = builder.toJSON();

// There are also convienence methods
// Convert to CGView JSON directly from the seqFile:
const cgviewJSON = seqFile.toCGViewJSON();

// Or use the sequence string directly in CGVIewBuilder
builder = new CGParse.CGViewBuilder(genbankString);
cgviewJSON = builder.toJSON();
// A seqFile is still created internally and can be accessed with:
builder.seqFile
```

## API Reference

### SequenceFile

Parse biological sequence files and extract sequences, features, and metadata.

```js
const seqFile = new SequenceFile(inputText, {
  addFeatureSequences: false,  // Extract DNA sequences for features
  nameKeys: ['gene', 'locus_tag', 'product'],  // Feature naming priority
  logger: myLogger,
  maxLogCount: 100
});

// Properties
seqFile.records        // Array of parsed sequence records
seqFile.summary        // Parsing summary statistics  
seqFile.inputType      // 'genbank', 'embl', 'fasta', 'raw'
seqFile.sequenceType   // 'dna', 'protein', 'unknown'
seqFile.status         // 'success', 'warnings', 'failed'
seqFile.logger         // Logger instance

// Methods
seqFile.toCGViewJSON(options)  // Convert directly to CGView JSON
```

### CGViewBuilder

Convert parsed sequence data to CGView JSON format with filtering options.

```js
const builder = new CGViewBuilder(seqFile, {
  config: configJSON,              // CGView configuration (see below)
  includeFeatures: true,           // true, false, or array of types
  excludeFeatures: ['gene', 'source'],
  includeQualifiers: ['gene', 'product'],  // true, false, or array
  includeCaption: true
});

const cgvJSON = builder.toJSON();
```

#### Builder Config

The config file are options that are added to the CGView JSON.
They can be any setting availalbe for the following components:
[settings](https://js.cgview.ca/docs.html#s.Settings),
[backbone](https://js.cgview.ca/docs.html#s.Backbone),
[ruler](https://js.cgview.ca/docs.html#s.Ruler),
[dividers](https://js.cgview.ca/docs.html#s.Divider),
[annotation](https://js.cgview.ca/docs.html#s.Annotation),
[sequence](https://js.cgview.ca/docs.html#s.Sequence),
[legend](https://js.cgview.ca/docs.html#s.Legend),
[track](https://js.cgview.ca/docs.html#s.Track)

```js
// Example Config
let configJSON = {
  "settings": {
    "backgroundColor": "white",
    "showShading": true,
    "arrowHeadLength": 0.3
  },
  "ruler": {
    "font": "sans-serif, plain, 10",
    "color": "black"
  },
  "legend": {
    "position": "top-right",
    "defaultFont": "sans-serif, plain, 14",
    "items": [
      {
        "name": "CDS",
        "swatchColor": "rgba(0,0,153,0.5)",
        "decoration": "arrow"
      }
    ]
  },
  "tracks": [
    {
      "name": "CG Content",
      "thicknessRatio": 2,
      "position": "inside",
      "dataType": "plot",
      "dataMethod": "sequence",
      "dataKeys": "gc-content"
    },
    {
      "name": "CG Skew",
      "thicknessRatio": 2,
      "position": "inside",
      "dataType": "plot",
      "dataMethod": "sequence",
      "dataKeys": "gc-skew"
    }
  ]
}


```

### FeatureFile

Parse feature annotation files in various formats.

```js
const featureFile = new FeatureFile(inputText, {
  format: 'auto',  // 'auto', 'gff3', 'bed', 'gtf', 'csv', 'tsv'
  nameKeys: ['Name', 'gene', 'ID'],
  logger: myLogger
});

// Properties
featureFile.records       // Array of parsed feature records
featureFile.inputFormat   // Detected format
featureFile.summary       // Parsing summary
```

### Logger

Structured logging with levels, icons, timestamps, and history.

```js
const logger = new Logger({
  logToConsole: true,
  showTimestamps: true,
  showIcons: true,
  maxLogCount: undefined  // No limit
});

logger.info('Processing started');     // ℹ️ Processing started
logger.warn('Invalid feature found');  // ⚠️ Invalid feature found  
logger.error('Parse failed');          // 🛑 Parse failed

console.log(logger.count);            // Total messages logged
console.log(logger.history());        // Full log history
```

## Examples

### Basic GenBank Parsing

```js
import CGParse from 'cgparse';

const genbank = `
LOCUS       AF177870     3123 bp    DNA     linear   INV 31-OCT-1999
DEFINITION  Reclinomonas americana mitochondrion, partial genome.
FEATURES             Location/Qualifiers
     gene            1..1200
                     /gene="cox1"
                     /product="cytochrome c oxidase subunit I"
ORIGIN      
        1 atgttcgcta ccataaccaa aatgagcagg ctcctattcg
//`;

const seqFile = new CGParse.SequenceFile(genbank);
if (seqFile.passed) {
  const cgvJSON = seqFile.toCGViewJSON();
  console.log('Generated CGView JSON:', cgvJSON);
}
```

### Advanced Feature Filtering

```js
// NEW
const builder = new CGViewBuilder(seqFile, {
  featureTypes: {
    mode: 'exclude',
    items: ['gene', 'source']
  },
  qualifiers: {
    mode: 'exclude',
    items: ['translation']
  }
});
// OLD
const builder = new CGViewBuilder(seqFile, {
  includeFeatures: ['CDS', 'gene', 'tRNA'],  // Only these types
  excludeFeatures: ['source'],               // Skip these
  includeQualifiers: ['gene', 'product', 'note'],
  excludeQualifiers: ['translation']
});

const result = builder.toJSON();
```

### Custom Logging

```js
const logger = new Logger({ 
  logToConsole: false,
  showTimestamps: true 
});

const seqFile = new SequenceFile(input, { logger });

// Extract log messages
const logHistory = logger.history();
console.log('Parsing log:', logHistory);
```

## Error Handling

CGParse provides detailed error reporting and validation:

```js
const seqFile = new SequenceFile(problematicInput);

console.log(seqFile.status);  // 'failed', 'warnings', or 'success'

if (!seqFile.passed) {
  console.log('Errors occurred:');
  seqFile.logger.history().forEach(log => {
    if (log.level === 'error') {
      console.log('-', log.message);
    }
  });
}
```

## File Format Support

| Format | Input Type | Description |
|--------|------------|-------------|
| GenBank | Sequence | NCBI GenBank format (.gb, .gbk) |
| EMBL | Sequence | EMBL/ENA format (.embl) |
| FASTA | Sequence | FASTA sequence format (.fa, .fasta) |
| RAW | Sequence | Plain sequence text |
| GFF3 | Features | Generic Feature Format v3 (.gff3) |
| GTF | Features | Gene Transfer Format (.gtf) |
| BED | Features | Browser Extensible Data (.bed) |
| CSV/TSV | Features | Comma/tab-separated values |

## Browser Usage

```html
<script src="https://unpkg.com/cgparse/dist/cgparse.min.js"></script>
<script>
  const seqFile = new CGParse.SequenceFile(genbankText);
  const cgvJSON = seqFile.toCGViewJSON();
</script>
```

## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Build for distribution
yarn build

# Start development server (NIY)
yarn dev
```

## Resources

- **[CGView.js](https://github.com/stothard-group/cgview-js)** - Circular genome viewer
- **[Proksee](https://proksee.ca)** - Online genome visualization platform
- **[seq_to_json.py](https://github.com/paulstothard/seq_to_json)** - Original Python parser inspiration
- **[EMBL Feature Table](https://www.ebi.ac.uk/ena/WebFeat/)** - Feature format reference


## Citation

If you use CGParse in your research, please cite:

```
Publication in progress...
```