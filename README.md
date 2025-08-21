# CGParse.js

[![Pages Status](https://github.com/sciguy/cgview-parse/actions/workflows/pages.yml/badge.svg)](https://github.com/sciguy/cgview-parse/actions/workflows/pages.yml)
[![Tests Status](https://github.com/sciguy/cgview-parse/actions/workflows/tests.yml/badge.svg)](https://github.com/sciguy/cgview-parse/actions/workflows/tests.yml)
[![npm version](https://img.shields.io/npm/v/cgparse)](https://www.npmjs.com/package/cgparse)
![bundle size](https://img.shields.io/bundlephobia/min/cgparse)
[![jsDelivr hits](https://data.jsdelivr.com/v1/package/npm/cgparse/badge)](https://www.jsdelivr.com/package/npm/cgparse)
![Last Commit](https://img.shields.io/github/last-commit/sciguy/CGView-Parse.svg)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

CGParse.js is a lightweight JavaScript library for parsing biological sequence and feature files (GenBank, EMBL, FASTA, GFF3, BED, etc.). It converts these files into CGView-compatible JSON, making them ready for visualization with [CGView.js](https://js.cgview.ca).

🔗 **[Live Demo & Test Page](https://parse.cgview.ca)**


## Table of Contents
- [CGParse.js](#cgparsejs)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Installing from npm](#installing-from-npm)
    - [Installing as a script from jsDelivr](#installing-as-a-script-from-jsdelivr)
  - [Quick Start](#quick-start)
    - [Create CGView JSON from a sequence file (e.g. GenBank, EMBL, FASTA)](#create-cgview-json-from-a-sequence-file-eg-genbank-embl-fasta)
    - [Create CGView Features from a feature file (e.g. CSV, GFF3, GTF, BED)](#create-cgview-features-from-a-feature-file-eg-csv-gff3-gtf-bed)
    - [CGViewBuilder Options](#cgviewbuilder-options)
      - [Including/Excluding Feature Types and Qualifiers](#includingexcluding-feature-types-and-qualifiers)
      - [CGViewBuilder Config](#cgviewbuilder-config)
  - [Intermediate Sequence and Feature JSON formats](#intermediate-sequence-and-feature-json-formats)
    - [Sequence Files (GenBank, EMBL, FASTA)](#sequence-files-genbank-embl-fasta)
    - [Feature Files (GFF3, BED, GTF)](#feature-files-gff3-bed-gtf)
  - [Logger](#logger)
  - [Live Test Page](#live-test-page)
  - [Development](#development)
  - [Resources](#resources)

## Installation

CGParse has no dependencies. Install it from npm or load it directly via jsDelivr.

### Installing from npm
```bash
npm install cgparse
# or
yarn add cgparse
```

### Installing as a script from jsDelivr
```html
<script src="https://cdn.jsdelivr.net/npm/cgparse/dist/CGParse.min.js"></script>
<!-- CGParse will be available as a global variable -->
```


## Quick Start

### Create CGView JSON from a sequence file (e.g. GenBank, EMBL, FASTA)

```js
import * as CGParse from 'cgparse'

// Create a string for the sequence file (e.g GenBank)
const seqString = `LOCUS AF177870 3123 bp DNA...`;
// Create a new CGView builder for the sequence
const cgvBuilder = new CGParse.CGViewBuilder(seqString);
// Convert to CGView JSON
const cgviewJSON = cgvBuilder.toJSON();

// The JSON can then be loaded into a previously created CGView instance
cgv.io.loadJSON(cgviewJSON);
```

### Create CGView Features from a feature file (e.g. CSV, GFF3, GTF, BED)

```js
import * as CGParse from 'cgparse'

// Create a string for the feature file (e.g GFF3)
const gff3String = `##gff-version 3
chr1	.	gene	1000	2000	.	+	.	ID=gene1;Name=myGene`;
// Create a new feature builder for the features
const featureBuilder = new CGParse.FeatureBuilder(gff3String);
// Convert to an array of CGView features
const features = featureBuilder.toJSON();

// The features can then be added to a previously created CGView instance
cgv.addFeatures(features);
```

### CGViewBuilder Options

```js
const builder = new CGViewBuilder(seqString, {
  // CGView configuration (see below for example)
  config: configJSON, 
  // The order of preference for the naming of a feature [Default shown]
  // The name for a feature will be taken from the first feature qualifier
  // in the list that has a value.
  // TODO: CONFIRM
  nameKeys: ['gene', 'locus_tag', 'product', 'note', 'db_xref'],
  // Feature types to exclude (see below for details on including/excluding features)
  excludeFeatures: ['gene', 'source', 'exon'],
  // Qualifiers types to exclude (see below for details on including/excluding features)
  excludeQualifiers: ['translation'],
});
```

#### Including/Excluding Feature Types and Qualifiers


When building from a GenBank or EMBL file, you can choose which features types (e.g. CDS, gene, rRNA) and qualifiers (e.g. product, note, locus_tag) to include or exclude. The default is to include all features and all their qualifiers. 

```js
// Include all features and their qualifiers [Default]
const builder = new CGViewBuilder(seqString, {
  includeFeatures: true,    // [Default]
  includeQualifiers: true   // [Default]
})

// Include no features
const builder = new CGViewBuilder(seqString, {
  includeFeatures: false,
  includeQualifiers: false  // [Not required, since there will not be any features]
})

// Include only specific features and their qualifiers
const builder = new CGViewBuilder(seqString, {
  includeFeatures: ['CDS', 'rRNA'],
  includeQualifiers: ['product', 'note', 'locus_tag']
})

// Exclude a subset of features and their qualifiers
// Recommended settings for bacterial genomes
const builder = new CGViewBuilder(seqString, {
  excludeFeatures: ['source', 'gene', 'exon'],
  excludeQualifiers: ['translation']
})
```

For list of qualifiers and feature types see the following resources:
- [Qualifiers List from INSDC](https://www.insdc.org/submitting-standards/feature-table/#7.3.1)
- [Qualifiers Local List](./docs/reference/qualifiers.txt)
- [Feature Types List from INSDC](https://www.insdc.org/submitting-standards/feature-table/#7.2)
- [Feature Types Local List](./docs/reference/feature_types.txt)



#### CGViewBuilder Config

A config object can be provided to CGViewBuilder. The config is a JSON object with options that are added to the CGView JSON.
They can be any setting available for the following components:
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
  ],
  captions: [
    {
      // For name you can provide static text or use special keywords to get dynamic text
      name: "my map",         // Shows 'my map' as the caption
      // name: "DEFINITION",  // Shows the sequence definition (e.g. Escherichia coli str. K-12 substr. MG1655, complete genome.)
      // name: "ID",          // Shows the sequence accession/version (e.g. NC_000913.3)
      position: "bottom-center",
    },
  ]
}
```

## Intermediate Sequence and Feature JSON formats

Internally CGViewBuilder and FeatureBuilder are first taking the input file and converting it to an intermediate JSON format that contains most of the data from the input file. This intermediate format could be used by other projects.

### Sequence Files (GenBank, EMBL, FASTA)

```js
import * as CGParse from 'cgparse';

// Parse sequence file (e.g. GenBank Accession CP021212.1)
const genbankText = `LOCUS AF177870 3123 bp DNA...`;
const seqFile = new CGParse.SequenceFile(genbankText);

seqFile.summary;
// =>
// {
//   inputType: 'genbank',
//   sequenceType: 'dna',
//   sequenceCount: 1,
//   featureCount: 12,
//   totalLength: 3123,
//   status: 'success'
// }

seqFile.records;
// truncated for clarity
// =>
// [
//   {
//     "inputType": "genbank",
//     "name": "AF177870",
//     "seqID": "AF177870.1",
//     "definition": "Escherichia coli B171 plasmid pB171_90, complete sequence.",
//     "length": 90229,
//     "topology": "circular",
//     "comments": "##Genome-Assembly-Data-START##\nAssembly Date...",
//     "sequence": "...",
//     "features": [
//       {
//         "type": "source",
//         "strand": 1,
//         "locationText": "1..90229",
//         "locations": [[1,90229]],
//         "start": 1,
//         "stop": 90229,
//         "qualifiers": {
//           "organism": "Escherichia coli B171",
//           "mol_type": "genomic DNA",
//           "strain": "B171",
//           "db_xref": "taxon:344601",
//           "plasmid": "pB171_90"
//         },
//         "name": "taxon:344601"
//       },
//       ...
//     ]
//   },
//   ...
// ]

// The sequence file can be directly converted to CGView JSON
const cgvJSON = seqFile.toCGViewJSON();
// Or passed to the builder
const builder = new CGParse.CGViewBuilder(seqFile);
const cgvJSON = builder.toJSON();
```

### Feature Files (GFF3, BED, GTF)

```js
import * as CGParse from 'cgparse';

const gff3Text = `##gff-version 3
chr1	.	gene	1000	2000	.	+	.	ID=gene1;Name=myGene`;

const featureFile = new CGParse.FeatureFile(gff3Text);

// TODO: EXAMPLE

// The feature file can be directly converted to CGView features array
const cgvFeatures = featureFile.toCGViewFeaturesJSON()
// Or passed to the builder
const builder = new CGParse.FeatureBuilder(featureFile);
const featuresJSON = builder.toJSON();
```


## Logger

The main classes (CGViewBuilder, SequenceFile, FeatureFile, and FeatureBuilder) contain a custom Logger with levels, icons, timestamps, and history. The logger can be access via the `logger` property on any instance.

The Logger can also be used on its own:

```js
const logger = new CGParse.Logger({
  logToConsole: true,
  showTimestamps: true,
  showIcons: true,
  maxLogCount: undefined  // No limit
});

logger.info('Processing started');     // ℹ️ Processing started
logger.warn('Invalid feature found');  // ⚠️ Invalid feature found  
logger.error('Parse failed');          // 🛑 Parse failed

console.log(logger.count);            // Total messages logged
console.log(logger.history());        // Full log history as a string
```


## Live Test Page

🔗 **[Live Demo & Test Page](https://parse.cgview.ca)**

The test page lets you upload or choose example files, view intermediate JSON, final CGView JSON, rendered maps, log output, and open results in Proksee.


## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Build for distribution
yarn build
```


## Resources

- **[CGView.js](https://github.com/stothard-group/cgview-js)** - Circular genome viewer
- **[Proksee](https://proksee.ca)** - Online genome visualization platform
- **[seq_to_json.py](https://github.com/paulstothard/seq_to_json)** - Paul Stothard's sequence file Python parser
- **[EMBL Feature Table](https://www.ebi.ac.uk/ena/WebFeat/)** - Feature format reference

