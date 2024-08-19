// NEXT:
// - Catch errors in main parser and then privde gernal failure error message: 
//   "GFF3 Parsing Failed: An error occurred while parsing the file."

// This will be the main interface to parseing Feature Files. 
// For each feature file type (e.g. GFF3, GTF, BED, CSV, etc.)
// we will have delagates that will parse the file and return a FeatureFile object.

// Check out gff-js utils for parsing GFF3 files:
// https://github.com/GMOD/gff-js/blob/master/src/util.ts

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


import Logger from './Logger.js';
import GFF3FeatureFile from './FeatureFileFormats/GFF3FeatureFile.js';
import GTFFeatureFile from './FeatureFileFormats/GTFFeatureFile.js';
import BEDFeatureFile from './FeatureFileFormats/BEDFeatureFile.js';

// import FeatureBuilder from './FeatureBuilder.js';
import * as helpers from './Helpers.js';

// FeatureFile class reads a feature file (GFF3, BED, CSV, GTF) and returns an array of records
// One for each feature. 

// File Delegates (based on fileFormat)
// Each file format has it's own delegate that is responsible for
// processing, validating and describing a file. Each delegate must
// have the following methods:
// - parse(text, options): returns an array of records
//   - options: { logger, maxLogCount }
// - fileFormat (getter): e.g. 'gff3', 'bed', 'csv', 'gtf'
// - displayFileFormat (getter): e.g. 'GFF3', 'BED', 'CSV', 'GTF'
// = nameKeys (getter): array of strings



class FeatureFile {

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
    this.options = options;
    const convertedText = helpers.convertLineEndingsToLF(inputText);
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    const providedFormat = options.format || 'auto';
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    this.logger.info(`Date: ${new Date().toUTCString()}`);
    this._success = true
    this._status = 'success'
    this._records = [];
    this._errorCodes = new Set();

    this.nameKeys = options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];

    if (!convertedText || convertedText === '') {
      this._fail('Parsing Failed: No input text provided.', 'empty')
    } else if (helpers.isBinary(convertedText)) {
      this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', 'binary');
    } else {
      this.logger.info('- Format Provided: ' + providedFormat.padStart(12));
      this.inputFormat = this.detectFormat(convertedText, providedFormat);
      this.logger.info('- Format Detected: ' + this.inputFormat.padStart(12));
      if (['gtf', 'gff3'].includes(this.inputFormat)) {
        this.logger.info("- Name extraction keys (GFF3/GTF): " + this.nameKeys.join(', '));
      }
      this._records = this._parse(convertedText, options);
      this.logger.info('- Done parsing feature file');
      // this._validateRecords(this._records);
      this.parseSummary();
    }
    this.logger.break();
  }

  // - if auto, try to determine the format
  // - if format is provided, use that format but still try to determine if it is correct
  // - if format doesn't match the file, return a warning


  /////////////////////////////////////////////////////////////////////////////
  // Properties
  /////////////////////////////////////////////////////////////////////////////

  get status() {
    return this._status;
  }

  get success() {
    return this.status == 'success';
  }

  static get formatDelegateMap() {
    return FeatureFile.FILE_FORMAT_DELEGATES;
  }

  // The file format being parsed: 'auto', 'gff3', 'bed', 'csv', 'gtf', 'uknonwn'
  get inputFormat() {
    return this.delegate.fileFormat;
  }

  set inputFormat(format) {
    const fileFormats = Object.keys(FeatureFile.formatDelegateMap);
    if (fileFormats.includes(format)) {
      this._delegate = new FeatureFile.formatDelegateMap[format](this, this.options)
    } else {
      throw `File format '${format}' must be one of the following: ${fileFormats.join(', ')}`;
    }
  }

  // { inputFormat, featureCount, success }
  get summary() {
    return this._summary;
  }

  // Returns an array of unique error codes
  // Codes: unknown, binary, empty
  get errorCodes() {
    return Array.from(this._errorCodes);
  }

  get delegate() {
    return this._delegate;
  }

  /////////////////////////////////////////////////////////////////////////////
  // DETERMINE FILE FORMAT
  /////////////////////////////////////////////////////////////////////////////

  // Options:
  // - fileText: contents of the file (string)
  // - providedFormat: the format provided by the user (string)
  //   - 'auto', 'gff3', 'bed', 'csv', 'gtf'
  // - if a format other than 'auto' is provided, that format will be returned
  //   - however, if the format doesn't match the file, a warning will be logged
  //   - if the provided format is unknown, 'auto' will be used and a warning will be logged
  detectFormat(fileText, providedFormat='auto') {
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
      detectedFormat = 'unknown';
    }
    if (FeatureFile.FORMATS.includes(providedFormat)) {
      if (providedFormat !== 'auto') {
        if (providedFormat !== detectedFormat) {
          this.logger.warn(`- Provided format '${providedFormat}' does not match detected format '${detectedFormat}'`);
        }
        return providedFormat;
      } else {
        if (detectedFormat === 'unknown') {
          this._fail(`- File Format Unknown: autodection failed. Try explicitly setting the format.`);
        }
        return detectedFormat;
      }
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

  parseSummary() {
    const records = this.records;

    const format = this.displayFileFormat || this.inputFormat.toUpperCase();

    this.logger.break('--------------------------------------------\n')
    this.logger.info('Parsing Summary:');
    this.logger.info(`- Input File Format: ${format.padStart(10)}`);
    this.logger.info(`- Feature Lines: ${'LINE COUNT'.padStart(14)}`);
    this.logger.info(`- Feature Count: ${records.length.toLocaleString().padStart(14)}`);
    if (this.success) {
      this.logger.info('- Status: ' + 'Success'.padStart(21), {icon: 'success'});
    } else {
      this.logger.error('- Status: ' + 'FAILED'.padStart(21), {icon: 'fail'});
    }
    this.logger.break('--------------------------------------------\n')

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
  // DELEGATE METHODS
  /////////////////////////////////////////////////////////////////////////////

  get fileFormat() {
    return this.delegate.fileFormat;
  }

  get displayFileFormat() {
    return this.delegate.displayFileFormat;
  }

  parse(fileText, options) {
    return this.delegate.parse(text);
  }

  /////////////////////////////////////////////////////////////////////////////
  // PARSERS
  /////////////////////////////////////////////////////////////////////////////

  _parse(fileText, options={}) {
    let records = [];
    this.logger.info("Parsing feature file...");
    records = this.delegate.parse(fileText, options);
    return records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // METHODS
  /////////////////////////////////////////////////////////////////////////////

  // Sets the status to failed and logs an error message
  _fail(message, errorCode='unknown') {
    this.logger.error(message);
    this._status = 'failed';
    this._errorCodes.add(errorCode);
  }

}

export default FeatureFile;