# CGView Parse
Parser for converting sequence files to CGView JSON via an Teselagen intermediate JSON format.

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
- qualifiers without values still have a "/" at the beginning of their name
- add genbank/embl/fasta definition line

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
