import Logger from '../../Support/Logger.js';
import * as helpers from '../../Support/Helpers.js';

// NOTES:
// - CSV is a 1-based format. The start field is 1-based and the stop field is 1-based.
// - Can be CSV or TSV
// - header line can be optional but then you need to state what each column is (HOW)
// - columnMap: internal column names to column names in the file

class CSVFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._separator = [',', '\t'].includes(options.separator) ? options.separator : ',';
      // this._errors = {};
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
      this._hasHeader = (options.hasHeader === undefined) ? true : options.hasHeader;
      this.onlyColumns = options.onlyColumns || [];
      this.columnMap = this.createColumnMap(options.columnMap);
      // this.columnIndexMap = this.createColumnIndexMap(options.columnMap);

      if (!this.hasHeader) {
        // this.logger.info('- Header: Present');
        // Check that the columnMap values are all integers
        if (Object.values(this.columnMap).some((value) => isNaN(value))) {
          this._fail(`- ColumnMap values must be integers when there is no header`);
        }
      }

      // Valdiate ColumnMap
      // - Check that all the required columns are present
      // - Check that there are no extra columns
      // - Check that the columns are in the correct order
      // - Check that the columns are not duplicated
      // - Check that the columns are not empty

      // options for column mapping
      // Keys: internal column names, values: column names in the file (or indexes)
      // - default values are the internal column names
      // this._columnMap = {};
      // columns:
      // - contig
      // - start
      // - stop
      // - name
      // - score
      // - strand
      // - type
      // - legend
      // - codonStart
      // - ---------
      // - tags?
      // - meta?
      // - visible?
      // - favorite?
      // - geneticCode?
      // - attributes?
      // - qualifiers?
      // - locations?
      // - centerOffsetAdjustment?
      // - proportionOfThickness?

  }

  get defaultColumnMap() {
    return {
      contig: 'contig',
      start: 'start',
      stop: 'stop',
      name: 'name',
      score: 'score',
      strand: 'strand',
      type: 'type',
      legend: 'legend',
      codonStart: 'codonStart',
    };
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return (this.separator === ',') ? 'csv' : 'tsv';
  }

  get displayFileFormat() {
      return (this.separator === ',') ? 'CSV' : 'TSV';
  }

  get lineCount() {
    return this._lineCount;
  }

  get separator() {
    return this._separator;
  }

  get hasHeader() {
    return this._hasHeader;
  }

  // Returns an object with keys for the error codes and values for the error messages
  // - errorTypes: ?
  // get errors() {
  //   return this._errors || {};
  // }

  _warn(message, errorCode='unknown') {
    this.file._warn(message, errorCode);
  }

  _fail(message, errorCode='unknown') {
    this.file._fail(message, errorCode);
  }

  // TODO: handle no header line
  // createColumnIndexMap(columnMap) {
  createColumnMap(columnMap={}) {
    // Check that all keys are valid
    const validKeys = Object.keys(this.defaultColumnMap);
    const columnKeys = Object.keys(columnMap);
    for (const key of columnKeys) {
      if (!validKeys.includes(key)) {
        this._fail(`- Invalid column key: ${key}`);
      }
    }
    // Check for required columns
    const requiredKeys = ['start', 'stop'];
    for (const key of requiredKeys) {
      if (!columnKeys.includes(key)) {
        this._fail(`- Missing required column: ${key}`);
      }
    }

    // Combine the default column map with the provided column map
    const newColumnMap = {...this.defaultColumnMap, ...columnMap};

    // Change the keys to lowercase
    // NOTE: only need to worry about case for values
    // const newColumnMapKeys = Object.keys(newColumnMap);
    // for (const key of newColumnMapKeys) {
    //   const newKey = key.toLowerCase();
    //   if (newKey !== key) {
    //     newColumnMap[newKey] = newColumnMap[key];
    //     delete newColumnMap[key];
    //   }
    // }

    // Remove any columns that are not in the onlyColumns list (if present)
    if (this.onlyColumns.length) {
      const newColumnMapKeys = Object.keys(newColumnMap);
      for (const key of newColumnMapKeys) {
        if (!this.onlyColumns.includes(key)) {
          delete newColumnMap[key];
        }
      }
    }

    return newColumnMap;
  }


  // TODO check for separator
  // take upto the first 10 lines (non-empty/non-comment) and check for the separator
  // - count how many ',' and how many '\t' are on each line
  // - then check if the counts are consistent. If they are, then assign to commaCount or tabCount
  // - Take the separator with the highest count
  // - If they are undefined (i.e. counts are not consistent), then return an error

  // Returns true if the line matches the CSV format
  // - line: the first non-empty/non-comment line of the file
  // static lineMatches(line) {
  //   const fields = line.split('\t').map((field) => field.trim());
  //   if (fields.length < 3) {
  //     return false;
  //   } else if (fields.length === 10 || fields.length === 11) {
  //     // BED10 and BED11 are not permitted
  //     return false;
  //   } else if (isNaN(fields[1]) || isNaN(fields[2])) {
  //     return false;
  //   } else if (fields.length >= 5 && isNaN(fields[4])) {
  //     return false;
  //   } else if (fields.length >= 7 && isNaN(fields[6])) {
  //     return false;
  //   } else if (fields.length >= 8 && isNaN(fields[7])) {
  //     return false;
  //   } else if (fields.length >= 10 && isNaN(fields[9])) {
  //     return false;
  //   }

  //   return true;
  // }

  // Detect the separator based on the first 10 lines of the file
  // Returns the separator or undefined if the separator could not be detected
  static detectSeparator(fileText) {
    const maxLines = 10;
    const testLines = helpers.getLines(fileText, { maxLines: 10 });

    let commaCount, tabCount;
    for (const line of testLines) {
      const lineCommaCount = (line.match(/,/g) || []).length;
      const lineTabCount = (line.match(/\t/g) || []).length;
      if (commaCount === undefined) {
        commaCount = lineCommaCount;
      } else if (commaCount !== lineCommaCount) {
        commaCount = -1;
      }
      if (tabCount === undefined) {
        tabCount = lineTabCount;
      } else if (tabCount !== lineTabCount) {
        tabCount = -1;
      }
    }

    if ([0, -1].includes(commaCount) && [0, -1].includes(tabCount)) {
      // this.logger.warn(`- Unable to detect separator`);
    } else if (commaCount === -1) {
      return '\t';
    } else if (tabCount === -1) {
      return ',';
    } else {
      return (commaCount > tabCount) ? ',' : '\t';
    }
  }

  addError(errorCode, message) {
    const errors = this.errors;
    if (errors[errorCode]) {
      errors[errorCode].push(message);
    } else {
      errors[errorCode] = [message];
    }
  }

  parse(fileText, options={}) {
    const records = [];
    const foundHeader = false;
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
        if (this.hasHeader && !foundHeader) {
          // This is the header line
          foundHeader = true;
          // Parse the header line
          this._parseHeader(line);
        } else {
          // This is a feature line
          const record = this._parseLine(line);
          if (record) {
            records.push(record);
          }
        }
      }
    }
    this.logger.info(`- Parsed ${records.length} records`);
    return records;
  }

  _parseHeader(line) {
  }

  // TODO
  // - Should we check the number of fields and confirm they are all the same?
  // TODO: handle no header line
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split(this.separator).map((field) => field.trim());
    if (fields.length < 2) {
      // TODO: use validationErrors
      this._fail(`- Line does not have at least 2 fields: ${line}`);
      return null;
    }
    const colMap = this.columnMap;
    const contig = fields[colMap.contig];
    // Adds the field to the record if it exists in fields and columnMap
    this.addFieldToRecord(record, 'contig', fields, 'integer');
    // Basic fields
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
    if (fields[6]) {
      const thickStart = parseInt(fields[6]);
      // thickStart is 0-based so we add 1 here
      if ((thickStart + 1) !== record.start) {
        this.addError('thickStartNotMatchingStart', `- thickStart is not the same as start: ${line}`);
      }
    }
    if (fields[7]) {
      const thickEnd = parseInt(fields[7]);
      if (thickEnd !== record.stop) {
        this.addError('thickEndNotMatchingEnd', `- thickEnd is not the same as stop: ${line}`);
      }
    }
    return record;
  }

  addFieldToRecord(record, field, fields, parseAs='string') {
    if (!['string', 'integer', 'float'].includes(parseAs)) {
      throw new Error(`Invalid parseAs value: ${parseAs}`);
    }
    const colMap = this.columnIndexMap;
    if (colMap[field] !== undefined) {
      const index = colMap[field];
      if (fields[index] !== undefined) {
        if (parseAs === 'integer') {
          record[field] = parseInt(fields[index]);
        } else if (parseAs === 'float') {
          record[field] = parseFloat(fields[index]);
        } else {
          record[field] = fields[index];
        }
      }
    }
  }

  validateRecords(records) {
    const errors = this.errors;
    // ThickStart and ThickEnd Warnings
    const thickStartErrors = errors['thickStartNotMatchingStart'] || [];
    if (thickStartErrors.length) {
      this._warn(`- Features where thickStart != start: ${thickStartErrors.length}`);
    }
    const thickEndErrors = errors['thickEndNotMatchingEnd'] || [];
    if (thickEndErrors.length) {
      this._warn(`- Features where thickEnd != stop: ${thickStartErrors.length}`);
    }
    if (thickStartErrors.length || thickEndErrors.length) {
      this._warn(`- NOTE: thickStart and thickEnd are ignored by this parser`);
    }

    // Missing Starts and Stops
    const missingStarts = records.filter((record) => isNaN(record.start));
    if (missingStarts.length) {
      // this._fail(`- Records missing Starts: ${missingStarts.length.toLocaleString().padStart(5)}`);
      this._fail('- Records missing Starts: ', { padded: missingStarts.length });
    }
    const missingStops = records.filter((record) => isNaN(record.stop));
    if (missingStops.length) {
      // this._fail(`- Records missing Stops: ${missingStops.length.toLocaleString().padStart(6)}`);
      this._fail('- Records missing Stops: ', { padded: missingStops.length });
    }

  }

}

export default CSVFeatureFile;