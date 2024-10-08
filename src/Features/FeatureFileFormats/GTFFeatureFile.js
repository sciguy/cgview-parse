import Logger from '../../Support/Logger.js';
import * as helpers from '../../Support/Helpers.js';

class GTFFeatureFile {

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
      return 'gtf';
  }

  get displayFileFormat() {
      return 'GTF';
  }

  get lineCount() {
    return this._lineCount;
  }

  get nameKeys() {
    return this.options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];
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
  /////////////////////////////////////////////////////////////////////////////


  // Returns true if the line matches the GTF format
  // - line: the first non-empty/non-comment line of the file
  static lineMatches(line) {
    const adjustedLine = line.replace(/\s+#[^"]+$/, '');
    const fields = adjustedLine.split('\t').map((field) => field.trim());
    const attributes = fields[8]?.split('; ') || [];
    if (fields.length !== 9) {
      return false;
    } else if (isNaN(fields[3]) || isNaN(fields[4])) {
      return false;
    } else if (attributes.length < 2) {
      // requried to have at least 2 attributes
      return false;
    } else if (!attributes[0].startsWith('gene_id')) {
      return false;
    }
    return true;
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
    this._info(`- Note: Records (CDS, start/stop_codon) with the same 'transcript_id' will be joined into a single CDS record.`);
    // this.logger.info(`- Parsed Feature Lines: ${records.length.toLocaleString().padStart(7)}`);
    this._info('- Parsed Feature Lines: ', { padded: records.length });
    const joinedRecords = this._joinRecords(records);
    // const joinedRecords = records;
    // this.logger.info(`- Total Features: ${joinedRecords.length.toLocaleString().padStart(13)}`);
    this._info('- Total Features: ', { padded: joinedRecords.length });

    return joinedRecords;
  }

  // TODO
  // - replace values with undefined if they are "."
  // - lines with the same ID should be combined into a single record
  // - may need to remove comments at the end of lines '#'
  _parseLine(line) {
    this._lineCount++;
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
      valid: true,
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

  // Records are joined if they have the same ID
  // Only join CDS/start_codon/stop_codon records if they have the same transcript_id
  // NOTE:
  // - The "start_codon" feature is up to 3bp long in total and is included in the coordinates for the "CDS" features.
  // - The "stop_codon" feature similarly is up to 3bp long and is excluded from the coordinates for the "3UTR" features, if used.
  // - Start/Stop codons can be split across distict features (multiple lines)
  _joinRecords(records) {
    const joinedRecords = [];
    const recordMap = {};
    const groupTypes = ['CDS', 'start_codon', 'stop_codon'];
    let record;
    for (record of records) {
      const transcriptID = record.attributes.transcript_id;
      if (transcriptID && groupTypes.includes(record.type)) {
        if (recordMap[transcriptID]) {
          recordMap[transcriptID].push(record);
        } else {
          recordMap[transcriptID] = [record];
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

  // Groups should only contain CDS, start_codon, and stop_codon records
  // Skip start_codon records
  // Add stop_codon records
  _joinRecordGroup(records) {
    if (records.length === 1) { return records[0]; }
    // Sort records by start position
    records.sort((a, b) => a.start - b.start);

    // Remove start_codon records (they should already be included in the CDS records)
    // TODO: add warning if start_codon is not included in CDS
    records = records.filter((record) => record.type !== 'start_codon');

    // Start with first record as the base
    const joinedRecord = {...records[0]};

    if (joinedRecord.type !== 'CDS') {
      if (records.some((record) => record.type === 'CDS')) {
        joinedRecord.type = 'CDS';
      } else {
        this._warn(`- No CDS records for this group: ${records  }`);
      }
    }

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
    // GTF specific validations
  }

}

export default GTFFeatureFile;