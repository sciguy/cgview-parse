import Logger from '../Logger.js';
import * as helpers from '../Helpers.js';

class GTFFeatureFile {

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
      return 'gtf';
  }

  get displayFileFormat() {
      return 'GTF';
  }

  get nameKeys() {
    return this.options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];
  }

  parse(fileText, options={}) {
    const records = [];
    const lines = fileText.split('\n');
    let line;
    for (line of lines) {
      if (line.startsWith('##')) {
        // This is a meta line
        // Do nothing
      } else if (line.startsWith('#')) {
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
  // - replace values with undefined if they are "."
  // - lines with the same ID should be combined into a single record
  // - may need to remove comments at the end of lines '#'
  _parseLine(line) {
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 9) {
      this._fail(`- Line does not have 9 fields: ${line}`);
      // this.logger.warn(`- Skipping line: ${line}`);
      return null;
    }
    const record = {
      contig: fields[0],
      source: fields[1],
      type: this._parseType(fields[2]),
      start: parseInt(fields[3]),
      stop: parseInt(fields[4]),
      score: fields[5],
      strand: fields[6],
      phase: fields[7],
      attributes: this._parseGTFAttributes(fields[8]),
      qualifiers: {},
    };
    const qualifiers = this._extractQualifiers(record);
    if (Object.keys(qualifiers).length > 0) {
      record.qualifiers = qualifiers;
    }
    record.name = this._extractName(record, this.nameKeys);
    return record;
  }

  _parseType(type) {
    const soTerm = helpers.SO_TERMS[type];
    return soTerm || type;
  }

  // Attributes with predefined meaning: gene_id, transcript_ID
  _parseGTFAttributes(attributeString) {
    const attributes = {};
    const fields = attributeString.split('; ');
    // HERE: use regex to split key values. value may be in quotes
    for (let field of fields) {
      let match = field.match(/\s*(\S+)\s+"([^"]+)"/);
      if (match) {
        const key = match[1];
        const value = match[2];
        if (attributes[key]) {
          if (Array.isArray(attributes[key])) {
            attributes[key].push(value);
          } else {
            attributes[key] = [attributes[key], value];
          }
        } else {
          attributes[key] = value;
        }
      }
    }
    return attributes;
  }

  _extractQualifiers(record) {
    const attributes = record.attributes || {};
    const qualifiers = {};
    const keys = Object.keys(attributes);
    let key;
    for (key of keys) {
      if (helpers.QUALIFIERS.includes(key)) {
        qualifiers[key] = attributes[key];
        // qualifiers.push({ key, value: attributes[key] });
      } else if (key === 'Dbxref') {
        qualifiers['db_xref'] = attributes[key];
      } else if (key === 'Note') {
        this._addQualifierNote(qualifiers, attributes[key]);
      } else if (key === 'codons') {
        this._addQualifierNote(qualifiers, `codon recognized: ${attributes[key]}`);
      }
    }
    return qualifiers;
  }

  _addQualifierNote(qualifiers, note) {
    // qualifiers = record.qualifiers;
    if (!qualifiers.note) {
      qualifiers.note = note;
    } else {
      qualifiers.note += `; ${note}`
    }
  }

  _extractName(record, nameKeys) {
    const attributes = record.attributes || {};
    let key;
    for (key of nameKeys) {
      if (attributes[key]) {
        return attributes[key];
      }
    }
    return null;
  }

  // TEMP
  // MOVE TO HELPERS
  _fail(message, errorCode='unknown') {
    this.file._faile(message, errorCode);
    // this.logger.error(message);
    // // this._success = false;
    // this._status = 'failed';
    // this._errorCodes.add(errorCode);
  }


}

export default GTFFeatureFile;