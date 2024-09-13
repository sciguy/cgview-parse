# CGParse

CGParse consists of file parsers and builders to take sequence or feature files and convert them to CGView JSON or features that can be added to CGView JSON. The parsers (SequenceFile.js and FeatureFile.js) create an intermediate JSON format with all the data possible to extract. This intermediate JSON data can be used by other programs or converted to CGView JSON data via the builders (CGViewBuilder.js and CGFeatureBuilder.js). When building CGView data, options can be provied to filter the data (e.g. qualifiers).

[CGParse Test Page](https://stothard-group.github.io/cgview-parse)

### Sequence File Overview

```
                SequenceFile.js               CGViewBuilder.js
          Input --------------> Sequence JSON ---------------> CGView.json
(GenBank, EMBL, FASTA)        [Sequence Records]
```

### Feature File Overview

```
                  FeatureFile.js              FeatureBuilder.js
            Input -------------> Feature JSON ----------------> features.cgv.json
(GFF3, GTF, BED, CSV, TSV)    [Feature Records]
```



This package consists of 3 main components:
- SequenceFile.js
- CGViewBuilder.js
- Logger.js: 

# Usage

# Notes:
- feature keys: ~53
- qualifiers: ~103

## SequenceFile
Parser for converting sequence files (e.g. GenBank, EMBL, FASTA) to CGView JSON via our own intermediate SequenceFile JSON format. The SequenceFile parser is based on Paul's [seq_to_json.py](https://github.com/paulstothard/seq_to_json) parser.


```js
// inputText: text from a GenBank, EMBL, FASTA, or RAW file
// Options:
// - addFeatureSequences: boolean [Default: false]. This can increase run time ~3x.
// - logger: logger object (undefined uses a new logger) [Default: undefined]
// - maxLogCount: number (undefined means no limit) [Default: undefined]
seqFile = new CGParse.SequenceFile(inputText, options);

// -----------------
// Helpful methods:

// Get sequence record JSON array
seFile.records

// Convert to CGView JSON directly from the SequenceFile
seqFile.toCGViewJSON()

// Return a summary object of the parsing with the following keys:
// inputType, sequenceType, sequenceCount, featureCount, totalLength, status, success
seqFile.summary

// Return status of parsing: success, failed
seqFile.status

// Return success boolean: true or false
seqFile.success 

// Get the logger
seqFile.logger
```


## CGViewBuilder
```js
// input:
// - SequenceFile or string of sequence file (e.g. GenBank, FASTA) that can be converted to SequenceFile
// options:
// - config: jsonConfig
// - skipTypes: boolean [Default: ['gene', 'source', 'exon']]
//   - If false, include ALL feature types in the JSON
// - includeQualifiers: boolean [Default: false]
//   - If true, include ALL qualifiers in the JSON
//   - If array of strings, include only those qualifiers
//   - If false, include NO qualifiers
// - includeCaption: boolean [Defualt: true]
//   - NOTE: captions could come from the config (like I did for cgview_builder.rb)
// - skipComplexLocations: boolean (not implemented yet) [Defualt: true]
//   - need to decide how to handle these
// - maxLogCount: number (undefined means no limit) [Default: undefined]
builder = new CGParse.CGViewBuilder(input, options);

// Examples
genbankString = "LOCUS...";

// Via SequenceFile
seqFile = new CGParse.SequenceFile(inputText, options);
builder = new CGParse.CGViewBuilder(seqFile);
cgviewJSON = builder.toJSON();

// Use genbankString directly
builder = new CGParse.CGViewBuilder(genbankString);
cgviewJSON = builder.toJSON();
// A seqFile is still created internally and can be accessed with:
builder.seqFile


// -----------------
// Helpful methods:

// Return status of parsing: success, failed, warnings
builder.status

// Return success boolean: true or false
builder.success 

// Get the logger
builder.logger
```

## Logger
The logger logs, info, warnings, errors to the console and to a histoy that can be extracted later. Log messages can have timestamps and icons (e.g. ️🛑)

``` js
// Options:
// - logToConsole [Default: true]: log to console
// - showTimestamps [Default: true]: Add time stamps
// - showIcons: Add level as icon: warn, info, etc
// - maxLogCount: Maximum number of similar log messages to keep
// Log Levels: log, info, warn, error
// Log messages can be a simgle message or an array of messages
// - When an array of messages is provided, if the count is more than maxLogCount
//   then only the first maxLogCount messages are shown.

logger = new Logger(options)

// -----------------
// Helpful methods:

// Log some messages
logger.info("My very useful message")
logger.warn("Be warned")
logger.error("Well, that didn't work")

// How many messages have been logged
logger.count

// Log a message break. This will appear in the history
// Default is "\n" to add a blank line
logger.break("-------")


// Get the entire log history
logger.history()

// Log Icons:
// - log:     '📝'
// - info:    'ℹ️'
// - warn:    '⚠️'
// - error:   '🛑'
// - success: '✅'
// - fail:    '🛑'
// - none:    ' '
```


# Building
```bash
yarn build
// Built files can be found in `docs/dist`
```

# Testing
```bash
// Run tests
yarn test
```
## Live Test Page
[Test Page](https://stothard-group.github.io/cgview-parse/test/)
The testing html page can open predefined sequence files as well as use a file chooser to open custom files. The test page consists of
- the input file
- the intermediate Sequence Record JSON
- the final CGView JSON
- the CGView Map created from the JSON
- a log of output messages
- an Open in Proksee button

### Eventually (Ideas for the Test Page)
- feature (or antything) name search box
  - Moves to first occurance of feature in both genbank and json so you can see side by side
- Would it be possible to click on a feature in input/output and see it highlighted in other file


# TODO
- Warning/Error should occur if certain qualifiers have more than one:
  - locus_tag, start_codon
- Sort Errors vs Warnings
- Have ability to return a results object with the JSON, summary, stats and log
- Add file tests
  - have directory of input files one for good other for bad
  - use fs.readFileSync to read in a file
  - use CGViewBuilder to convert the file
  - see if they pass or fail

# Features TODO (Next)
- Like SequenceFile, we will have FeatureFile to parse different file types into a common one
- FeatureFile should be able to do the conversion easy enough to CGView features JSON
- For the input types, we should have a delegate import type for each file type:
  - Simple CSV/TSV format (like the current Proksee feature tool format)
  - BED
  - GFF3
  - GTF
  - GFF?? (Version 2)
  - VCF?
- We should allow location arrays for the features (even though they don't work yet)

# Resources
- Paul's Python Sequence Parser
  - https://github.com/paulstothard/seq_to_json
- Web interface for EMBL/GenBank Features and Qualifiers
  - https://www.ebi.ac.uk/ena/WebFeat/
- ENA (European Nucleotide Archive) source for EMBL files
  - https://www.ebi.ac.uk/ena/browser/view/CP027060
- Teselagen
  - [Teselagene](https://github.com/TeselaGen/tg-oss/tree/master)
  - [bio-parsers](https://github.com/TeselaGen/tg-oss/tree/master/packages/bio-parsers)

# Notes
Rollup version being used for cgview: rollup v2.51.1