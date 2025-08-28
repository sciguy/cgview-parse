/**
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

import Logger from '../../Support/Logger.js';
import * as helpers from '../../Support/Helpers.js';

// NOTES:
// - Only works with tab separated files (NOT space separated)
// - Bed is a 0-based format. The chromStart field is 0-based and the chromEnd field is 1-based.

class BEDFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
  }

  get VALIDATION_ISSUE_CODES() {
    return ['thickStartNotMatchingStart', 'thickEndNotMatchingEnd'];
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return 'bed';
  }

  get displayFileFormat() {
      return 'BED';
  }

  get lineCount() {
    return this._lineCount;
  }

  // Returns an object with keys for the error codes and values for the error messages
  // - Issure Codes:
  //   - thickStartNotMatchingStart
  //   - thickEndNotMatchingStop
  //   - missingStart
  //   - missingStop
  get validationIssues() {
    return this.file.validationIssues || {};
  }


  /////////////////////////////////////////////////////////////////////////////
  // FeatureFile Methods (Delegate Owner)
  /////////////////////////////////////////////////////////////////////////////
  _info(message, options={}) {
    this.file._info(message, options);
  }

  _warn(message, options={}) {
    this.file._warn(message, options);
  }

  _fail(message, options={}) {
    this.file._fail(message, options);
  }
  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns true if the line matches the BED format.
   * Note: fields 2, 3, 5, 7, 8, 10 when present should be numbers
   * @param {String} line - data line from the file (first non-empty/non-comment line)
   * @returns {Boolean} - true if the line matches the BED format
   */
  static lineMatches(line) {
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 3) {
      return false;
    } else if (fields.length === 10 || fields.length === 11) {
      // BED10 and BED11 are not permitted
      return false;
    } else if (isNaN(fields[1]) || isNaN(fields[2])) {
      return false;
    } else if (fields.length >= 5 && isNaN(fields[4])) {
      return false;
    } else if (fields.length >= 7 && isNaN(fields[6])) {
      return false;
    } else if (fields.length >= 8 && isNaN(fields[7])) {
      return false;
    } else if (fields.length >= 10 && isNaN(fields[9])) {
      return false;
    }

    return true;
  }

  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }

  parse(fileText, options={}) {
    const records = [];
    const lines = fileText.split('\n');
    let line;
    for (line of lines) {
      if (line.startsWith('#')) {
        // This is a comment line
        // Do nothing
      } else if (line.trim() === '') {
        // This is an empty line
        // Do nothing
      } else {
        // This is a feature line
        const record = this._parseLine(line);
        if (record) {
          records.push(record);
        }
      }
    }
    this.logger.info(`- Parsed ${records.length} records`);
    return records;
  }

  // TODO
  // - Provide warnging for thickStart/thickEnd
  // - Should we check the number of fields and confirm they are all the same?
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 3) {
      this.addValidationIssue('lineError', `  - Line does not have at least 3 fields: ${line}`);
      // this._fail(`- Line does not have at least 3 fields: ${line}`);
      return null;
    }
    // Bsic fields
    const record = {
      contig: fields[0],
      // Convert start to 1-based
      start: parseInt(fields[1]) + 1,
      stop: parseInt(fields[2]),
      name: fields[3] || 'Uknown',
      valid: true,
    };

    // if (isNaN(record.start)) {
    //     this.addValidationIssue('missingStart');
    //     record.valid = false;
    // }
    // if (isNaN(record.stop)) {
    //     this.addValidationIssue('missingStop');
    //     record.valid = false;
    // }

    // Score
    const score = parseFloat(fields[4]);
    if (!isNaN(score)) {
      record.score = score;
    }
    // Strand
    if (fields[5]) {
      record.strand = fields[5];
    }
    // ThickStart and ThickEnd
    if (fields[6]) {
      const thickStart = parseInt(fields[6]);
      // thickStart is 0-based so we add 1 here
      if ((thickStart + 1) !== record.start) {
        this.addValidationIssue('thickStartNotMatchingStart', `- thickStart is not the same as start: ${line}`);
        // record.valid = false;
      }
    }
    if (fields[7]) {
      const thickEnd = parseInt(fields[7]);
      if (thickEnd !== record.stop) {
        this.addValidationIssue('thickEndNotMatchingEnd', `- thickEnd is not the same as stop: ${line}`);
        // record.valid = false;
      }
    }
    // Blocks (requires fields 10, 11, 12)
    if (fields[11]) {
      const blockCount = parseInt(fields[9]);
      if (blockCount > 1) {
        // blockSizes and blockStarts may have dangling commas
        const blockSizes = fields[10].replace(/,$/, '').split(',').map((size) => parseInt(size));
        // blockStarts are 0-based so we add 1 here
        const blockStarts = fields[11].replace(/,$/, '').split(',').map((start) => parseInt(start) + 1);
        if (blockCount !== blockSizes.length || blockCount !== blockStarts.length) {
          // ERROR CODE
          this.logger.warn(`- Block count does not match block sizes and starts: ${line}`);
          console.log(blockCount, blockSizes, blockStarts);
        } else if (blockStarts[0] !== 1) {
          // ERROR CODE
          this.logger.warn(`- Block start does not match start: ${line}`);
        } else if ((blockStarts[blockStarts.length - 1] + blockSizes[blockStarts.length - 1] + record.start - 2) !== record.stop) {
          // ERROR CODE
          this.logger.warn(`- Block end does not match stop: ${line}`);
        } else {
          // Add blocks to locations
          record.locations = [];
          for (let i = 0; i < blockCount; i++) {
            record.locations.push([
              record.start + blockStarts[i] - 1,
              record.start + blockStarts[i] + blockSizes[i] - 2
            ]);
          }
        }
      }
    }

    return record;
  }

  validateRecords(records) {
    // BED Specific Validation
    const validationIssues = this.validationIssues;
    // ThickStart and ThickEnd Warnings
    const thickStartErrors = validationIssues['thickStartNotMatchingStart'] || [];
    if (thickStartErrors.length) {
      this._warn(`- Features where thickStart != start: ${thickStartErrors.length}`);
    }
    const thickEndErrors = validationIssues['thickEndNotMatchingEnd'] || [];
    if (thickEndErrors.length) {
      this._warn(`- Features where thickEnd != stop: ${thickStartErrors.length}`);
    }
    if (thickStartErrors.length || thickEndErrors.length) {
      this._warn(`- NOTE: thickStart and thickEnd are ignored by this parser`);
    }
  }

}

export default BEDFeatureFile;