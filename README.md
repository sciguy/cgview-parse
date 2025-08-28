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

CGParse.js has no dependencies. Install it from npm or load it directly via jsDelivr.

### Installing from npm
```bash
npm install cgparse
# or
yarn add cgparse
```

### Installing as a script from jsDelivr
```html
<script src="https://cdn.jsdelivr.net/npm/cgparse/dist/cgparse.min.js"></script>
<!-- CGParse will be available as a global variable -->
```


## Quick Start

### Create CGView JSON from a sequence file (e.g. GenBank, EMBL, FASTA)

```js
import * as CGParse from 'cgparse'

// Create a string for the sequence file.
// The sequence string can be in GenBank, EMBL or FASTA format.
// Here we show a FASTA example for brevity.
const seqString = `>Sequence_Example
atgtccgacccaccggtcgaaaaaacaagtccagagaagacagagggctcttcatccggcagttttcgcgtcccactcgaatccgacaagcttggtgacccggatttcaagccatgcgtt
gcacaaatcacaatggagagaaacgcagtgttcgaggacaacttcctcgatcggagacagagtgctcgcgccgtaatcgagtattgctttgaggacgaaatgcaaaacttggttgaaggg
cgacctgctgtttcagaagaaccagttgttcccatacgattccgacgcccaccaccgtccggacctgctcacgacgtctttggcgacgccatgaacgaaattttccagaaattaatgatg
aaaggtcaatgcgcagacttctgccactggatggcttattggctaacaaaggaacaagatgatgcgaatgatggattttttggcaatattcgctataatccagatgtctatgtcacggaa
ggcacaacagaaaccaaaaaggcgttcgtcgacagcatgtggccgactgctcagcgaattcttctgaaatccgtccggaacagcacgattttacgcacaaagtggactggaatccacgtg
tcagcggatcagttgaaggggcaacgcccgaagcaagaagatagattcgtagcttatccgaatagtcagtatatgaatcggacgcaggatcccgtcgcccttctcggtgtgttcgatggt
catggcggacacgagtgctcacaatacgcggcctctcacttctgggaggcatggctggagactcgacaaactagcgacggtgatgagctccagaatcagctgaagaagtcacttgagttg
ttggatcaacgattgacagtcagaagtgtgaaggaatactggaagggtggcactacggcggcgtgttgcgctatcgataaggagaacaaaacgatggcgttcgcgtggttgggcgattca
ccaggatacgtcatgaacaacatggaattccgcaaagtga`;

// Create a new CGView builder for the sequence
const cgvBuilder = new CGParse.CGViewBuilder(seqString);

// Convert to CGView JSON
const cgviewJSON = cgvBuilder.toJSON();

// The JSON can then be loaded into a previously created CGView.js instance
cgv.io.loadJSON(cgviewJSON);
```

[Details on the  CGView JSON format](https://js.cgview.ca/json)

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
const builder = new CGParse.CGViewBuilder(seqString, {
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
const builder = new CGParse.CGViewBuilder(seqString, {
  includeFeatures: true,    // [Default]
  includeQualifiers: true   // [Default]
})

// Include no features
const builder = new CGParse.CGViewBuilder(seqString, {
  includeFeatures: false,
  includeQualifiers: false  // [Not required, since there will not be any features]
})

// Include only specific features and their qualifiers
const builder = new CGParse.CGViewBuilder(seqString, {
  includeFeatures: ['CDS', 'rRNA'],
  includeQualifiers: ['product', 'note', 'locus_tag']
})

// Exclude a subset of features and their qualifiers
// Recommended settings for bacterial genomes
const builder = new CGParse.CGViewBuilder(seqString, {
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

A config object can be provided to CGViewBuilder.
The config is a JSON object with options that are added to the [CGView JSON](https://js.cgview.ca/json.html).
They can be any settings available for the following components:
[settings](https://js.cgview.ca/docs.html#s.Settings),
[backbone](https://js.cgview.ca/docs.html#s.Backbone),
[ruler](https://js.cgview.ca/docs.html#s.Ruler),
[dividers](https://js.cgview.ca/docs.html#s.Divider),
[annotation](https://js.cgview.ca/docs.html#s.Annotation),
[sequence](https://js.cgview.ca/docs.html#s.Sequence),
[legend](https://js.cgview.ca/docs.html#s.Legend),
[track](https://js.cgview.ca/docs.html#s.Track),
[captions](https://js.cgview.ca/docs.html#s.Caption)

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

// Parse sequence file (e.g. GenBank Accession AF177870.1)
// Showing truncated GenBank text here (full GenBank text below)
const genbankText = `LOCUS AF177870 3123 bp DNA...`;
```

<details>
  <summary>Full GenBank - AF177870.1</summary>
  <pre>
LOCUS       AF177870                3123 bp    DNA     linear   INV 30-MAR-2006
DEFINITION  Caenorhabditis sp. CB5161 putative PP2C protein phosphatase FEM-2
            (fem-2) gene, complete cds.
ACCESSION   AF177870
VERSION     AF177870.1
KEYWORDS    .
SOURCE      Caenorhabditis brenneri
  ORGANISM  Caenorhabditis brenneri
            Eukaryota; Metazoa; Ecdysozoa; Nematoda; Chromadorea; Rhabditida;
            Rhabditina; Rhabditomorpha; Rhabditoidea; Rhabditidae; Peloderinae;
            Caenorhabditis.
REFERENCE   1  (bases 1 to 3123)
  AUTHORS   Stothard,P., Hansen,D. and Pilgrim,D.
  TITLE     Evolution of the PP2C family in Caenorhabditis: rapid divergence of
            the sex-determining protein FEM-2
  JOURNAL   J. Mol. Evol. 54 (2), 267-282 (2002)
   PUBMED   11821919
REFERENCE   2  (bases 1 to 3123)
  AUTHORS   Stothard,P. and Pilgrim,D.
  TITLE     Conspecific and interspecific interactions between the FEM-2 and
            the FEM-3 sex-determining proteins despite rapid sequence
            divergence
  JOURNAL   J. Mol. Evol. 62 (3), 281-291 (2006)
   PUBMED   16477523
REFERENCE   3  (bases 1 to 3123)
  AUTHORS   Stothard,P.M., Hansen,D. and Pilgrim,D.
  TITLE     Direct Submission
  JOURNAL   Submitted (17-AUG-1999) Biological Sciences, University of Alberta,
            Edmonton, AB T6G-2E9, Canada
FEATURES             Location/Qualifiers
     source          1..3123
                     /organism="Caenorhabditis brenneri"
                     /mol_type="genomic DNA"
                     /strain="CB5161"
                     /db_xref="taxon:135651"
     gene            <265..>2855
                     /gene="fem-2"
     mRNA            join(<265..402,673..781,911..1007,1088..1215,1377..1573,
                     1866..2146,2306..2634,2683..>2855)
                     /gene="fem-2"
                     /product="putative FEM-2 protein phosphatase type 2C"
     CDS             join(265..402,673..781,911..1007,1088..1215,1377..1573,
                     1866..2146,2306..2634,2683..2855)
                     /gene="fem-2"
                     /note="possible sex-determining protein"
                     /codon_start=1
                     /product="putative PP2C protein phosphatase FEM-2"
                     /protein_id="AAF04557.1"
                     /translation="MSDSLNHPSSSTVHADDGFEPPTSPEDNNKKPSLEQIKQEREAL
                     FTDLFADRRRSARSVIEEAFQNELMSAEPVQPNVPNPHSIPIRFRHQPVAGPAHDVFG
                     DAVHSIFQKIMSRGVNADYSHWMSYWIALGIDKKTQMNYHMKPFCKDTYATEGSLEAK
                     QTFTDKIRSAVEEIIWKSAEYCDILSEKWTGIHVSADQLKGQRNKQEDRFVAYPNGQY
                     MNRGQSDISLLAVFDGHGGHECSQYAAAHFWEAWSDAQHHHSQDMKLDELLEKALETL
                     DERMTVRSVRESWKGGTTAVCCAVDLNTNQIAFAWLGDSPGYIMSNLEFRKFTTEHSP
                     SDPEECRRVEEVGGQIFVIGGELRVNGVLNLTRALGDVPGRPMISNKPDTLLKTIEPA
                     DYLVLLACDGISDVFNTSDLYNLVQAFVNEYDVEDYHELARYICNQAVSAGSADNVTV
                     VIGFLRPPEDVWRVMKTDSDDEESELEEEDDNE"
ORIGIN      
        1 gaacgcgaat gcctctctct ctttcgatgg gtatgccaat tgtccacatt cactcgtgtt
       61 gcctcctctt tgccaacacg caagacacca gaaacgcgtc aaccaaagag aaaaagacgc
      121 cgacaacggg cagcactcgc gagagacaaa ggttatcgcg ttgtgttatt atacattcgc
      181 atccgggtca actttagtcc gttgaacatg cttcttgaaa acctagttct cttaaaataa
      241 cgttttagaa gttttggtct tcagatgtct gattcgctaa atcatccatc gagttctacg
      301 gtgcatgcag atgatggatt cgagccacca acatctccgg aagacaacaa caaaaaaccg
      361 tctttagaac aaattaaaca ggaaagagaa gcgttgttta cggttagtta cctattagct
      421 gcaagttttg aaaaagcgga atctgtaaaa agcggaatct gtaaaaaaaa catctaagga
      481 ataattctga aaagaaaaag tttctaaatg ttaatcggaa tccaattttt atgaaattat
      541 ttaaaaaaaa actaaaatta gtttctaaaa aatttttcta aagtaattgg accatgtgaa
      601 ggtacaccca cttgttccaa tatgccatat ctaactgtaa aataatttga ttctcatgag
      661 aatatttttc aggatctatt cgcagatcgt cgacgaagcg ctcgttctgt gattgaagaa
      721 gctttccaaa acgaactcat gagtgctgaa ccagtccagc caaacgtgcc gaatccacat
      781 tgtgagttgg aaatttttat ttgataacca agagaaaaaa agttctacct ttttttcaaa
      841 aacctttcca aaaatgattc catctgatat aggattaaga aaaatatttt ccgaaatctc
      901 tgcttttcag cgattcccat tcgtttccgt catcaaccag ttgctggacc tgctcatgat
      961 gttttcggag acgcggtgca ttcaattttt caaaaaataa tgtccaggta tacactattt
     1021 ttgcatattt ttcttgccaa atttggtcaa aaaccgtagt acaacccaaa aagtttcttc
     1081 atttcagagg agtgaacgcg gattatagtc attggatgtc atattggatc gcgttgggaa
     1141 tcgacaaaaa aacacaaatg aactatcata tgaaaccgtt ttgcaaagat acttatgcaa
     1201 ctgaaggctc cttaggtagg ttagtctttt ctaggcacag aagagtgaga aaattctaaa
     1261 tttctgagca gtctgctttt tgttttcctt gagtttttac ttaaagctct taaaagaaat
     1321 ctaggcgtga agttcgagcc ttgtaccata ccacaacagc attccaaatg ttacagaagc
     1381 gaaacaaaca tttactgata aaatcaggtc agctgttgag gaaattatct ggaagtccgc
     1441 tgaatattgt gatattctta gcgagaagtg gacaggaatt catgtgtcgg ccgaccaact
     1501 gaaaggtcaa agaaataagc aagaagatcg ttttgtggct tatccaaatg gacaatacat
     1561 gaatcgtgga caggttagtg cgaatcgggg actcaagatt tactgaaata gtgaagagaa
     1621 aacaaaagaa aactatattt tcaaaaaaaa tgagaactct aataaacaga atgaaaaaca
     1681 ttcaaagcta cagtagtatt tccagctgga gtttccagag ccaaaaaaat gcgagtatta
     1741 ctgtagtttt gaaattggtt tctcacttta cgtacgattt tttgattttt ttttcagact
     1801 cttcatatga aaaaaaatca tgttttctcc tttacaagat ttttttgatc tcaaaacatt
     1861 tccagagtga catttcactt cttgcggtgt tcgatgggca tggcggacac gagtgctctc
     1921 aatatgcagc tgctcatttc tgggaagcat ggtccgatgc tcaacatcat cattcacaag
     1981 atatgaaact tgacgaactc ctagaaaagg ctctagaaac attggacgaa agaatgacag
     2041 tcagaagtgt tcgagaatct tggaaaggtg gaaccactgc tgtctgctgt gctgttgatt
     2101 tgaacactaa tcaaatcgca tttgcctggc ttggagattc accagggtaa tcaatttttt
     2161 tttagttttt ggaactttac gtcccgaaaa attattcctt tatcacctaa ttcctacagt
     2221 aacccaagct ccgaattaaa taaagttaaa gcgtggtata cacataaaaa taagaaaaaa
     2281 ttgttcatga aatccatttt tccagttaca tcatgtcaaa cttggagttc cgcaaattca
     2341 ctactgaaca ctccccgtct gacccggagg aatgtcgacg agtcgaagaa gtcggtggcc
     2401 agatttttgt gatcggtggt gagctccgtg tgaatggagt actcaacctg acgcgagcac
     2461 taggagacgt acctggaaga ccaatgatat ccaacaaacc tgatacctta ctgaagacga
     2521 tcgaacctgc ggattatctt gttttgttgg cctgtgacgg gatttctgac gtcttcaaca
     2581 ctagtgattt gtacaatttg gttcaggctt ttgtcaatga atatgacgta gaaggtatca
     2641 aactgatcgt ttttcacatc acaaaattct tgaattttcc agattatcac gaacttgcac
     2701 gctacatttg caatcaagca gtttcagctg gaagtgctga caatgtgaca gtagttatag
     2761 gtttcctccg tccaccagaa gacgtttggc gtgtaatgaa aacagactcg gatgatgaag
     2821 agagcgagct cgaggaagaa gatgacaatg aatagtttat tgcaagtttt ccaaaacttt
     2881 tccaatttcc ctgggtattg attagcatcc atatcttacg gcgattatat caattgtaac
     2941 attatttctg tttctccccc cacctctcaa attttcaaat gacccttttt cttttcgtct
     3001 acctgtatcg ttttccattc atctcccccc ctccactgtg gtatatcatt ttgtcattag
     3061 aaagtattat tttgattttc attggcagta gaagacaaca ggatacagaa gaggttttca
     3121 cag
//
  <pre>
</details>

```js
// Parse GenBank
const seqFile = new CGParse.SequenceFile(genbankText);

// Summary
seqFile.summary;
// {
//   inputType: 'genbank',
//   sequenceType: 'dna',
//   sequenceCount: 1,
//   featureCount: 4,
//   totalLength: 3123,
//   status: 'success'
// }

// Array of parsed records as JSON
seqFile.records;
```
Records Output
```json
[
  {
    "inputType": "genbank",
    "name": "AF177870",
    "seqID": "AF177870.1",
    "definition": "Caenorhabditis sp. CB5161 putative PP2C protein phosphatase FEM-2",
    "length": 3123,
    "topology": "linear",
    "type": "dna"
    "comments": "",
    "sequence": "gaacgcgaatgcctctctctctttcgatgggtatgccaattgtccacattcactcgtgttgcctcctctttgccaacacgcaagacaccagaaacgcgtcaaccaaagagaaaaagacgccgacaacgggcagcactcgcgagagacaaaggttatcgcgttgtgttattatacattcgcatccgggtcaactttagtccgttgaacatgcttcttgaaaacctagttctcttaaaataacgttttagaagttttggtcttcagatgtctgattcgctaaatcatccatcgagttctacggtgcatgcagatgatggattcgagccaccaacatctccggaagacaacaacaaaaaaccgtctttagaacaaattaaacaggaaagagaagcgttgtttacggttagttacctattagctgcaagttttgaaaaagcggaatctgtaaaaagcggaatctgtaaaaaaaacatctaaggaataattctgaaaagaaaaagtttctaaatgttaatcggaatccaatttttatgaaattatttaaaaaaaaactaaaattagtttctaaaaaatttttctaaagtaattggaccatgtgaaggtacacccacttgttccaatatgccatatctaactgtaaaataatttgattctcatgagaatatttttcaggatctattcgcagatcgtcgacgaagcgctcgttctgtgattgaagaagctttccaaaacgaactcatgagtgctgaaccagtccagccaaacgtgccgaatccacattgtgagttggaaatttttatttgataaccaagagaaaaaaagttctacctttttttcaaaaacctttccaaaaatgattccatctgatataggattaagaaaaatattttccgaaatctctgcttttcagcgattcccattcgtttccgtcatcaaccagttgctggacctgctcatgatgttttcggagacgcggtgcattcaatttttcaaaaaataatgtccaggtatacactatttttgcatatttttcttgccaaatttggtcaaaaaccgtagtacaacccaaaaagtttcttcatttcagaggagtgaacgcggattatagtcattggatgtcatattggatcgcgttgggaatcgacaaaaaaacacaaatgaactatcatatgaaaccgttttgcaaagatacttatgcaactgaaggctccttaggtaggttagtcttttctaggcacagaagagtgagaaaattctaaatttctgagcagtctgctttttgttttccttgagtttttacttaaagctcttaaaagaaatctaggcgtgaagttcgagccttgtaccataccacaacagcattccaaatgttacagaagcgaaacaaacatttactgataaaatcaggtcagctgttgaggaaattatctggaagtccgctgaatattgtgatattcttagcgagaagtggacaggaattcatgtgtcggccgaccaactgaaaggtcaaagaaataagcaagaagatcgttttgtggcttatccaaatggacaatacatgaatcgtggacaggttagtgcgaatcggggactcaagatttactgaaatagtgaagagaaaacaaaagaaaactatattttcaaaaaaaatgagaactctaataaacagaatgaaaaacattcaaagctacagtagtatttccagctggagtttccagagccaaaaaaatgcgagtattactgtagttttgaaattggtttctcactttacgtacgattttttgatttttttttcagactcttcatatgaaaaaaaatcatgttttctcctttacaagatttttttgatctcaaaacatttccagagtgacatttcacttcttgcggtgttcgatgggcatggcggacacgagtgctctcaatatgcagctgctcatttctgggaagcatggtccgatgctcaacatcatcattcacaagatatgaaacttgacgaactcctagaaaaggctctagaaacattggacgaaagaatgacagtcagaagtgttcgagaatcttggaaaggtggaaccactgctgtctgctgtgctgttgatttgaacactaatcaaatcgcatttgcctggcttggagattcaccagggtaatcaatttttttttagtttttggaactttacgtcccgaaaaattattcctttatcacctaattcctacagtaacccaagctccgaattaaataaagttaaagcgtggtatacacataaaaataagaaaaaattgttcatgaaatccatttttccagttacatcatgtcaaacttggagttccgcaaattcactactgaacactccccgtctgacccggaggaatgtcgacgagtcgaagaagtcggtggccagatttttgtgatcggtggtgagctccgtgtgaatggagtactcaacctgacgcgagcactaggagacgtacctggaagaccaatgatatccaacaaacctgataccttactgaagacgatcgaacctgcggattatcttgttttgttggcctgtgacgggatttctgacgtcttcaacactagtgatttgtacaatttggttcaggcttttgtcaatgaatatgacgtagaaggtatcaaactgatcgtttttcacatcacaaaattcttgaattttccagattatcacgaacttgcacgctacatttgcaatcaagcagtttcagctggaagtgctgacaatgtgacagtagttataggtttcctccgtccaccagaagacgtttggcgtgtaatgaaaacagactcggatgatgaagagagcgagctcgaggaagaagatgacaatgaatagtttattgcaagttttccaaaacttttccaatttccctgggtattgattagcatccatatcttacggcgattatatcaattgtaacattatttctgtttctccccccacctctcaaattttcaaatgaccctttttcttttcgtctacctgtatcgttttccattcatctccccccctccactgtggtatatcattttgtcattagaaagtattattttgattttcattggcagtagaagacaacaggatacagaagaggttttcacag",
    "features": [
      {
        "type": "source",
        "strand": 1,
        "locationText": "1..3123",
        "locations": [[1,3123]],
        "start": 1,
        "stop": 3123,
        "qualifiers": {
          "organism": "Caenorhabditis brenneri",
          "mol_type": "genomic DNA",
          "strain": "CB5161",
          "db_xref": "taxon:135651"
        },
        "name": "taxon:135651"
      },
      {
        "type": "gene",
        "strand": 1,
        "locationText": "<265..>2855",
        "locations": [[265,2855]],
        "start": 265,
        "stop": 2855,
        "qualifiers": {
          "gene": "fem-2"
        },
        "name": "fem-2"
      },
      {
        "type": "mRNA",
        "strand": 1,
        "locationText": "join(<265..402,673..781,911..1007,1088..1215,1377..1573,1866..2146,2306..2634,2683..>2855)",
        "locations": [[265,402],[673,781],[911,1007],[1088,1215],[1377,1573],[1866,2146],[2306,2634],[2683,2855]],
        "start": 265,
        "stop": 2855,
        "qualifiers": {
          "gene": "fem-2",
          "product": "putative FEM-2 protein phosphatase type 2C"
        },
        "name": "fem-2"
      },
      {
        "type": "CDS",
        "strand": 1,
        "locationText": "join(265..402,673..781,911..1007,1088..1215,1377..1573,1866..2146,2306..2634,2683..2855)",
        "locations": [[265,402],[673,781],[911,1007],[1088,1215],[1377,1573],[1866,2146],[2306,2634],[2683,2855]],
        "start": 265,
        "stop": 2855,
        "qualifiers": {
          "gene": "fem-2",
          "note": "possible sex-determining protein",
          "codon_start": "1",
          "product": "putative PP2C protein phosphatase FEM-2",
          "protein_id": "AAF04557.1",
          "translation": "MSDSLNHPSSSTVHADDGFEPPTSPEDNNKKPSLEQIKQEREALFTDLFADRRRSARSVIEEAFQNELMSAEPVQPNVPNPHSIPIRFRHQPVAGPAHDVFGDAVHSIFQKIMSRGVNADYSHWMSYWIALGIDKKTQMNYHMKPFCKDTYATEGSLEAKQTFTDKIRSAVEEIIWKSAEYCDILSEKWTGIHVSADQLKGQRNKQEDRFVAYPNGQYMNRGQSDISLLAVFDGHGGHECSQYAAAHFWEAWSDAQHHHSQDMKLDELLEKALETLDERMTVRSVRESWKGGTTAVCCAVDLNTNQIAFAWLGDSPGYIMSNLEFRKFTTEHSPSDPEECRRVEEVGGQIFVIGGELRVNGVLNLTRALGDVPGRPMISNKPDTLLKTIEPADYLVLLACDGISDVFNTSDLYNLVQAFVNEYDVEDYHELARYICNQAVSAGSADNVTVVIGFLRPPEDVWRVMKTDSDDEESELEEEDDNE"
        },
        "name": "fem-2"
      }
    ],
  }
]
```

```js
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

// Summary
featureFile.summary;
// {
//   inputFormat: "gff3",
//   featureCount: 1,
//   status: "success"
// }

// Array of parsed features as JSON
featureFile.records;
```
Records Output
```json
[
  {
    "contig": "chr1",
    "source": ".",
    "type": "gene",
    "start": 1000,
    "stop": 2000,
    "score": ".",
    "strand": "+",
    "phase": ".",
    "attributes": {
      "ID": "gene1",
      "Name": "myGene"
    },
    "qualifiers": {},
    "valid": true,
    "name": "myGene"
  }
]
```

```js
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

