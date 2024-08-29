// This will be the main interface to parsing Feature Files. 
// For each feature file type (e.g. GFF3, GTF, BED, CSV, etc.)
// we will have delagates that will parse the file and return an array of
// of joined features.
// The returned features are not exactly CGView feature yet, but they are
// in a format that can be easily converted to CGView features with FeatureBuilder.
// This raw format contains all the attributes from GFF3 and GTF files.
// Any attributes that are qualifiers, will also be available
// in the 'qualifiers' object.

// RESOURCES:
// Overview of GFF/GTF formmats and the changes overtime:
// - https://agat.readthedocs.io/en/latest/gxf.html
// GenBank and GTF/GFF3 file formats:
// - https://www.ncbi.nlm.nih.gov/genbank/genomes_gff/
// GTF:
// - http://mblab.wustl.edu/GTF22.html
// - https://useast.ensembl.org/info/website/upload/gff.html
// GFF3
// - https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md
// BED
// - https://samtools.github.io/hts-specs/BEDv1.pdf
// Other Parsers
// - gff-js utils for parsing GFF3 files (I didn't use this)
// - https://github.com/GMOD/gff-js/blob/master/src/util.ts

import Status from '../Support/Status.js';
import Logger from '../Support/Logger.js';
import GFF3FeatureFile from './FeatureFileFormats/GFF3FeatureFile.js';
import GTFFeatureFile from './FeatureFileFormats/GTFFeatureFile.js';
import BEDFeatureFile from './FeatureFileFormats/BEDFeatureFile.js';
// import FeatureBuilder from './FeatureBuilder.js';
import * as helpers from '../Support/Helpers.js';
import CSVFeatureFile from './FeatureFileFormats/CSVFeatureFile.js';

// FeatureFile class reads a feature file (GFF3, BED, CSV, GTF) and returns an array of records
// One for each feature. Some records (e.g. CDS) may be joined together if they have the same ID.

// File Delegates (based on fileFormat)
// Each file format has it's own delegate that is responsible for
// processing, validating and describing a file. Each delegate must
// have the following methods:
// - parse(text, options): returns an array of records
//   - options: { logger, maxLogCount }
// - fileFormat (getter): e.g. 'gff3', 'bed', 'csv', 'gtf'
// - displayFileFormat (getter): e.g. 'GFF3', 'BED', 'CSV', 'GTF'
// = nameKeys (getter): array of strings

class FeatureFile extends Status {

  static FORMATS = ['auto', 'gff3', 'bed', 'csv', 'gtf'];

  static FILE_FORMAT_DELEGATES = {
    'gff3': GFF3FeatureFile,
    'gtf': GTFFeatureFile,
    'bed': BEDFeatureFile,
    // 'csv': CSVFeatureFile,
  };

  // inputText: string from GFF3, BED, CSV, GTF [Required]
  // Options:
  // - format: The file format being parsed (e.g. 'auto', 'gff3', 'bed', 'csv', 'gtf') [Default: 'auto'].
  // - nameKeys: The order of preference for the name of a feature
  //   - Currently only used for GFF3 and GTF files
  //   - array of strings [Default: ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID']]
  //   - NOTE: 'Name' and 'ID' are from GFF3 attributes, the others are from the qualifiers.
  //   - FIXME: this may change based on the format
  // - logger: logger object
  // - maxLogCount: number (undefined means no limit) [Default: undefined]
  constructor(inputText, options={}) {
    super(options, 'PARSING FEATURE FILE');
    // this.options = options;
    const convertedText = helpers.convertLineEndingsToLF(inputText);
    let providedFormat = options.format || 'auto';

    this._records = [];

    this.nameKeys = options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];

    if (!convertedText || convertedText === '') {
      this._fail('Parsing Failed: No input text provided.', 'empty')
    } else if (helpers.isBinary(convertedText)) {
      this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', 'binary');
    } else {
      // File Format
      this.logger.info("Checking File Format...");
      // this.logger.info('- Format Provided: ' + providedFormat.padStart(12));
      this.logger.info('- Format Provided: ', { padded: providedFormat });
      const detectedFormat = this.detectFormat(convertedText);
      // this.logger.info('- Format Detected: ' + detectedFormat.padStart(12));
      this.logger.info('- Format Detected: ', { padded: detectedFormat });
      this.inputFormat = this.chooseFormat(providedFormat, detectedFormat);
      // Do not continue if the format is unknown
      if (!this.success) { return; }

      // Names
      if (['gtf', 'gff3'].includes(this.inputFormat)) {
        this.logger.info("- Name extraction keys (GFF3/GTF): " + this.nameKeys.join(', '));
      }
      // Parse
      this._records = this.parseWrapper(convertedText, options);
      this.validateRecordsWrapper(this._records, options);
      this.parseSummary();
    }
    this.logger.break();
  }


  /////////////////////////////////////////////////////////////////////////////
  // FILE FORMAT
  /////////////////////////////////////////////////////////////////////////////

  // The file format being parsed: 'auto', 'gff3', 'bed', 'csv', 'gtf', 'uknonwn'
  get inputFormat() {
    return this.delegate.fileFormat;
  }

  set inputFormat(format) {
    const fileFormats = Object.keys(FeatureFile.formatDelegateMap);
    if (fileFormats.includes(format)) {
      this._delegate = new FeatureFile.formatDelegateMap[format](this, this.options)
    } else {
      this._fail(`File format '${format}' must be one of the following: ${fileFormats.join(', ')}`);
    }
  }

  // Options:
  // - fileText: contents of the file (string)
  // - providedFormat: the format provided by the user (string)
  //   - 'auto', 'gff3', 'bed', 'csv', 'gtf'
  detectFormat(fileText) {
    let detectedFormat;
    // filter lines to remove blank lines and lines with starting with '#'
    const lines = fileText.split('\n').filter((line) => line.trim() !== '' && !line.startsWith('#'));
    const firstLine = lines[0];
    if (fileText.match(/^##gff-version 3/)) {
      detectedFormat = 'gff3';
    } else if (GTFFeatureFile.lineMatches(firstLine)) {
      detectedFormat = 'gtf';
    } else if (BEDFeatureFile.lineMatches(firstLine)) {
      detectedFormat = 'bed';
    } else {
      const separator = CSVFeatureFile.detectSeparator(fileText);
      // Try CSV/TSV
      // - check for separator
      // - if a separator is found, then try to lineMatch

      // ELSE: unknown
      detectedFormat = 'unknown';
    }

    return detectedFormat;
  }

  // Choose the format to use based on the provided format and the detected format
  // - if a format other than 'auto' is provided, that format will be returned
  //   - however, if the format doesn't match the file, a warning will be logged
  //   - if the provided format is unknown, 'auto' will be used and a warning will be logged
  chooseFormat(providedFormat, detectedFormat) {
    if (FeatureFile.FORMATS.includes(providedFormat) && (providedFormat !== 'auto')) {
      if (providedFormat !== detectedFormat) {
        this._warn(`- Using Provided format '${providedFormat}'; Does not match detected format '${detectedFormat}'`);
      }
      return providedFormat;
    } else {
      // Either they provided an invalide format or 'auto'
      if (detectedFormat === 'unknown') {
        this._fail(`- File Format Unknown: AutoDection Failed. Try explicitly setting the format.`, 'unknown_format');
      } else if (providedFormat !== 'auto') {
        // Invalid format provided
        this.logger.warn(`- Unknown format '${providedFormat}' -> Using '${detectedFormat}'`);
      }
      return detectedFormat;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTERS
  /////////////////////////////////////////////////////////////////////////////

  toCGViewFeaturesJSON(options={}) {
    // if (this.success) {
    //   options.logger = options.logger || this.logger
    //   const builder = new FeatureBuilder(this, options);
    //   return builder.toJSON();
    // } else {
    //   this.logger.error('*** Cannot convert to CGView Features JSON because parsing failed ***');
    // }
  }

  get records() {
    return this._records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  /////////////////////////////////////////////////////////////////////////////

  // { inputFormat, featureCount, success }
  get summary() {
    return this._summary;
  }

  parseSummary() {
    const records = this.records;

    const format = this.displayFileFormat || this.inputFormat.toUpperCase();

    // this.logger.break('--------------------------------------------\n')
    this.logger.divider();
    this.logger.info('Parsing Summary:');
    // this.logger.info(`- Input File Format: ${format.padStart(10)}`);
    this.logger.info(`- Input File Format:`, { padded: format });
    // this.logger.info(`- Feature Lines: ${this.lineCount.toLocaleString().padStart(14)}`);
    this.logger.info(`- Feature Lines:`, { padded: this.lineCount });
    // this.logger.info(`- Feature Count: ${records.length.toLocaleString().padStart(14)}`);
    this.logger.info(`- Feature Count:`, { padded: records.length });
    this.logStatusLine()
    // if (this.success) {
    //   this.logger.info('- Status: ' + 'Success'.padStart(21), {icon: 'success'});
    // } else if (this.status === 'warnings') {
    //   this.logger.warn('- Status: ' + 'Warnings'.padStart(21), {icon: 'warn'});
    // } else {
    //   this.logger.error('- Status: ' + 'FAILED'.padStart(21), {icon: 'fail'});
    // }
    // this.logger.break('--------------------------------------------\n')
    this.logger.divider();

    this._summary = {
      inputFormat: this.inputFormat,
      // sequenceType: this.sequenceType,
      // sequenceCount: records.length,
      featureCount: records.length,
      // totalLength: seqLength,
      status: this.status,
      success: this.success
    };
  }

  /////////////////////////////////////////////////////////////////////////////
  // DELEGATES
  /////////////////////////////////////////////////////////////////////////////

  get delegate() {
    return this._delegate;
  }

  static get formatDelegateMap() {
    return FeatureFile.FILE_FORMAT_DELEGATES;
  }

  get fileFormat() {
    return this.delegate?.fileFormat || 'unknown';
  }

  get displayFileFormat() {
    return this.delegate?.displayFileFormat || 'Unknown';
  }

  // Keep track of the number of feature lines in the file
  // Some of these may be joined together to form a single record
  get lineCount() {
    return this.delegate.lineCount;
  }

  parse(fileText, options) {
    return this.delegate.parse(fileText, options);
  }

  validateRecords(records, options) {
      this.delegate.validateRecords(records, options);
  }

  /////////////////////////////////////////////////////////////////////////////
  // PARSE AND VALIDATION WRAPPERS
  /////////////////////////////////////////////////////////////////////////////

  parseWrapper(fileText, options={}) {
    let records = [];
    this.logger.info(`Parsing ${this.displayFileFormat} Feature File...`);
    try {
      records = this.parse(fileText, options);
      const recordsWithLocationsCount = records.filter((record) => Array.isArray(record.locations)).length;
      console.log('recordsWithLocationsCount', recordsWithLocationsCount);
      // this.logger.info(`- Features with >1 location: ${recordsWithLocationsCount.toLocaleString().padStart(2)}`);
      this.logger.info('- Features with >1 location: ', { padded: recordsWithLocationsCount });
      this.logger.info('- Done parsing feature file');
    } catch (error) {
      this._fail('- Failed: An error occurred while parsing the file.', 'parsing');
      this.logger.error(`- ERROR: ${error.message}`);
    }

    return records;
  }

  validateRecordsWrapper(records, options={}) {
    this.logger.info(`Validating Records ...`);
    try {
      this.validateRecords(records, options);

      // General Validations
      // - Are there any records?
      // TODO: this may go above the validateRecords call
      console.log("HERE HERHERHERHEHR")
      console.log(records)
      if (records.length === 0) {
        this._fail('- Failed: No records found in the file.');
      }

      if (this.passed) {
        this.logger.info('- Validations Passed', {icon: 'success'});
      } else {
        this.logger.error('- Validations Failed');
      }
    } catch (error) {
      this._fail('- Failed: An error occurred while validating the records.', 'validating');
      this.logger.error(`- ERROR: ${error.message}`);
    }
  }

}

export default FeatureFile;