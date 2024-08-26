import Logger from '../../Support/Logger.js';
import * as helpers from '../../Support/Helpers.js';

class GFF3FeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return 'gff3';
  }

  get displayFileFormat() {
      return 'GFF3';
  }

  get lineCount() {
    return this._lineCount;
  }

  get nameKeys() {
    return this.options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];
  }

  _fail(message, errorCode='unknown') {
    this.file._fail(message, errorCode);
  }

  // Returns true if the line matches the GFF3 format
  // - line: the first non-empty/non-comment line of the file
  static lineMatches(line) {
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length !== 9) {
      return false;
    } else if (isNaN(fields[3]) || isNaN(fields[4])) {
      return false;
    }
    return true;

  }

  // Parse the GFF3 file
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
    this.logger.info(`- Note: Records with the same 'ID' will be joined into a single record.`);
    this.logger.info(`- Parsed Feature Lines: ${records.length.toLocaleString().padStart(7)}`);
    const joinedRecords = this._joinRecords(records);
    this.logger.info(`- Total Features: ${joinedRecords.length.toLocaleString().padStart(13)}`);

    return joinedRecords;
  }

  // TODO
  // - replace values with undefined if they are "."
  // - lines with the same ID should be combined into a single record
  // - cgv feature name could come from Name or ID
  // - deal with features that wrap around the contig
  //   - requires Is_circular attribute for region
  //   - stop will be larger than seq length to indicate wrapping
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 9) {
      this._fail(`- Line does not have 9 fields: ${line}`);
      // this.logger.error(`- Line does not have 9 fields: ${line}`);
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
      attributes: this._parseAttributes(fields[8]),
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

  // Attributes with predefined meaning: ID, Name, Alias, Parent, Note, Dbxref, Is_circular, Target, Gap, Derives_from, Ontology_term
  _parseAttributes(attributeString) {
    const attributes = {};
    const fields = attributeString.split(';');
    let field;
    for (field of fields) {
      const [key, value] = field.split('=');
      attributes[key] = value.trim();
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

  // Records are joined if they have the same ID
  // TODO: if CDS have the same parent gene, they should be joined
  _joinRecords(records) {
    const joinedRecords = [];
    const recordMap = {};
    let record;
    for (record of records) {
      if (record.attributes.ID) {
        const id = record.attributes.ID;
        if (recordMap[id]) {
          recordMap[id].push(record);
        } else {
          recordMap[id] = [record];
        }
      } else {
        joinedRecords.push(record);
      }
    }
    const ids = Object.keys(recordMap);
    for (let id of ids) {
      const records = recordMap[id];
      if (records.length === 1) {
        joinedRecords.push(records[0]);
      } else {
        const joinedRecord = this._joinRecordGroup(records);
        joinedRecords.push(joinedRecord);
      }
    }
    return joinedRecords;
  }

  _joinRecordGroup(records) {
    if (records.length === 1) { return records[0]; }
    // Sort records by start position
    records.sort((a, b) => a.start - b.start);

    // Start with first record as the base
    const joinedRecord = {...records[0]};

    // Join locations
    const locations = [];
    for (let record of records) {
      locations.push([record.start, record.stop]);
    }
    joinedRecord.locations = locations;
    joinedRecord.stop = locations[locations.length - 1][1];

    // Merge qualifiers and attributes
    for (let record of records) {
      joinedRecord.qualifiers = {...joinedRecord.qualifiers, ...record.qualifiers};
      joinedRecord.attributes = {...joinedRecord.attributes, ...record.attributes};
    }

    return joinedRecord;
  }

  validateRecords(records) {
    const errors = this.errors;
  }

}

export default GFF3FeatureFile;