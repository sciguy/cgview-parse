import Logger from '../../Support/Logger.js';
import * as helpers from '../../Support/Helpers.js';

// NOTES:
// - CSV is a 1-based format. The start field is 1-based and the stop field is 1-based.
// - Can be CSV or TSV
// - header line can be optional but then you need to state what each column is with columnMap
// - columnMap: internal column names (keys) to column names in the file (or indexes)
//   - column keys: contig, start, stop, name, score, strand, type, legend, codonStart
//   - possible future keys:
//     - tags, meta, visible, favorite, geneticCode, attributes, qualifiers,
//     - locations, centerOffsetAdjustment, proportionOfThickness
//   - when using numbers to represent column indices, they are 0-based (MAYBE CHANGE THIS AFTER)
//     - and they must be numbers NOT strings (e.g. use 1, not "1")
//   - column names are case-insensitive
//   - keys are case-sensitive
//   - default values are the internal column keys

class CSVFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._separator = [',', '\t'].includes(options.separator) ? options.separator : ',';
      // this._errors = {};
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
      this._noHeader = (options.noHeader === undefined) ? false : options.noHeader;
      this.onlyColumns = options.onlyColumns || [];
      this._columnMap = options.columnMap || {};
  }

  static get defaultColumnMap() {
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

  static get columnKeys() {
    return Object.keys(CSVFeatureFile.defaultColumnMap);
  }

  get columnIndexToKeyMap() {
    return this._columnIndexToKeyMap;
  }

  set columnIndexToKeyMap(value) {
    this._columnIndexToKeyMap = value;
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

  get columnMap() {
    return this._columnMap;
  }

  get hasHeader() {
    return !this._noHeader;
  }
  get noHeader() {
    return this._noHeader;
  }

  // Returns an object with keys for the error codes and values for the error messages
  // - errorTypes: ?
  // get errors() {
  //   return this._errors || {};
  // }

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

  /**
   * Returns a map of column indexes to internal column keys.
   * Every column will be represented in the map.
   * Currently, the index is 0-based but this may change to 1-based.
   */
  createColumnIndexToKeyMapFromHeader(line) {
    const defaultColumnMap = CSVFeatureFile.defaultColumnMap;
    const columnMap = this.columnMap;
    const columnIndexToKeyMap = {};

    // Split the line into fields and get the column count
    const fields = line.split(this.separator).map((field) => field.trim().toLowerCase());
    this.columnCount = fields.length;
    this._info(`- First Line: ${line}`);
    this._info(`- Column Count: ${fields.length}`);
    if (this.onlyColumns.length) {
      this._info(`- Only Columns: ${this.onlyColumns.join(', ')}`);
    }

    // Return empty object if line was empty
    // Note: This actually shouldn't ever happen because we check for empty lines when parsing
    if (fields.length === 1 && fields[0] === '') {
      this._fail(`- Empty frst line`);
      return {};
    }

    // Check that all keys are valid
    const validKeys = CSVFeatureFile.columnKeys
    validKeys.push('ignored');
    const columnKeys = Object.keys(columnMap);
    for (const key of columnKeys) {
      if (!validKeys.includes(key)) {
        this._fail(`- Invalid column key: ${key}`);
      }
    }
    this._info(`- Header: ${this.hasHeader ? 'Yes' : 'No'}`);

    let invertedColumnMap = {};
    // Check if all the values are integers
    if (this.noHeader) {
      // HEADER: NO
      // Check that the columnMap values are all integers
      if (!Object.values(columnMap).every((value) => Number.isInteger(value))) {
        this._fail(`- ColumnMap values must be integers when there is no header`);
      }
      invertedColumnMap = helpers.invertObject(columnMap);
    } else {
      // HEADER: YES
      // Merge the default column map with the provided column map
      const newColumnMap = {...defaultColumnMap, ...columnMap};
      invertedColumnMap = helpers.invertObject(newColumnMap, true);
    }

    // Create the column index to key map
    this._info("- Column Key Mapping:")
    this._info(`    #       Key${this.hasHeader ? '   Column Name' : ''}`)
    for (const [index, origColumn] of fields.entries()) {
      if (invertedColumnMap[index]) {
        columnIndexToKeyMap[index] = invertedColumnMap[index];
      } else if (invertedColumnMap[origColumn]) {
        columnIndexToKeyMap[index] = invertedColumnMap[origColumn];
      } else {
        columnIndexToKeyMap[index] = 'ignored';
      }
      if (this.onlyColumns.length && columnIndexToKeyMap[index] != 'ignored') {
        if (!this.onlyColumns.includes(columnIndexToKeyMap[index])) {
          columnIndexToKeyMap[index] = 'ignored';
        }
      }
      this._info(`  - ${index}: ${columnIndexToKeyMap[index].padStart(8)}${this.hasHeader ? ` - ${origColumn}` : ''}`);
    }

    // Check for required columns
    const requiredColumnKeys = ['start', 'stop'];
    const keysPresent = Object.values(columnIndexToKeyMap);
    for (const key of requiredColumnKeys) {
      if (!keysPresent.includes(key)) {
        this._fail(`- Required Column Missing: ${key}`);
      }
    }

    // Check that provided column names are in the header
    // And that provided column indexes are within the range of the header
    const providedColumnValues = Object.values(columnMap);
    for (const nameOrIndex of providedColumnValues) {
      if (typeof nameOrIndex === 'number') {
        if (nameOrIndex >= fields.length) {
          this._fail(`- Column index out of range (${invertedColumnMap[nameOrIndex]}): ${nameOrIndex}`);
        }
      } else if (typeof nameOrIndex === 'string') {
        const name = nameOrIndex.toLowerCase();
        if (!fields.includes(name)) {
          this._fail(`- Column name not found in header  (${invertedColumnMap[nameOrIndex]}): ${nameOrIndex}`);
        }
      }
    }

    return columnIndexToKeyMap;
  }

  /**
   * Returns the data from the column with the given index
   * @param {Number} index - column index (1-based)
   * @param {Number} itemCount - number of items (rows of data) in the column to be returned.
   *  If undefined, all items will be returned.
   * @returns {Array} - array of data for the column
   */
  static columnData(text, separator, count) {
    const lines = text.split('\n');
    const data = [];
    let rowCount = 0
    for (let line of lines) {
      if (rowCount === count) {
        break;
      }
      if (line.startsWith('#') || line.trim() === '') {
        // This is a comment or blank line: Do nothing
      } else {
        rowCount++;
        const fields = line.split(separator).map((field) => field.trim());
        for (let i = 0; i < fields.length; i++) {
          if (!data[i]) {
            data[i] = [];
          }
          data[i].push(fields[i]);
        }
      }
    }
    return data;
  }

  // Detect the separator based on the first 10 lines of the file
  // Returns the separator (',' or '\t') or undefined if the separator could not be detected
  // - count how many ',' and how many '\t' are on each line
  // - then check if the counts are consistent. If they are, then assign to commaCount or tabCount
  // - Take the separator with the highest count
  // - If they are undefined (i.e. counts are not consistent), then return an error
  static detectSeparator(fileText) {
    const maxLines = 10;
    const testLines = helpers.getLines(fileText, { maxLines });

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
      // Unable to detect separator: returns undefined
    } else if (commaCount === -1) {
      return '\t';
    } else if (tabCount === -1) {
      return ',';
    } else {
      return (commaCount > tabCount) ? ',' : '\t';
    }
  }

  // addError(errorCode, message) {
  //   const errors = this.errors;
  //   if (errors[errorCode]) {
  //     errors[errorCode].push(message);
  //   } else {
  //     errors[errorCode] = [message];
  //   }
  // }

  parse(fileText, options={}) {
    const records = [];
    let foundHeader = false;
    const lines = fileText.split('\n');
    for (let line of lines) {
      if (line.startsWith('#')) {
        // This is a comment line
        // Do nothing
      } else if (line.trim() === '') {
        // This is an empty line
        // Do nothing
      } else {
        if (!foundHeader) {
          // This is the header line or first line of data
          foundHeader = true;
          // Parse the header line
          this.columnIndexToKeyMap = this.createColumnIndexToKeyMapFromHeader(line);
          // Check status
          if (this.file.status === 'failed') {
            return [];
          }
          if (this.noHeader) {
            // This is a data line
            const record = this._parseLine(line);
            if (record) {
              records.push(record);
            }
          }
        } else {
          // This is a data line
          const record = this._parseLine(line);
          if (record) {
            records.push(record);
          }
        }
      }
    }
    this._info(`- Parsed ${records.length} records`);
    return records;
  }

  // TODO
  // - Should we check the number of fields and confirm they are all the same?
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split(this.separator).map((field) => field.trim());
    if (fields.length < 2) {
      // TODO: use validationErrors
      this._fail(`- Line does not have at least 2 fields: ${line}`);
      return null;
    }

    // Adds the field to the record if it exists in fields and columnMap
    const record = {};
    this.addFieldToRecord(record, 'name', fields);
    this.addFieldToRecord(record, 'contig', fields);
    this.addFieldToRecord(record, 'start', fields, 'integer');
    this.addFieldToRecord(record, 'stop', fields, 'integer');
    this.addFieldToRecord(record, 'strand', fields, 'strand');
    this.addFieldToRecord(record, 'type', fields);
    this.addFieldToRecord(record, 'score', fields, 'float');
    this.addFieldToRecord(record, 'legend', fields);
    this.addFieldToRecord(record, 'codonStart', fields, 'integer');
    record.valid = true;

    return record;
  }

  addFieldToRecord(record, field, fields, parseAs='string') {
    if (!['string', 'integer', 'float', 'strand'].includes(parseAs)) {
      throw new Error(`Invalid parseAs value: ${parseAs}`);
    }

    // const colMap = this.columnIndexMap;
    const colMap = helpers.invertObject(this.columnIndexToKeyMap);

    if (colMap[field] !== undefined) {
      const index = colMap[field];
      if (fields[index] !== undefined) {
        if (parseAs === 'integer') {
          record[field] = parseInt(fields[index]);
        } else if (parseAs === 'float') {
          record[field] = parseFloat(fields[index]);
        } else if (parseAs === 'strand') {
          // Strand will be parsed to '+', '-' or '.'
          let strand = '+'; // default
          let value = fields[index];
          if (value === '-' || value === '-1' || value === -1) {
            strand = '-';
          } else if (value === '.') {
            strand = '.';
          }
          record[field] = strand
        } else {
          record[field] = fields[index];
        }
      }
    }
  }

  validateRecords(records) {
    // CSV specific validations
  }

}

export default CSVFeatureFile;