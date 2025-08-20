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

CGParse.js has no dependencies. Simply install from npm or jsDelivr.

### Installing from npm
```bash
npm install cgparse
# or
yarn add cgparse
```

### Installing as a script from jsDelivr
```html
<script src="https://cdn.jsdelivr.net/npm/cgview/dist/CGParse.min.js"></script>
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

// The json can then be loaded into a previously created CGView instance
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
  // FIXME: (should be part of config)
  includeCaption: true,
  // Feature types to include/exclude (see below for options)
  features: { exclude: ['gene', 'source', 'exon'] }, // Default
  // Qulaifers to include/exclude (see below for options)
  qualifiers: { exclude: ['translation'] }, // Default

  // Feature types to include:
  // - true (all) [Default]
  // - false (none)
  // - array of types
  includeFeatures: true,
  // Feature types to exclude [Default: ['gene', 'source', 'exon']]. Ignored unless includeFeatures is true
  excludeFeatures: ['gene', 'source', 'exon'],
  // Qualifiers to include:
  // - true (all) [Default]
  // - false (none)
  // - array of qualifiers
  includeQualifiers: true,
  // Qualifiers to exclude [Default: ['translation']]. Ignored unless includeQualifiers is true
  excludeQualifiers: ['translation'],
});




const cgvJSON = builder.toJSON();
```

#### Including/Excluding Feature Types and Qualifers

When building from a GenBank or EMBL file, you can choose which features types (e.g. CDS, gene, rRNA) and qualifiers (e.g. product, note, locus_tag) to include or exclude.

For the `features` and `qualifiers` arguments, the following options are possible:
```js
// Showing examples for features (the same applies for qualifiers)
// - 'all':                        include all feature types (default)
// - 'none':                       include no feature types
// - { include: ['CDS', 'rRNA'] }: include only the listed feature types
// - { exclude: ['gene'] }:        include all feature types except those listed
```

For list of qualifiers and feature types see the following resources:

Qualifiers:
- [List from INSDC](https://www.insdc.org/submitting-standards/feature-table/#7.3.1)
- [Local List](./docs/reference/qualifiers.txt)

Features Types/Keys:
- [List from INSDC](https://www.insdc.org/submitting-standards/feature-table/#7.2)
- [Local List](./docs/reference/feature_types.txt)


> [!Note]
> Why not just always include all the features and qualifiers? This may make sense for smaller genomes/plasmids but for larger genomes, saving all this data in the JSON may slow performance. Other reasons to exclude some feautres and qualifiers:
> - Typically there is no need to include the translation with the feature as they can be extracted directly from the sequence. In fact, the builder, check the AA sequence for each CDS feature and will automatically store the translation if it's different than the direct translation. We recommend instead of using `all` for qualifiers to use `exclude: ['translations'] instead.
> - For bacterial genomes, there is typically no need to add the gene and CDS features as they will appear at the same position on the map and the CDS features contain more information


#### CGViewBuilder Config

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

## Intermediate Sequence/Feature JSON formats

Internally CGViewBuilder and FeatureBuilder are first taking the input file and converting it to an intermediate JSON format that contains most of the data from the input file. This intermediate format could be used by other projects.

### Sequence Files (GenBank, EMBL, FASTA)

```js
import * as CGParse from 'cgparse';

// Parse sequence file
// TODO: give accession number
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


## Live Test Page

🔗 **[Live Demo & Test Page](https://sciguy.github.io/cgview-parse)**

This test page allows you to see how the example sequence/feature files are converted to there intermediate formats and the final format used by CGView.js. You can also test your own files and see how they are converted.



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
---

- Features
- Intermediate forms
- Logger

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

console.log(seqFile.records)

// [
//   {
//     "inputType": "genbank",
//     "name": "CP021212",
//     "seqID": "CP021212.1",
//     "definition": "Escherichia coli B171 plasmid pB171_90, complete sequence.",
//     "length": 90229,
//     "topology": "circular",
//     "comments": "##Genome-Assembly-Data-START##\nAssembly Date          :: 2016\nAssembly Method        :: Canu v. 1.2\nExpected Final Version :: no\nGenome Coverage        :: 13.4x\nSequencing Technology  :: PacBio\n##Genome-Assembly-Data-END##",
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


---

# OLD
```js
const builder = new CGViewBuilder(seqString, {
  config: configJSON,                        // CGView configuration (see below)
  includeCaption: true,                      // FIXME: (should be part of config)
  features: { exclude: ['gene', 'source'] }, // Feature types to include/exclude
  qualifiers: 'none',                        // Qualifiers to include/exclude


  feature: {
    mode: 'exclude',            // one of: include, exclude, all, none
    items: ['gene', 'source']   // feature types to include or exclude (ignored if mode is all or none)
  },
  qualifiers: {
    mode: 'include',            // one of: include, exclude, all, none
    items: ['gene', 'product']  // qualifiers to include or exclude (ignored if mode is all or none)
  }
});

const cgvJSON = builder.toJSON();
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


### CGViewBuilder Options

```js
const builder = new CGViewBuilder(seqString, {
  // CGView configuration (see below for example)
  config: configJSON, 
  // FIXME: (should be part of config)
  includeCaption: true,
  // Feature types to include/exclude (see below for options)
  features: { exclude: ['gene', 'source', 'exon'] }, // Default
  // Qulaifers to include/exclude (see below for options)
  qualifiers: { exclude: ['translation'] } // Default
});

const cgvJSON = builder.toJSON();
```

#### Including/Excluding Feature Types and Qualifers

When building from a GenBank or EMBL file, you can choose which features types (e.g. CDS, gene, rRNA) and qualifiers (e.g. product, note, locus_tag) to include or exclude.

For the `features` and `qualifiers` arguments, the following options are possible:
```js
// Showing examples for features (the same applies for qualifiers)
// - 'all':                        include all feature types (default)
// - 'none':                       include no feature types
// - { include: ['CDS', 'rRNA'] }: include only the listed feature types
// - { exclude: ['gene'] }:        include all feature types except those listed
```