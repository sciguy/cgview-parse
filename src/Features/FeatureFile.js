/*!
 * CGParse.js – Sequence & Feature Parser for CGView.js
 * Copyright © 2024–2025 Jason R. Grant
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This will be the main interface for parsing Feature Files. 
// For each feature file type (e.g. GFF3, GTF, BED, CSV, TSV, etc.),
// we  have delagates that will parse the file and return an array of
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
import GFF3FeatureFile from './FeatureFileFormats/GFF3FeatureFile.js';
import GTFFeatureFile from './FeatureFileFormats/GTFFeatureFile.js';
import BEDFeatureFile from './FeatureFileFormats/BEDFeatureFile.js';
import CSVFeatureFile from './FeatureFileFormats/CSVFeatureFile.js';
import * as helpers from '../Support/Helpers.js';

/**
 * FeatureFile class reads a feature file (GFF3, BED, CSV, TSV, GTF) and returns an array of records
 * One for each feature. Some records (e.g. CDS) may be joined together if they have the same ID.
 *
 * FILE DELEGATES (based on fileFormat)
 * Each file format has it's own delegate that is responsible for
 * processing, validating and describing a file. Each delegate must
 * have the following methods:
 * - parse(text, options): returns an array of records
 *   - options: { logger, maxLogCount }
 * - fileFormat (getter): e.g. 'gff3', 'bed', 'csv', 'tsv', 'gtf'
 * - displayFileFormat (getter): e.g. 'GFF3', 'BED', 'CSV', 'TSV', 'GTF'
 * - nameKeys (getter): array of strings
 *
 * NOTE:
 * - tsv and csv are both parsed by the CSVFeatureFile delegate
 *
 * REQUIRED:
 * - inputText: string from GFF3, BED, CSV, TSV, or GTF file
 *
 * 
 * OPTIONS:
 * - GENERAL (All Formats)
 *   - format: The file format being parsed (e.g. 'auto', 'gff3', 'bed', 'csv', 'tsv', 'gtf') [Default: 'auto'].
 *   - logger: logger object
 *   - maxLogCount: number (undefined means no limit) [Default: undefined]
 * - GFF3/GTF
 *   - nameKeys: The order of preference for the name of a feature
 *     - Currently only used for GFF3 and GTF files
 *     - array of strings [Default: ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID']]
 *     - NOTE: 'Name' and 'ID' are from GFF3 attributes, the others are from the qualifiers.
 *     - FIXME: this may change based on the format
 * - CSV/TSV
 *   - separator: the separator used in the file (e.g. ',' or '\t') [Default: ',']
 *   - noHeader: boolean [Default: false]
 *   - [REMOVED] onlyColumns: array of strings indicating which columns to extract. [Default: [] (all columns)]
 *   - columnMap: object mapping column names to new names or column number (if no header). [Default: {}]
 *     - e.g. { start: 'chromStart', stop: 'chromEnd' }
 *     - columnKeys: contig, start, stop, strand, name, type, score, legend, codonStart
 *     - Future Keys: tags, qualifiers, meta
 *     - only the columns provided will be extracted
 */
class FeatureFile extends Status {

  /**
   * List of supported file formats
   */
  static FORMATS = ['auto', 'gff3', 'bed', 'csv', 'tsv', 'gtf'];

  /**
   * Map of file formats to their respective delegates
   */
  static FILE_FORMAT_DELEGATES = {
    'gff3': GFF3FeatureFile,
    'gtf': GTFFeatureFile,
    'bed': BEDFeatureFile,
    'csv': CSVFeatureFile,
    'tsv': CSVFeatureFile,
  };

  /**
   * Parses a feature file and returns an array of records
   * @param {String} inputText - text from a feature file (GFF3, BED, CSV, TSV, GTF)
   * @param {Object} options - See class description
   */
  constructor(inputText, options={}) {
    // super(options, 'PARSING FEATURE FILE');
    super(options);
    this.logHeader('PARSING FEATURE FILE');
    const convertedText = helpers.convertLineEndingsToLF(inputText);
    this.inputText = convertedText; // used by csv to get column data
    let providedFormat = options.format || 'auto';

    this._records = [];
    this._validationIssues = {};

    this.nameKeys = options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];

    if (!convertedText || convertedText === '') {
      this._fail('Parsing Failed: No input text provided.', {errorCode: 'empty'})
    } else if (helpers.isBinary(convertedText)) {
      this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', {errorCode: 'binary'});
    } else {
      // File Format
      this._info("Checking File Format...");
      this._info('- Format Provided: ', { padded: providedFormat });
      this.detectedFormat = this.detectFormat(convertedText);
      this._info('- Format Detected: ', { padded: this.detectedFormat });
      this.inputFormat = this.chooseFormat(providedFormat, this.detectedFormat);
      // Do not continue if the format is unknown
      if (!this.passed) { return; }

      // Names
      if (['gtf', 'gff3'].includes(this.inputFormat)) {
        this._info("- Name extraction keys (GFF3/GTF): " + this.nameKeys.join(', '));
      }
      // Parse
      this._records = this.parseWrapper(convertedText, options);
      this.validateRecordsWrapper(this._records, options);
      this.parseSummary();
    }
    this.logger.break();
  }

  /////////////////////////////////////////////////////////////////////////////
  // VALIDATION ISSUES
  /////////////////////////////////////////////////////////////////////////////

  // File specific issue codes can be set in the delegate: VALIDATION_ISSUE_CODES
  // - missingStart: record is missing a start value
  // - missingStop: record is missing a stop value
  // - lineError: line does not match the expected format
  static get COMMON_VALIDATION_ISSUE_CODES() {
    return ['missingStart', 'missingStop', 'lineError'];
  }

  get validationIssues() {
    return this._validationIssues || {};
  }

  validationIssueCount(issueCode) {
    return this.validationIssues[issueCode]?.length || 0;
  }

  addValidationIssue(issueCode, message) {
    const delegateIssueCodes = this.delegate?.VALIDATION_ISSUE_CODES || [];
    const allowedCodes = [...FeatureFile.COMMON_VALIDATION_ISSUE_CODES, ...delegateIssueCodes];
    if (!allowedCodes.includes(issueCode)) {
      this._fail("ERROR: Invalid validiation issue code: " + issueCode);
      return;
    }
    const validationIssues = this.validationIssues;
    if (validationIssues[issueCode]) {
      validationIssues[issueCode].push(message);
    } else {
      validationIssues[issueCode] = [message];
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // FILE FORMAT
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The file format being parsed: 'auto', 'gff3', 'bed', 'csv', 'tsv', 'gtf', 'unknown'
   */
  get inputFormat() {
    return this.delegate?.fileFormat;
  }

  set inputFormat(format) {
    const fileFormats = Object.keys(FeatureFile.formatDelegateMap);
    if (fileFormats.includes(format)) {
      if ([ 'csv', 'tsv' ].includes(format)) {
        this.options.separator = (format === 'csv') ? ',' : '\t';
      }
      this._delegate = new FeatureFile.formatDelegateMap[format](this, this.options)
    } else {
      this._fail(`File format '${format}' must be one of the following: ${fileFormats.join(', ')}`);
    }
  }

  /**
   * Determine the file format based on the text content
   *
   * @param {String} fileText - text contents of the file
   * @return {String} - the format detected (e.g. gff3, gtf, bed, csv, tsv)
   */
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
      if (separator === ',') {
        detectedFormat = 'csv';
      } else if (separator === '\t') {
        detectedFormat = 'tsv';
      } else {
        detectedFormat = 'unknown';
      }
    }

    return detectedFormat;
  }

  /**
   * Choose the format to use based on the provided format and the detected format
   * - if a format other than 'auto' is provided, that format will be returned
   *   - however, if the format doesn't match the file, a warning will be logged
   *   - if the provided format is unknown, 'auto' will be used and a warning will be logged
   * @param {String} providedFormat - format given by the user
   * @param {String} detectedFormat - format detected with detectFormat
   * @returns {String} - the chosen format (e.g. gff3, gtf, bed, csv, tsv)
   */
  chooseFormat(providedFormat, detectedFormat) {
    if (FeatureFile.FORMATS.includes(providedFormat) && (providedFormat !== 'auto')) {
      if (providedFormat !== detectedFormat) {
        this._warn(`- Using Provided format '${providedFormat}'; Does not match detected format '${detectedFormat}'`);
      }
      return providedFormat;
    } else {
      // Either they provided an invalide format or 'auto'
      if (detectedFormat === 'unknown') {
        this._fail(`- File Format Unknown: AutoDection Failed. Try explicitly setting the format.`, {errorCode: 'unknown_format'});
      } else if (providedFormat !== 'auto') {
        // Invalid format provided
        this._warn(`- Unknown format '${providedFormat}' -> Using '${detectedFormat}'`);
      }
      return detectedFormat;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTERS
  /////////////////////////////////////////////////////////////////////////////

  // TODO (When we need it)
  toCGViewFeaturesJSON(options={}) {
    // if (this.success) {
    //   options.logger = options.logger || this.logger
    //   const builder = new FeatureBuilder(this, options);
    //   return builder.toJSON();
    // } else {
    //   this.logger.error('*** Cannot convert to CGView Features JSON because parsing failed ***');
    // }
  }

  /**
   * Returns an array of parsed feature records
   */
  get records() {
    return this._records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns a summary object with the following:
   * - inputFormat, featureCount, status
   *
   * The summary is generated by parseSummary()
   */
  get summary() {
    return this._summary;
  }

  /**
   * Add a summary to the logs and creates the summary object
   */
  parseSummary() {
    const records = this.records;

    const format = this.displayFileFormat || this.inputFormat.toUpperCase();

    this.logger.divider();
    this._info('Parsing Summary:');
    this._info(`- Input File Format:`, { padded: format });
    this._info(`- Data Lines:`, { padded: this.lineCount });
    this._info(`- Feature Count:`, { padded: records.length });
    const failedCount = records.filter((record) => !record.valid).length;
    if (failedCount > 0) {
      this._fail(`- Features Failed:`, { padded: failedCount });
    }
    this.logStatusLine()
    this.logger.divider();

    this._summary = {
      inputFormat: this.inputFormat,
      featureCount: records.length,
      status: this.status,
      // success: this.success
    };
  }

  /////////////////////////////////////////////////////////////////////////////
  // DELEGATES
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The delegate for the file format
   */
  get delegate() {
    return this._delegate;
  }

  /**
   * Map of file formats to their respective delegates
   */
  static get formatDelegateMap() {
    return FeatureFile.FILE_FORMAT_DELEGATES;
  }

  /**
   * Returns the file format (e.g. 'gff3', 'bed', 'csv', 'tsv', 'gtf')
   */
  get fileFormat() {
    return this.delegate?.fileFormat || 'unknown';
  }

  /**
   * Returns the display name of the file format (e.g. 'GFF3', 'BED', 'CSV', 'TSV', 'GTF')
   */
  get displayFileFormat() {
    return this.delegate?.displayFileFormat || 'Unknown';
  }

  /**
   * The number of feature lines in the file
   * - This is not the number of records
   * - Some records may be joined together from several lines
   */
  get lineCount() {
    return this.delegate.lineCount;
  }

  /**
   * Parse the file based on the file format (delegate)
   * @param {String} fileText - text to parse
   * @param {Object} options - options for parsing
   * @returns {Array} - an array of records, one for each feature
   */
  parse(fileText, options) {
    return this.delegate.parse(fileText, options);
  }

  /**
   * Validate the records based on the file format (delegate)
   * @param {Array} records - array of records to validate
   * @param {Object} options - options for validation
   */
  validateRecords(records, options) {
      this.delegate.validateRecords(records, options);
  }

  /////////////////////////////////////////////////////////////////////////////
  // PARSE AND VALIDATION WRAPPERS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Wraps the parse method to catch any errors that occur during parsing
   * @param {String} fileText - text to parse
   * @param {Object} options - options for parsing
   * @returns {Array} - an array of records, one for each feature
   */
  parseWrapper(fileText, options={}) {
    let records = [];
    this._info(`Parsing ${this.displayFileFormat} Feature File...`);
    try {
      records = this.parse(fileText, options);

      // Only proceed if passed
      if (!this.passed) {
        return [];
      }

      const recordsWithLocationsCount = records.filter((record) => Array.isArray(record.locations)).length;
      this._info('- Features with >1 location: ', { padded: recordsWithLocationsCount });
      this._info('- Done parsing feature file');
    } catch (error) {
      this._fail('- Failed: An error occurred while parsing the file.', {errorCode: 'parsing'});
      this._fail(`- ERROR: ${error.message}`);
    }
    return records;
  }

  /**
   * Wraps the validateRecords method to catch any errors that occur during validation
   * @param {Array} records - array of records to validate
   * @param {Object} options - options for validation
   */
  validateRecordsWrapper(records, options={}) {
    if (!this.passed) { return; }

    // Line Errors
    const lineErrors = this.validationIssues['lineError'] || [];
    if (lineErrors.length) {
      this._fail('- Line Errors: ', { padded: lineErrors.length });
      this._fail(lineErrors);
    }

    if (!this.passed) { return; }

    this.logger.info(`Validating Records ...`);
    try {
      this.validateRecords(records, options);

      // General Validations
      // - start < stop?
      // - records marked valid

      // No Records
      // console.log(records)
      if (records.length === 0) {
        this._fail('- Failed: No records found in the file.');
      }


      // Common Validations
      // - required keys: start, stops
      for (let record of records) {
        if (!Number.isInteger(record.start)) {
          record.valid = false;
          this.addValidationIssue('missingStart');
        };
        if (!Number.isInteger(record.stop)) {
          record.valid = false;
          this.addValidationIssue('missingStop');
        }
      }

      // Check Issues
      const validationIssues = this.validationIssues;

      // Missing Starts and Stops
      const missingStartErrors = validationIssues['missingStart'] || [];
      if (missingStartErrors.length) {
        this._fail('- Records missing Starts: ', { padded: missingStartErrors.length });
      }
      const missingStopErrors = validationIssues['missingStop'] || [];
      if (missingStopErrors.length) {
        this._fail('- Records missing Stops: ', { padded: missingStopErrors.length });
      }

      if (this.passed) {
        this._info('- Validations Passed', {icon: 'success'});
      } else {
        this._fail('- Validations Failed');
      }
    } catch (error) {
      this._fail('- Failed: An error occurred while validating the records.', {errorCode: 'validating'});
      this._fail(`- ERROR: ${error.message}`);
    }
  }

}

export default FeatureFile;