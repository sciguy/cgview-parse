--------------------------------------------------------------------------------
# CGParse.js Changelog
--------------------------------------------------------------------------------

## Unreleased

## v1.0.5 - 2024-10-23
- DNA vs Protein check: include N with DNA
- Fix translation check for -1 strand features with locations

## v1.0.4 - 2024-10-18
- CGViewBuilder.js: Dashes and periods in sequences are replaced by N's
- Compare qualifier translation with translated from the sequence
- Add non-sequence based translations to feature translation property

## v1.0.3 - 2024-10-15
- CSV maxColumns (default 30). Only look at first maxColumns columns. 
- Fix contig names for fasta files (use seqID, not name)

## v1.0.2 - 2024-10-10
- Combine/summarize  line error messages (prevent entire file from printing to log)

## v1.0.1 - 2024-10-08
- Remove "*" and "-" from contig names
- Use only up to the first whitespace for contig names

## v1.0.0 - 2024-10-02
- Initial Release
