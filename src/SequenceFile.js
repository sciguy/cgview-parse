// Holds a sequence and feature from a sequence file: genbank, embl, fasta, raw
// Parses text from sequence file
// Holds seq records from our parser
// Array of sequence records containing array of features

// NOTES:
// - This code is heavily based on Paul's seq_to_json.py script with some exceptions:
//   - Feature sequence is not extracted yet (add_feature_sequences)
// TODO:
// - Add Paul's sanity checks
// - Need log and overal success status
// - Test start_codon
// - Genetic codes
// - Give examples of output (the record format)
// LOG
// - status/success
import Logger from './Logger.js';
import { SeqRecordsToCGVJSON } from './SeqRecToCGVJSON.js';
import * as helpers from './Helpers.js';

class SequenceFile {

  // Options:
  // - addFeatureSequences: boolean [Default: false]. This can increase run time ~3x.
  // - logger: logger object
  constructor(inputText, options={}) {
    this.inputText;
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    this._success = true
    if (inputText && inputText !== '') {
      this._records = this._parse(inputText, options);
      if (options.addFeatureSequences) {
        this._addFeatureSequence(this._records)
      }
      this._determineSequenceTypes(this._records);
      this._validateRecords(this._records);
      this.parseSummary();
    } else {
      this._records = [];
      this.logger.error('No input text provided.')
      // FAIL
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTERS
  /////////////////////////////////////////////////////////////////////////////

  toCGVJSON(options={}) {
    options.logger = options.logger || this.logger
    const parser = new SeqRecordsToCGVJSON(this.records, options);
    return parser.json;
    // return seqRecordsToCGVJSON(this.records, options);
  }

  get records() {
    return this._records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  /////////////////////////////////////////////////////////////////////////////
  parseSummary() {
    const records = this.records;
    const inputTypes = records.map((record) => record.inputType);
    const uniqueInputTypes = [...new Set(inputTypes)];

    if (uniqueInputTypes.length > 1) {
      this.logger.error(`Input file contains multiple input types: ${uniqueInputTypes.join(', ')}`);
      // FAIL!!!!
    }

    this.inputType = uniqueInputTypes[0];
    const features = records.map((record) => record.features).flat();
    const seqLength = records.map((record) => record.length).reduce((a, b) => a + b, 0);
    this.logger.info('Parsing summary:');
    this.logger.info(`- Input file type: ${this.inputType}`);
    this.logger.info(`- Sequence Count: ${records.length}`);
    this.logger.info(`- Feature Count: ${features.length}`);
    this.logger.info(`- Total Length: ${seqLength.toLocaleString()} bp`);
  }


  /////////////////////////////////////////////////////////////////////////////
  // INITIAL PARSERS
  /////////////////////////////////////////////////////////////////////////////

  _parse(seqText, options={}) {
    this.logger.info("Parsing sequence file...");
    // Attempt to parse as genbank or embl first
    let records = this._parseGenbankOrEmbl(seqText, options);
    // If that fails, try to parse as fasta or raw
    if ((records.length === 0) ||
        (records[0].name === '' && records[0].length === undefined && records[0].sequence === '')) {
      this.logger.info("- empty results");
      if (/^\s*>/.test(seqText)) {
        this.logger.info("- attempting as FASTA...");
        records = this._parseFasta(seqText, options);
      } else {
        this.logger.info("- attempting as raw...");
        records = this._parseRaw(seqText, options);
      }
    }
    return records;
  }

  _parseGenbankOrEmbl(seqText, options={}) {
    const records = [];
    this.logger.info("- attempting as GenBank or EMBL...");
    seqText.split(/^\/\//m).filter(this._isSeqRecord).forEach((seqRecord) => {
      const record = {inputType: 'UNKNOWN'};
      if (/^\s*LOCUS|^\s*FEATURES/m.test(seqRecord)) {
        record.inputType = 'genbank';
      } else if (/^\s*ID|^\s*SQ/m.test(seqRecord)) {
        record.inputType = 'embl';
      }
      record.name = this._getSeqName(seqRecord);
      record.length = this._getSeqLength(seqRecord);
      record.sequence = this._getSequence(seqRecord);
      record.features = this._getFeatures(seqRecord);
      records.push(record);
    });
    return records;
  }

  _parseFasta(seqText, options={}) {
    console.log("Parsing FASTA...")
    const records = [];
    seqText.split(/^\s*>/m).filter(this._isSeqRecord).forEach((seqRecord) => {
      const record = {inputType: 'fasta', name: '', length: undefined, sequence: ''};
      const match = seqRecord.match(/^\s*([^\n\r]+)(.*)/s);
      if (match) {
        record.name = match[1];
        record.sequence = helpers.removeWhiteSpace(helpers.removeDigits(match[2]));
        record.length = record.sequence.length;
        record.features = [];
      }
      records.push(record);
    });
    return records;
  }

  _parseRaw(seqText, options={}) {
    const record = {inputType: 'raw', name: '', features: []};
    record.sequence = helpers.removeWhiteSpace(helpers.removeDigits(seqText));
    record.length = record.sequence.length;
    return [record];
  }

  /////////////////////////////////////////////////////////////////////////////
  // SEQUENCE - this could become a class
  /////////////////////////////////////////////////////////////////////////////

  // Return FALSE if sequence record appears to be empty, e.g. just // or blank line
  _isSeqRecord(seqRecord) {
    if (/^\s*\/\/\s*$/.test(seqRecord)) {
      return false;
    } else if (/^\s*$/.test(seqRecord)) {
      return false
    } else {
      return true;
    }
  }

  // Get a sequence name from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999
  // in EMBL look for e.g.:
  // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
  // name is AF177870
  _getSeqName(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID)\s*(\S+)/);
    if (match) {
      let name = match[1];
      // Remove trailing ';' from embl files
      name = name.replace(/;$/, "");
      return name
    } else {
      return "";
    }
  }

  // Get a sequence length from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999
  // in EMBL look for e.g.:
  // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
  // length is 3123
  // Returns undefined if it can't be parsed
  _getSeqLength(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID).*?(\d+)\s[Bb][Pp]/);
    if (match) {
      return parseInt(match[1]);
    // } else {
    //   return 0;
    }
  }

  // Get the full sequence from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // ORIGIN
  //        1 ttttgccctc agtccgtgac ggcgcaggct ttccgtcacg gtttttactt taaaatggta
  // in EMBL look for e.g.:
  // SQ   Sequence 3123 BP; 986 A; 605 C; 597 G; 935 T; 0 other;
  //     gaacgcgaat gcctctctct ctttcgatgg gtatgccaat tgtccacatt cactcgtgtt        60
  _getSequence(seqRecordText) {
    const match = seqRecordText.match(/^(?:ORIGIN|SQ\s{3}).*?$([^\/]*)(^\s*$|^\s*LOCUS)?/ms);
    if (match) {
      return helpers.removeDigits(helpers.removeWhiteSpace(match[1]));
    } else {
      return "" 
    }
  }


  /////////////////////////////////////////////////////////////////////////////
  // FEATURES - this could become a class
  /////////////////////////////////////////////////////////////////////////////

  // Get an array of objects containing feature information from a GenBank or EMBL record
  // in GenBank look for:
  // FEATURES             Location/Qualifiers
  // in EMBL look for:
  // FH   Key             Location/Qualifiers
  // FH
  _getFeatures(seqRecordText) {
    const features = [];
    const match = seqRecordText.match(/^(?:FEATURES.*?$|FH.*?^FH.*?$)(.*)^(?:ORIGIN|SQ\s{3}).*?$/ms);
    if (match) {
      // this.logger.info("- parsing features...")
      let featureAllText = match[1];
      // Replace FT from the start of EMBL lines with 2 spaces
      featureAllText = featureAllText.replaceAll(/^FT/mg, "  ");
      featureAllText.split(/(?=^\s{5}\S+)/m).filter(this._isFeatureRecord).forEach((featureText) => {
        const feature = {};
        feature.type = this._getFeatureType(featureText);
        feature.strand = this._getFeatureStrand(featureText);
        feature.locationText = this._getFeatureLocationText(featureText);
        feature.locations = this._getFeatureLocations(feature.locationText);
        feature.start = feature.locations.map((location) => location[0]).sort((a, b) => a - b)[0];
        feature.stop = feature.locations.map((location) => location[1]).sort((a, b) => b - a)[0];
        feature.qualifiers = this._getFeatureQualifiers(featureText);
        feature.name = this._getFeatureName(feature.qualifiers);
        if (feature.type) {
          features.push(feature);
        }
      });
    } else {
      // this.logger.warn("- no features found");
    }
    return features
  }

  // Return FALSE if feature appears to be empty, e.g. just / or blank line
  _isFeatureRecord(featureText) {
    if (/^\s*\/\s*$/.test(featureText)) {
      return false;
    } else if (/^\s*$/.test(featureText)) {
      return false
    } else {
      return true;
    }
  }

  // Get type of a feature from a feature string
  // e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  _getFeatureType(featureText) {
    const match = featureText.match(/^\s{5}(\S+)/);
    if (match) {
      return match[1];
    } else {
      // TODO: Probably log this
      return null;
    }
  }

  // Get strand of a feature (1 or -1) from a feature string # e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  // FIXME: What about joins?
  _getFeatureStrand(featureText) {
    const match = featureText.match(/^\s{5}\S+\s+complement/);
    return match ? -1 : 1;
  }

  // Get location text of a feature (1 or -1) from a feature string
  // e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  _getFeatureLocationText(featureText) {
    const match = featureText.match(/^\s{5}\S+\s+([^\/]+)/s);
    if (match) {
      return helpers.removeWhiteSpace(match[1]);
    } else {
      return "";
    }
  }

  // Return an array of locations from a location string
  // FIXME: What about > and <?
  _getFeatureLocations(locationText) {
    const locations = [];
    const ranges = locationText.split(/(?=,)/).filter(this._isParsableFeatureRange);
    for (const range of ranges) {
      const location = {};
      let match = range.match(/(\d+)\D*\.\.\D*(\d+)/);
      if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        locations.push([start, end]);
      } else {
        match = range.match(/(\d+)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = start;
          locations.push([start, end]);
        }
      }
    }
    return locations;
  }

  // Return FALSE if feature range is of a type that cannot be converted to a start and end
  // examples of ranges that cannot be converted to start and end:
  // 102.110
  // 123^124
  // J00194.1:100..202
  // join(1..100,J00194.1:100..202)
  _isParsableFeatureRange(range) {
    if (/\d\.\d/.test(range)) {
      return false;
    } else if (/\^/.test(range)) {
      return false;
    } else if (/:/.test(range)) {
      return false;
    } else if (/^\s*$/.test(range)) {
      return false;
    } else {
      return true;
    }
  }

  // Return FALSE if feature qualifier appears to be empty, e.g. just / or blank line
  _isFeatureQualifier(qualifierText) {
    if (/^\s*\/\s*$/.test(qualifierText)) {
      return false;
    } else if (/^\s*$/.test(qualifierText)) {
      return false
    } else {
      return true;
    }
  }

  // Format feature qualifier value by removing newlines if there are no spaces within the value
  // otherwise replace newlines with spaces
  _formatFeatureQualifier(qualifierText) {
    if (/\S\s\S/.test(qualifierText)) {
      return qualifierText.replace(/[\s]+/g, " ");
    } else {
      return qualifierText.replace(/[\s]+/g, "");
    }
  }

  // Get an array of objects containing feature qualifier names and values from a feature string
  // e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  _getFeatureQualifiers(featureText) {
    const qualifiers = {};
    let match = featureText.match(/(\/.*)/s);
    if (match) {
      const allQualifierText = match[1];
      allQualifierText.split(/(?=^\s*\/)/m).filter(this._isFeatureQualifier).forEach((qualifierText) => {
        const qualifier = {};
        let name;
        let value;
        match = qualifierText.match(/\/([^\"\s]+)\s*=\s*\"?([^\"]*)\"?(?=^\s*\/|$)/ms);
        if (match) {
          name = match[1];
          value = this._formatFeatureQualifier(match[2]);
        } else {
          name = helpers.removeWhiteSpace(qualifierText);
          value = "";
        }
        if (qualifiers[name]) {
          qualifiers[name].push(value);
        } else {
          qualifiers[name] = [value];
        }
      });
    }
    return qualifiers;
  }

  _getFeatureName(qualifiers) {
    if (qualifiers?.gene) {
      return qualifiers.gene[0];
    } else if (qualifiers?.locus_tag) {
      return qualifiers.locus_tag[0];
    } else if (qualifiers?.product) {
      return qualifiers.product[0];
    } else if (qualifiers?.note) {
      return qualifiers.note[0];
    } else if (qualifiers?.db_xref) {
      return qualifiers.db_xref[0];
    } else {
      return "";
    }
  }

  // Optional
  _addFeatureSequence(seqRecords) {
    for (const seqRecord of seqRecords) {
      for (const feature of seqRecord.features) {
        const dna = [];
        for (const location of feature.locations) {
          const start = location[0];
          const end = location[1];
          dna.push(seqRecord.sequence.slice(start-1, end));
          // ERROR CHECK
        }
        if (feature.strand === -1) {
          feature.sequence = helpers.reverse(helpers.complement(dna.join("")));
        } else {
          feature.sequence = dna.join("");
        }
      }
    }
  }

  // Try to determine whether the sequence in each record is DNA or protein
  // and whether there are unexpected characters in sequence
  _determineSequenceTypes(seqRecords) {
    const commonDNAChars = "ATGC";
    // const allDNAChars    = "ACGTURYSWKMBDHVN\.\-";
    const allDNAChars    = "ACGTURYSWKMBDHVN.-";
    const commonProteinChars = "ACDEFGHIKLMNPQRSTVWY";
    // const allProteinChars    = "ABCDEFGHIJKLMNOPQRSTUVWYZ\*\-\.";
    const allProteinChars    = "ABCDEFGHIJKLMNOPQRSTUVWYZ*-.";
    for (const seqRecord of seqRecords) {
      const sequence = seqRecord.sequence;
      const seqLength = sequence.length;
      const numCommonDNAChars = helpers.countCharactersInSequence(sequence, commonDNAChars);
      const numCommonProteinChars = helpers.countCharactersInSequence(sequence, commonProteinChars);
      const numAllDNAChars = helpers.countCharactersInSequence(sequence, allDNAChars);
      const numAllProteinChars = helpers.countCharactersInSequence(sequence, allProteinChars);

      if ( (numCommonDNAChars / seqLength) > 0.9) {
        seqRecord.type = 'dna';
      } else if ( (numCommonProteinChars / seqLength) > 0.9) {
        seqRecord.type = 'protein';
      } else {
        seqRecord.type = 'unknown';
      }
      if (numAllDNAChars !== seqLength && numAllProteinChars !== seqLength) {
        seqRecord.hasUnexpectedCharacters = true;
        // THIS WILL BE IN VALIDATION
        // this.logger.warn(`- unexpected characters in sequence: ${seqRecord.name}`);
      }
    }
  }

  _validateRecords(records) {
  }

}

export default SequenceFile;