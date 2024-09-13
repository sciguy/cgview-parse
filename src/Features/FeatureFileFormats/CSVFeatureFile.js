import Logger from '../../Support/Logger.js';
import * as helpers from '../../Support/Helpers.js';

// NOTES:
// - CSV is a 1-based format. The start field is 1-based and the stop field is 1-based.
// - Can be CSV or TSV
// - header line can be optional but then you need to state what each column is with columnMap
// - columnMap: internal column names (keys) to column names in the file (or indexes)
//   - when using numbers to represent columns, they are 0-based (MAYBE CHANGE THIS AFTER)
//   - column names are case-insensitive
//   - keys are case-sensitive

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
      // this._columnMap = this.createColumnMap(options.columnMap);
      this._columnMap = options.columnMap || {};
      // this.columnIndexMap = this.createColumnIndexMap(options.columnMap);

      // if (this.noHeader) {
      //   // this.logger.info('- Header: Present');
      //   // Check that the columnMap values are all integers
      //   if (Object.values(this.columnMap).some((value) => isNaN(value))) {
      //     this._fail(`- ColumnMap values must be integers when there is no header`);
      //   }
      // }

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

  get columnIndexMap() {
    return this._columnIndexMap;
  }

  set columnIndexMap(value) {
    this._columnIndexMap = value;
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
    // return this._hasHeader;
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



  // createColumnMap(columnMap={}) {
  //   // Check that all keys are valid
  //   const validKeys = Object.keys(this.defaultColumnMap);
  //   const columnKeys = Object.keys(columnMap);
  //   for (const key of columnKeys) {
  //     if (!validKeys.includes(key)) {
  //       this._fail(`- Invalid column key: ${key}`);
  //     }
  //   }

  //   let newColumnMap = {};

  //   if (this.noHeader) {
  //     this.logger.info('- Header: No');
  //     newColumnMap = {...columnMap};
  //     // Parse values as integers
  //     for (const key of Object.keys(newColumnMap)) {
  //       newColumnMap[key] = parseInt(newColumnMap[key]);
  //     }
  //     // Check that the columnMap values are all integers
  //     if (Object.values(newColumnMap).some((value) => isNaN(value))) {
  //       this._fail(`- ColumnMap values must be integers when there is no header`);
  //     }
  //   } else {
  //     this.logger.info('- Header: Yes');
  //     // Combine the default column map with the provided column map
  //     newColumnMap = {...this.defaultColumnMap, ...columnMap};
  //   }

  //   // Combine the default column map with the provided column map
  //   // const newColumnMap = {...this.defaultColumnMap, ...columnMap};

  //   // Remove any columns that are not in the onlyColumns list (if present)
  //   if (this.onlyColumns.length) {
  //     const newColumnMapKeys = Object.keys(newColumnMap);
  //     for (const key of newColumnMapKeys) {
  //       if (!this.onlyColumns.includes(key)) {
  //         delete newColumnMap[key];
  //       }
  //     }
  //   }

  //   return newColumnMap;
  // }

  // internally we use a map of out col names to indexs in the file
  // externally we will have a list of columns names/indexes with select lists of our internal names
  // Proksee Interface:
  // - 3 column table:
  //   - checkbox: use this column
  //   - text: column name (from file) or index (if no header is checked)
  //   - select: internal column name

  // TODO: Change to lowercase for column names
  // createColumnIndexMap(columnMap) {
  createColumnIndexMapFromHeader(line) {
    const defaultColumnMap = this.defaultColumnMap;
    const columnMap = this.columnMap;
    let columnIndexMap = {};
    const fields = line.split(this.separator).map((field) => field.trim().toLowerCase());

    this._info(`- First Line: ${line}`);
    this._info(`- Column Count: ${fields.length}`);

    // Check that all keys are valid
    const validKeys = Object.keys(defaultColumnMap);
    const columnKeys = Object.keys(columnMap);
    for (const key of columnKeys) {
      if (!validKeys.includes(key)) {
        this._fail(`- Invalid column key: ${key}`);
      }
    }

    if (this.noHeader) {
      this._info('- Header: No');
      columnIndexMap = {...columnMap};
      // Parse values as integers
      for (const key of Object.keys(columnIndexMap)) {
        columnIndexMap[key] = parseInt(columnIndexMap[key]);
      }
      // Check that the columnMap values are all integers
      if (Object.values(columnIndexMap).some((value) => isNaN(value))) {
        this._fail(`- ColumnMap values must be integers when there is no header`);
      }
      // Check that largest value is less than the number of columns
      const maxIndex = Math.max(...Object.values(columnIndexMap));
      if (maxIndex >= fields.length) {
        this._fail(`- ColumnMap values must be less than the number of columns`);
      }
    } else {
      this._info('- Header: Yes');
      // Check that provided column names are in the header
      for (const value of Object.values(columnMap)) {
        const index = fields.indexOf(value.toLowerCase());
        if (index === -1) {
          this._fail(`- Column not found in header: ${value}`);
        }
      }

      // Combine the default column map with the provided column map
      const newColumnMap = {...this.defaultColumnMap, ...columnMap};

      // Convert to values to indexes using the header
      // Missing (non-required) columns columns will be removed
      const newColumnMapKeys = Object.keys(newColumnMap);
      const requiredColumnKeys = ['start', 'stop'];
      for (const key of newColumnMapKeys) {
        const index = fields.indexOf(newColumnMap[key].toLowerCase());
        if (index === -1) {
          if (requiredColumnKeys.includes(key)) {
            this._fail(`- Required Column Missing: ${newColumnMap[key]}`);
          }
        } else {
          columnIndexMap[key] = index;
        }
      }
    }

    // Remove any columns that are not in the onlyColumns list (if present)
    if (this.onlyColumns.length) {
      for (const key of Object.keys(columnIndexMap)) {
        if (!this.onlyColumns.includes(key)) {
          delete columnIndexMap[key];
        }
      }
    }

    // iterate over field names and print out the index and the name
    this._info("- Column Key Mapping:")
    this._info(`    #       Key${this.hasHeader ? '   Column Name' : ''}`)
    for (const [index, origColumn] of fields.entries()) {
      const keyColumn = Object.keys(columnIndexMap).find(key => columnIndexMap[key] === index) || 'ignored';
      this._info(`  - ${index}: ${keyColumn.padStart(8)}${this.hasHeader ? ` - ${origColumn}` : ''}`);
    }

    return columnIndexMap;

    // Check for required columns
    // const requiredKeys = ['start', 'stop'];
    // for (const key of requiredKeys) {
    //   if (!columnKeys.includes(key)) {
    //     this._fail(`- Missing required column: ${key}`);
    //   }
    // }
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
    let line;
    for (line of lines) {
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
          this.columnIndexMap = this.createColumnIndexMapFromHeader(line);
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
  // TODO: handle no header line
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
    const colMap = this.columnIndexMap;
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
    // const errors = this.errors;
    // ThickStart and ThickEnd Warnings
    // const thickStartErrors = errors['thickStartNotMatchingStart'] || [];
    // if (thickStartErrors.length) {
    //   this._warn(`- Features where thickStart != start: ${thickStartErrors.length}`);
    // }
    // const thickEndErrors = errors['thickEndNotMatchingEnd'] || [];
    // if (thickEndErrors.length) {
    //   this._warn(`- Features where thickEnd != stop: ${thickStartErrors.length}`);
    // }
    // if (thickStartErrors.length || thickEndErrors.length) {
    //   this._warn(`- NOTE: thickStart and thickEnd are ignored by this parser`);
    // }

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