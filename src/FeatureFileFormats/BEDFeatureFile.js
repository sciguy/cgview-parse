import Logger from '../Logger.js';
import * as helpers from '../Helpers.js';

// NOTES:
// - Bed is a 0-based format. The chromStart field is 0-based and the chromEnd field is 1-based.

class BEDFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._options = options;
      this.logger = options.logger || new Logger();
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

  _fail(message, errorCode='unknown') {
    this.file._fail(message, errorCode);
  }

  // Returns true if the line matches the BED format
  // - line: the first non-empty/non-comment line of the file
  // fields: 2, 3, 5, 7, 8, 10 when present should be numbers
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
    this.logger.info(`- Parsed ${records.length} record`);
    return records;
  }

  // TODO
  // - Provide warnging for thickStart/thickEnd
  // - Should we check the number of fields and confirm they are all the same?
  _parseLine(line) {
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 3) {
      this._fail(`- Line does not have at least 3 fields: ${line}`);
      // this.logger.warn(`- Skipping line: ${line}`);
      return null;
    }
    // Bsic fields
    const record = {
      contig: fields[0],
      // Convert start to 1-based
      start: parseInt(fields[1]) + 1,
      stop: parseInt(fields[2]),
      name: fields[3] || 'Uknown',
    };
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
    // TODO ERROR CODES
    // THIS error code should explain that we do not use thickStart/thickEnd so this information is lost
    if (fields[6]) {
      const thickStart = parseInt(fields[6]);
      // thickStart is 0-based so we add 1 here
      if ((thickStart + 1) !== record.start) {
        this.logger.warn(`- thickStart is not the same as start: ${line}`);
      }
    }
    if (fields[7]) {
      const thickEnd = parseInt(fields[7]);
      if (thickEnd !== record.stop) {
        this.logger.warn(`- thickEnd is not the same as stop: ${line}`);
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

}

export default BEDFeatureFile;