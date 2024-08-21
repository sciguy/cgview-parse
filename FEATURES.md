# General Notes about feature conversion
- This can be adapted to a help page on Proksee

# Feature Tool Options
- GFF3/GTF
  - Feature names
  - Inexclude Types: exclude gene, source, exons (same as builder)
  - InExclude Qualifiers: None
  - InExclude Extra attributes as meta data: None
- BED
  - Uses name column if present
  - Option could be to name blank feature "Unknown"
  - Type for these features: Default "CDS"
- CSV
  - Column options (see idea below)
  - InExclude Types: exclude gene, source, exons (same as builder): IF THERE IS A TYPE COLUMN
  - One of the possible columns could be attributes and if so it should follow GFF3 format
    - Then (if present), we can have InExcludes for Qualifiers & Extra Attributes

# Ideas
- We should ignore source from files and use are oen system
- In proksee when processing general CSV/TSV file:
  - Show list of columns (with or without optional header) 
    - A preview of the first couple of lines
  - For each column (could be in horizontal layout or vertical), show:
    - Header name if provided or first line data
    - A select box to choose what column to consider this (e.g. start, stop, name, legend, all other options)
    - Give a first pass try and auto detect the correct columns.

The feature file parser by default will auto detect the file type. The user can also force a format.

GFF3 Files:
- features with the same "ID" will be joined into a single feature using an array of locations for the position

1 seqid
2 source
3 type
4 start
5 stop
6 core
7 strand
8 phase
9 attributes

GTF
- joining features
- start/stop codons

1 seqname
2 source
3 type
4 start
5 stop
6 score
7 strand
8 frame
9 attributes: Required: gene_id, transcript_id

BED
- Bed is a 0-based format
- for now let's just accept tab deliminated bed files 
  - perhaps unless, they specifiy it's bed then try harder
- We won't be extremely strict
  - score can be any number (NOT 0-1000, NOT Integer)
1  chrom
2  chromStart
3  chromEnd
4  name
5  score
6  strand
7  thickStart
8  thickEnd
9  itemRgb
10 blockCount
11 blockSizes
12 blockStarts

Comments:
- Comment line starting with '#' are ignored
- Comments at the end of line are also ignored/removed
  - i.e. whitespace followed by '#' and any text will be removed.