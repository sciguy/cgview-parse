// Holds a sequence and features from a sequence file: genbank, embl, fasta, raw
// Parses text from sequence file
// Creates sequence records json that can be converted to CGView JSON
// Array of sequence records containing array of features
// TODO: Give examples of output (the record format)

// NOTES:
// - This code is heavily based on Paul's seq_to_json.py script with some exceptions.
// - Maybe most errors will be warnings and those features are removed. We could
//   let it continue but warn the user. The status could be WARNING. For feature
//   based errors
// - In proksee, if there are warnings, the user has to click a checkbox to
//   remove the features when submitting. 
// TODO:
// - Test start_codon
// - consider changing type to molType
// - consider changing inputType to fileType
// - Note, feature locations that can't be parsed are not handled here. They are
//   handled in the CGViewBuilder as warnings.
import Logger from './Logger.js';
import CGViewBuilder from './CGViewBuilder.js';
import * as helpers from './Helpers.js';

class SequenceFile {

  static toCGViewJSON(inputText, options={}) {
    const logger = new Logger({logToConsole: false});
    const seqFile = new SequenceFile(inputText, {logger: logger, ...options});
    return seqFile.toCGViewJSON();
  }

  // inputText: string from GenBank, EMBL, Fasta, or Raw [Required]
  // Options:
  // - addFeatureSequences: boolean [Default: false]. This can increase run time ~3x.
  // - nameKeys: The order of preference for the name of a feature
  //   - array of strings [Default: ['gene', 'locus_tag', 'product', 'note', 'db_xref']]
  // - logger: logger object
  // - maxLogCount: number (undefined means no limit) [Default: undefined]
  constructor(inputText, options={}) {
    // this.inputText;
    // console.log("THIS IS THE NEW STUFF$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4")
    // console.log(/\r\n/.test(inputText));
    const convertedText = helpers.convertLineEndingsToLF(inputText);
    // console.log(/\r\n/.test(convertedText));
    // const convertedText = inputText;
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    this.nameKeys = options.nameKeys || ['gene', 'locus_tag', 'product', 'note', 'db_xref'];
    this.logger.info(`Date: ${new Date().toUTCString()}`);
    this._success = true
    this._status = 'success'
    this._records = [];
    this._errorCodes = new Set();

    if (!convertedText || convertedText === '') {
      this._fail('Parsing Failed: No input text provided.', 'empty')
    // } else if (!helpers.isASCII(convertedText)) {
    } else if (helpers.isBinary(convertedText)) {
      this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', 'binary');
    } else {
      this._records = this._parse(convertedText, options);
      if (options.addFeatureSequences) {
        this._addFeatureSequence(this._records)
      }
      this._determineSequenceTypes(this._records);
      this._determineOverallInputAndSequenceType(this._records);
      this.logger.info('- done parsing sequence file');
      this._validateRecords(this._records);
      this.parseSummary();
    }
    this.logger.break();
  }

  /////////////////////////////////////////////////////////////////////////////
  // Properties
  /////////////////////////////////////////////////////////////////////////////

  get status() {
    return this._status;
  }

  get success() {
    return this.status == 'success';
  }

  get inputType() {
    return this._inputType;
  }

  get sequenceType() {
    return this._sequenceType;
  }

  // { inputType, sequenceType, sequenceCount, featureCount, totalLength, success }
  get summary() {
    return this._summary;
  }

  // Returns an array of unique error codes
  // Codes: unknown, binary, empty
  get errorCodes() {
    return Array.from(this._errorCodes);
  }

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTERS
  /////////////////////////////////////////////////////////////////////////////

  toCGViewJSON(options={}) {
    if (this.success) {
      options.logger = options.logger || this.logger
      const builder = new CGViewBuilder(this, options);
      return builder.toJSON();
    } else {
      this.logger.error('*** Cannot convert to CGView JSON because parsing failed ***');
    }
  }

  get records() {
    return this._records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  /////////////////////////////////////////////////////////////////////////////

  parseSummary() {
    const records = this.records;
    const features = records.map((record) => record.features).flat();
    const seqLength = records.map((record) => record.length).reduce((a, b) => a + b, 0);

    this.logger.break('--------------------------------------------\n')
    this.logger.info('Parsing Summary:');
    this.logger.info(`- Input file type: ${this.inputType.padStart(12)}`);
    this.logger.info(`- Sequence Type: ${this.sequenceType.padStart(14)}`);
    this.logger.info(`- Sequence Count: ${records.length.toLocaleString().padStart(13)}`);
    this.logger.info(`- Feature Count: ${features.length.toLocaleString().padStart(14)}`);
    this.logger.info('- Total Length (bp): ' + `${seqLength.toLocaleString()}`.padStart(10));
    if (this.success) {
      this.logger.info('- Status: ' + 'Success'.padStart(21), {icon: 'success'});
    } else {
      this.logger.error('- Status: ' + 'FAILED'.padStart(21), {icon: 'fail'});
    }
    this.logger.break('--------------------------------------------\n')

    this._summary = {
      inputType: this.inputType,
      sequenceType: this.sequenceType,
      sequenceCount: records.length,
      featureCount: features.length,
      totalLength: seqLength,
      status: this.status,
      success: this.success
    };
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
        (records[0].name === '' && records[0].length === 0  && records[0].sequence === '')) {
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
    this.logger.info("- name extraction keys: " + this.nameKeys.join(', '));
    seqText.split(/^\/\//m).filter(this._isSeqRecord).forEach((seqRecord) => {
      const record = {inputType: 'unknown'};
      if (/^\s*LOCUS|^\s*FEATURES/m.test(seqRecord)) {
        record.inputType = 'genbank';
      } else if (/^\s*ID|^\s*SQ/m.test(seqRecord)) {
        record.inputType = 'embl';
      }
      record.name = this._getSeqName(seqRecord);
      record.seqID = this._getSeqID(seqRecord);
      record.definition = this._getSeqDefinition(seqRecord);
      record.length = this._getSeqLength(seqRecord);
      record.topology = this._getSeqTopology(seqRecord);
      record.comments = this._getSeqComments(seqRecord);
      record.sequence = this._getSequence(seqRecord);
      if (!record.length) {
        record.length = record.sequence.length;
      }
      record.features = this._getFeatures(seqRecord);
      records.push(record);
    });
    return records;
  }

  _parseFasta(seqText, options={}) {
    // console.log("Parsing FASTA...")
    const records = [];
    seqText.split(/^\s*>/m).filter(this._isSeqRecord).forEach((seqRecord) => {
      const record = {inputType: 'fasta', name: '', length: 0, sequence: ''};
      // const match = seqRecord.match(/^\s*([^\n\r]+)(.*)/s);
      const match = seqRecord.match(/^([^\n\r]*)(.*)/s);
      if (match) {
        record.name = match[1].trim();
        record.sequence = helpers.removeWhiteSpace(helpers.removeDigits(match[2]));
        record.length = record.sequence.length;
        record.features = [];
        // Parse defintion line if name is not empty
        if (record.name !== '') {
          const matchDef = record.name.match(/^(\S+)\s*(.*)/);
          if (matchDef) {
            record.seqID = matchDef[1];
            record.definition = matchDef[2];
          }
        }
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

  // Get a sequence accessiona and version from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // VERSION     NC_001823.1  GI:11466495
  // in EMBL look for e.g.:
  // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
  _getSeqID(seqRecordText) {
    // GenBank
    let match = seqRecordText.match(/^\s*(?:VERSION)\s*(\S+)/m);
    if (match) {
      let seqID = match[1];
      return seqID;
    }
    // EMBL
    match = seqRecordText.match(/^\s*AC\s*(\S+);/m);
    if (match) {
      let accession = match[1];
      // Look for version
      match = seqRecordText.match(/^\s*ID\s*(\S+);\s*SV\s*(\d+);/);
      let version;
      if (match) {
        version = match[2];
      }
      return version ? `${accession}.${version}` : accession;
    } else {
      // no matches
      return "";
    }
  }


  // Get a sequence definition from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // DEFINITION  Reclinomonas americana mitochondrion, complete genome.
  // in EMBL look for e.g.:
  // DE   Reclinomonas americana mitochondrion, complete genome.
  _getSeqDefinition(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:DEFINITION|DE)\s+(.+)$/m);
    if (match) {
      let definition = match[1];
      return definition
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
  // Returns 0 if it can't be parsed
  _getSeqLength(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID).*?(\d+)\s[Bb][Pp]/);
    if (match) {
      return parseInt(match[1]);
    } else {
      return 0;
    }
  }

  // Get a sequence topology from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // LOCUS       NC_001823              69034 bp    DNA     circular INV 16-AUG-2005
  // in EMBL look for e.g.:
  // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
  // ID   NC_001823; SV 1; linear; unassigned DNA; STD; UNC; 69034 BP.
  _getSeqTopology(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID)\s*\S+\s+.*(linear|circular)/);
    if (match) {
      return this.topology = match[1];
    } else {
      return "unknown";
    }
  }

  // Get a sequence comments from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // COMMENT   REVIEWED REFSEQ: This record has been curated by NCBI staff. The
  //           reference sequence was derived from AF007261.
  // in EMBL look for e.g.:
  // CC   REVIEWED REFSEQ: This record has been curated by NCBI staff. The
  // CC   reference sequence was derived from AF007261.
  _getSeqComments(seqRecordText) {
    // Genbank
    let match = seqRecordText.match(/^\s*COMMENT\s+(.*)\nFEATURES/ms);
    let comments = '';
    if (match) {
      comments = match[1];
      comments = comments.replace(/^\s*/mg, "");
    } else {
      // EMBL
      match = seqRecordText.match(/^\s*CC\s+(.*)\nXX/ms);
      if (match) {
        comments = match[1];
        comments = comments.replace(/^\s*CC\s*/mg, "");
      }
    }
    return comments
  }


  // Get the full sequence from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // ORIGIN
  //        1 ttttgccctc agtccgtgac ggcgcaggct ttccgtcacg gtttttactt taaaatggta
  // in EMBL look for e.g.:
  // SQ   Sequence 3123 BP; 986 A; 605 C; 597 G; 935 T; 0 other;
  //     gaacgcgaat gcctctctct ctttcgatgg gtatgccaat tgtccacatt cactcgtgtt        60
  //
  // NOTE: the original regex had a 's' for dotall but it was cuasing an issue when integrating into proksee.
  //       Oddly the issue did not occur in Chrome. It was only Safari.
  //       The regex also didn't actually require the 's', so I removed it.
  _getSequence(seqRecordText) {
    const match = seqRecordText.match(/^(?:ORIGIN|SQ\s{3}).*?$([^\/]*)(^\s*$|^\s*LOCUS)?/m);
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
  // NOTE: qualifiers without values will be set to true
  // NOTE: qualifiers values can be a single value or an array of values
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
          // not a key-value pair
          name = helpers.removeWhiteSpace(qualifierText).replace(/^\//, "");
          value = true;
        }
        if (qualifiers[name]) {
          // qualifiers[name].push(value);
          if (qualifiers[name] instanceof Array) {
            qualifiers[name].push(value);
          } else {
            qualifiers[name] = [qualifiers[name], value];
          }
        } else if (value === true) {
          qualifiers[name] = true;
        } else {
          // qualifiers[name] = [value];
          qualifiers[name] = value;
        }
      });
    }
    return qualifiers;
  }

  // Return the value for a qualifer name/key from a qualifiers object
  // If multiple values, return the first value
  // Returns undefined if the qualifier does not exist
  _getFirstQualifierValueForName(name, qualifiers) {
    const value = qualifiers[name];
    if (value instanceof Array) {
      return value[0];
    } else if (value !== undefined) {
      return value
    }
  }

  _getFeatureName(qualifiers) {
    // This is the order of preference for the name of a feature
    // This could become a user-defined list (think tags that the user can rearrange or add/remove)
    // const keys = ['gene', 'locus_tag', 'product', 'note', 'db_xref'];
    const keys = this.nameKeys;
    const foundKey = keys.find((key) => this._getFirstQualifierValueForName(key, qualifiers));
    return foundKey ? this._getFirstQualifierValueForName(foundKey, qualifiers) : "";
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
    for (const seqRecord of seqRecords) {
      const sequence = seqRecord.sequence;
      seqRecord.type = helpers.determineSeqMolType(sequence);
      const nonIUPAC = helpers.findNonIUPACCharacters(sequence, seqRecord.type);
      if (nonIUPAC) {
        seqRecord.hasUnexpectedCharacters = nonIUPAC;
      }
    }
  }

  _determineOverallInputAndSequenceType(records) {
    const inputTypes = records.map((record) => record.inputType);
    const uniqueInputTypes = [...new Set(inputTypes)];
    this._inputType = (uniqueInputTypes.length > 1) ? 'multiple' : uniqueInputTypes[0];

    const seqTypes = records.map((record) => record.type);
    const uniqueSeqTypes = [...new Set(seqTypes)];
    this._sequenceType = (uniqueSeqTypes.length > 1) ? 'multiple' : uniqueSeqTypes[0];
  }

  _fail(message, errorCode='unknown') {
    this.logger.error(message);
    // this._success = false;
    this._status = 'failed';
    this._errorCodes.add(errorCode);
  }

  // Simple way to pluralize a phrase
  // e.g. _pluralizeHasHave(1) => 's has'
  // _pluralizeHasHave(count, singular, plural) {
  //   return count === 1 ? singular : plural;
  // }

  _validateRecords(records) {
    this.logger.info('Validating...');

    // Input Type
    if (this.inputType === 'multiple') {
      const inputTypes = records.map((record) => record.inputType);
      const uniqueInputTypes = [...new Set(inputTypes)];
      this._fail(`Input file contains multiple input types: ${uniqueInputTypes.join(', ')}`);
    }
    // Sequence Type
    if (this.sequenceType === 'multiple') {
      const seqTypes = records.map((record) => record.type);
      const uniqueSeqTypes = [...new Set(seqTypes)];
      this._fail(`Input file contains multiple sequence types: ${uniqueSeqTypes.join(', ')}`);
    }
    if (this.sequenceType === 'unknown') {
      this._fail(`Input file contains an unknown sequence type (i.e. not dna or protein).`);
    }
    // Sequence length is 0
    const recordsZeroLength = records.filter((record) => record.length === 0);
    if (recordsZeroLength.length > 0) {
      const count = recordsZeroLength.length.toLocaleString();
      this._fail(`The following sequences (${count}) have zero length:`);
      this._fail(`- ${recordsZeroLength.map((record) => record.name).join(', ')}`);
    }
    // Sequence lengths do not match length in sequence
    const recordsDiffLengths = records.filter((record) => record.length !== record.sequence.length);
    if (recordsDiffLengths.length > 0) {
      const count = recordsDiffLengths.length.toLocaleString();
      this._fail(`The following sequences (${count}) have mismatched lengths (length attribute vs sequence length):`);
      // for (const record of recordsDiffLengths) {
      //   this.logger.error(`- ${record.name}: ${record.length.toLocaleString()} bp vs ${record.sequence.length.toLocaleString()} bp`);
      // }
      const messages = recordsDiffLengths.map((r) => `- ${r.name}: ${r.length.toLocaleString()} bp vs ${r.sequence.length.toLocaleString()} bp`);
      this.logger.error(messages);
    }
    // Sequence contains unexpected characters
    const recordsUnexpectedChars = records.filter((record) => record.hasUnexpectedCharacters);
    if (recordsUnexpectedChars.length > 0) {
      const count = recordsUnexpectedChars.length.toLocaleString();
      this._fail(`The following sequences (${count}) contain unexpected characters:`);
      // for (const record of recordsUnexpectedChars) {
      //   this.logger.error(`- ${record.name}: ${record.hasUnexpectedCharacters}`);
      // }
      const messages = recordsUnexpectedChars.map((r) => `- ${r.name}: ${r.hasUnexpectedCharacters}`);
      this.logger.error(messages);
    }

    // Feature locations are empty


    // Features start or end/stop is greater than sequence length
    // Features end is less than start
    // - NOTE: we may want to allow features that wrap around the sequence
    const featureStartEndErrors = [];
    const featureStartGreaterThanEnd = [];
    for (const record of records) {
      for (const feature of record.features) {
        if (feature.start > record.length || feature.stop > record.length) {
          // featureStartEndErrors.push(`${record.name} [${record.length.toLocaleString()} bp]: ${feature.name} ${feature.start}..${feature.stop}`);
          featureStartEndErrors.push(`- ${record.name} [${record.length.toLocaleString()} bp]: '${feature.name}' [${feature.start}..${feature.stop}]`);
        }
        if (feature.start > feature.stop) {
          featureStartGreaterThanEnd.push(`- ${record.name}: '${feature.name}' [${feature.start}..${feature.stop}]`);
        }
      }
    }
    if (featureStartEndErrors.length > 0) {
      const count = featureStartEndErrors.length.toLocaleString();
      this._fail(`The following features (${count}) have start or end greater than the sequence length:`);
      this.logger.error(featureStartEndErrors);
      // featureStartEndErrors.forEach((error) => this.logger.error(`- ${error}`));
    }
    if (featureStartGreaterThanEnd.length > 0) {
      const count = featureStartGreaterThanEnd.length.toLocaleString();
      this._fail(`The following features (${count}) have a start greater than the end:`);
      this.logger.error(featureStartGreaterThanEnd);
      // featureStartGreaterThanEnd.forEach((error) => this.logger.error(`- ${error}`));
    }

    if (this.success) {
      this.logger.info('- validations passed', {icon: 'success'});
    } else {
      this.logger.error('- validations failed', {icon: 'fail'});
    }
  }

}

export default SequenceFile;