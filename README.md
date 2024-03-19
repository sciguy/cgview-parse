# CGView Parse
Parser for converting sequence files to CGView JSON via an Teselagen intermediate JSON format.

# Resources
- Web interface for EMBL/GenBank Features and Qualifiers
  https://www.ebi.ac.uk/ena/WebFeat/
- ENA (European Nucleotide Archive) source for EMBL files
  https://www.ebi.ac.uk/ena/browser/view/CP027060

# Test Page
The testing html page can open predefeind sequence files as well as use a file chooser to open custom files. The test page consists of
- the input file
- the intermediate Sequence Record JSON
- optional (for testing) teselagen JSON
- the final CGView JSON
- the CGView Map created from the JSON
- a log of output messages
- an Open in Proksee button

# TODO
- Proksee
  - if there are warning the log button should have a warning logo in or beside button
  - Same with errors (except the log will also automatically open)
- Proksee Parse Options (This should be part of the tool and tool.yaml)
  - Beside the Log button there should be an "Options" button which rbings up import options:
    - Note: some options coudl be saved as cookies
    - Import Sequence (useful to turn off on large files)
    - Import Qualifers
      - When yes, allow all or choice of qualifers
      - The list could come from the file itself
    - Feature name from qualifier options
      - Note: qualifiers don't have to be imported for them to be use for name
      - List of qualifer tags in order of preference
      - User can change order, remove/add tags
    - Full log (by default only show the first ~5 warnings/errors for the same type)
- Warning/Error should occur if certain qualifiers have more than one:
  - locus_tag, start_codon
- Need status/success of cgview conversion
- Sort Errors vs Warnings
- add options (SeqFile and ToJson) to logger output 
- better binary check see example proksee5.txt
- add name to CGView JSON summary
- add optional "title" caption from config
- Read over cgview_builder.rb script
- Have ability to return a results object with the JSON, summary, stats and log

# Tests
- Add file tests
  - have directory of input files one for good other for bad
  - use fs.readFileSync to read in a file
  - use SeqRecToCGVJSON to convert the file
  - see if they pass or fail


# Teselagen
- [Teselagene](https://github.com/TeselaGen/tg-oss/tree/master)
- [bio-parsers](https://github.com/TeselaGen/tg-oss/tree/master/packages/bio-parsers)


# Bulding
```bash
yarn build
```


# NEXT
- go over cgview_builder.rb and copy important stuff

# Eventually
- feature (or antything) name search box
  - Moves to first occurance of feature in both genbank and json so you can see side by side
- summary below input and json of number of features
  - option to include breakdown of feature by type!!
- Would it be possible to click on a feature in input/output and see it highlighted in other file

# Proksee Integration
- need to save input file and log (js output)
  - where are they saved?
  - how to also save failed inputs (and logs)

# Notes
rollup version being used for cgview: rollup v2.51.1

# Code Layout 

CGParse.
cgp = new CGParse(inputText)
cgp.toJSON aliad to toCGVJSON
cgp.log or cgp.toLog return log object
cgp.toSeqJSON
cgp.toTesJSON

CGParse.seqToJSON(inputText)
-> {json: {cgview: {}}, log: logObject, status/success: bool}

Testing
cgp = new CGParse()
cgp.getSeqName(input)
