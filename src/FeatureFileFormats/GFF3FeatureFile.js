import Logger from '../Logger.js';
import * as helpers from '../Helpers.js';

class GFF3FeatureFile {

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
      return 'gff3';
  }

  get displayFileFormat() {
      return 'GFF3';
  }

  get nameKeys() {
    return this.options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];
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
    this.logger.info(`- Parsed ${records.length} record`);
    return records;
  }

  // TODO
  // - replace values with undefined if they are "."
  // - lines with the same ID should be combined into a single record
  // - cgv feature name could come from Name or ID
  // - deal with features that wrap around the contig
  //   - requires Is_circular attribute for region
  //   - stop will be larger than seq length to indicate wrapping
  _parseLine(line) {
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

export default GFF3FeatureFile;