import Logger from './Logger.js';
import SequenceFile from './SequenceFile.js';
import * as helpers from './Helpers.js';

// INPUT:
// - SequenceFile or string of sequence file (e.g. GenBank, FASTA) that can be converted to SequenceFile
// OPTIONS:
// - config: jsonConfig
// - skipTypes: boolean (TEST) [Default: ['gene', 'source', 'exon']]
//   - If false, include ALL feature types in the JSON
// - includeQualifiers: boolean [Defualt: false]
//   - If true, include ALL qualifiers in the JSON
//   - If array of strings, include only those qualifiers
//   - If false, include NO qualifiers
// - includeCaption: boolean [Defualt: true]
//   - NOTE: captions could come from the config (like I did for cgview_builder.rb)
// - skipComplexLocations: boolean (not implemented yet) [Defualt: true]
//   - need to decide how to handle these
// - maxLogCount: number (undefined means no limit) [Default: undefined]

// LOGGING (including from sequence file)
// - start with date and version (and options: skipTypes, includeQualifiers, skipComplexLocations)
export default class CGViewBuilder {

  constructor(input, options = {}) {
    // this.input = input;
    this.version = "1.6.0";
    this.options = options;
    this.logger = options.logger || new Logger();
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    this._success = true;
    this._status = 'success';
    this.includeQualifiers = options.includeQualifiers || false;
    this.includeCaption = (options.includeCaption === undefined) ? true : options.includeCaption;
    this.defaultTypesToSkip = ['gene', 'source', 'exon'];

    this.seqFile = this._parseInput(input);
    this.inputType = this.seqFile.inputType
    this.sequenceType = this.seqFile.sequenceType
    if (this.seqFile.success === true) {
      this._json = this._convert(this.seqFile.records);
    } else {
      this._fail('*** Cannot convert to CGView JSON because parsing sequence file failed ***');
    }
  }

  // Should be one of: 'success', 'warnings', 'fail'
  get success() {
    // return this._success;
    return this.status === 'success';
  }

  get passed() {
    return this.status === 'success' || this.status === 'warnings';
  }

  get status() {
    return this._status;
  }

  _fail(message) {
    this.logger.error(message);
    // this._success = false;
    this._status = 'fail';
  }

  _warn(message) {
    this.logger.warn(message);
    if (this.status !== 'fail') {
      this._status = 'warnings';
    }
  }

  _parseInput(input) {
    // console.log("Parse input")
    if (typeof input === "string") {
      return new SequenceFile(input, {logger: this.logger});
    } else if (input instanceof SequenceFile) {
      return input;
    } else {
      this._fail("Invalid input: must be a string (from GenBank, EMBL, FASTA, Raw) or SequenceFile object");
      // throw new Error("Invalid input");
    }
  }

  _convert(seqRecords) {
    // this.logger.info(`Converting ${seqRecord.length} sequence record(s) to CGView JSON (version ${this.version})`);
    this._skippedFeaturesByType = {};
    this._skippedComplexFeatures = [];
    this._skippedLocationlessFeatures = [];
    this.logger.info(`Date: ${new Date().toUTCString()}`);
    this.logger.info(`Converting to CGView JSON...`);
    this.logger.info(`- CGView JSON version ${this.version}`);
    this.logger.info(`- Input Sequence Count: ${seqRecords.length}`);
    this.logger.info(`- Input File Type: ${this.inputType || 'Unknown'}`);
    this.logger.info(`- Input Sequence Type: ${this.sequenceType || 'Unknown'}`);
    // Check for records and make sure they are DNA
    if (!seqRecords || seqRecords.length < 1) {
      this._fail("Conversion Failed: No sequence records provided");
      return;
    }
    if (this.sequenceType?.toLowerCase() !== 'dna') {
      this._fail(`Conversion Failed: Input type is not DNA: '${this.sequenceType}'`);
      return;
    }
    // Here json refers to the CGView JSON
    let json = this._addConfigToJSON({}, this.options.config); 
    // Version: we should keep the version the same as the latest for CGView.js
    json.version = this.version;
    this._adjustContigNames(seqRecords);
    json.captions = this._getCaptions(json, seqRecords);
    json.settings.format = CGViewBuilder.determineFormat(seqRecords);
    json = this._extractSequenceAndFeatures(json, seqRecords);
    this._summarizeSkippedFeatures()
    this._adjustFeatureGeneticCode(json)
    this._logQualifiers();
    // json.name = json.sequence?.contigs[0]?.name || "Untitled";
    json.name = seqRecords[0]?.definition || seqRecords[0]?.name || seqRecords[0]?.seqID || "Untitled";
    json = this._removeUnusedLegends(json);
    // Add track for features (if there are any)
    json.tracks = this._buildTracks(json, this.inputType);
    this._convertSummary(json);
    return { cgview: json };
  }

  _getCaptions(json, seqRecords) {
    const captions = json.captions ? [...json.captions] : [];
    // console.log(this.includeCaption)
    if (this.includeCaption) {
      this.logger.info(`- Adding caption...`);
      const captionText = seqRecords[0]?.definition || seqRecords[0].seqID || "Untitled";
      const caption = {name: captionText, textAlignment: "center", font: "sans-serif,plain,24", fontColor: "darkblue", position: "bottom-center"}
      captions.push(caption);
    }
    return captions;
  }

  _logQualifiers() {
    let qualifiersToInclude = "none";
    if (this.includeQualifiers === true) {
      qualifiersToInclude = "all";
    } else if (Array.isArray(this.includeQualifiers)) {
      qualifiersToInclude = this.includeQualifiers.join(', ');
    }
    this.logger.info(`- Extracted Qualifiers: ${qualifiersToInclude} `);
  }

  _convertSummary(json) {
    const contigs = json.sequence?.contigs || [];
    const contigCount = contigs.length || 0;
    const featureCount = json.features?.length || 0;
    const trackCount = json.tracks?.length || 0;
    const legendCount = json.legend?.items?.length || 0;
    const seqLength = contigs.map((contig) => contig.length).reduce((a, b) => a + b, 0);
    let skippedFeatures = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
    skippedFeatures += this._skippedComplexFeatures.length;
    skippedFeatures += this._skippedLocationlessFeatures.length;
    this.logger.break('--------------------------------------------\n')
    this.logger.info('CGView JSON Summary:');
    this.logger.info(`- Map Name: ${json.name.padStart(19)}`);
    this.logger.info(`- Contig Count: ${contigCount.toLocaleString().padStart(15)}`);
    this.logger.info('- Total Length (bp): ' + `${seqLength.toLocaleString()}`.padStart(10));
    this.logger.info(`- Track Count: ${trackCount.toLocaleString().padStart(16)}`);
    this.logger.info(`- Legend Count: ${legendCount.toLocaleString().padStart(15)}`);
    this.logger.info(`- Features Included: ${featureCount.toLocaleString().padStart(10)}`);
    this.logger.info(`- Features Skipped: ${skippedFeatures.toLocaleString().padStart(11)}`);
    if (this.success) {
      this.logger.info('- Status: ' + 'Success'.padStart(21), {icon: 'success'});
    } else if (this.status === 'warnings') {
      this.logger.warn('- Status: ' + 'Warnings'.padStart(21), {icon: 'warn'});
    } else {
      this.logger.error('- Status: ' + 'FAILED'.padStart(21), {icon: 'fail'});
    }
    this.logger.break('--------------------------------------------\n')
  }

  _summarizeSkippedFeatures() {
    // Skipped Types
    const skippedFeatures = this._skippedFeaturesByType;
    const skippedFeatureCount = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
    if (Object.keys(skippedFeatures).length > 0) {
      this.logger.info(`- Skipped features (${skippedFeatureCount}) by type:`)
      for (const [key, value] of Object.entries(skippedFeatures)) {
        this.logger.info(`  - ${key}: ${value.toLocaleString().padStart(15 - key.length)}`);
      }
    }
    // Complex Locations
    const complexFeatures = this._skippedComplexFeatures;
    const complexCount = complexFeatures.length;
    if (complexCount > 0) {
      this.logger.info(`- Skipped features (${complexCount}) with complex locations:`);
      const messages = complexFeatures.map((f) => `  - ${f.type} '${f.name}': ${f.locationText}`);
      this.logger.info(messages);
    }
    // Missing Locations
    const locationlessFeatures = this._skippedLocationlessFeatures;
    const locationlessCount = locationlessFeatures.length;
    if (locationlessCount > 0) {
      this._warn(`- Skipped features (${locationlessCount}) with missing locations:`);
      const messages = locationlessFeatures.map((f) => `  - ${f.type} '${f.name}': ${f.locationText}`);
      this._warn(messages);
    }
  }

  // Add config to JSON. Note that no validation of the config is done.
  _addConfigToJSON(json, config) {
    const configKeys = config ? Object.keys(config) : ['none'];
    this.logger.info(`- Config properties provided: ${configKeys.join(', ')}`);

    json.settings = (config && config.settings) ? config.settings : {};
    json.backbone = (config && config.backbone) ? config.backbone : {};
    json.ruler = (config && config.ruler) ? config.ruler : {};
    json.dividers = (config && config.dividers) ? config.dividers : {};
    json.annotation = (config && config.annotation) ? config.annotation : {};
    json.sequence = (config && config.sequence) ? config.sequence : {};
    json.legend = (config && config.legend) ? config.legend : {};
    json.tracks = (config && config.tracks) ? config.tracks : [];

    return json;
  }

  // Adjust contig names:
  // - to be unique by adding a number to the end of duplicate names
  // - replace nonstandard characters with underscores
  // - length of contig names should be less than 37 characters
  _adjustContigNames(seqRecords) {
    const names = seqRecords.map((seqRecord) => seqRecord.name);
    const adjustedNameResults = CGViewBuilder.adjustContigNames(names);
    const adjustedNames = adjustedNameResults.names;
    const reasons = adjustedNameResults.reasons;
    this.logger.info('- Checking contig names...');
    const changedNameIndexes = Object.keys(reasons);
    if (changedNameIndexes.length > 0) {
      // Change SeqRecord names
      seqRecords.forEach((seqRecord, i) => {
        seqRecord.name = adjustedNames[i];
      });
      // Log details
      this._warn(`The following contig names (${changedNameIndexes.length}) were adjusted:`);
      this._warn(`Reasons: DUP (duplicate), LONG (>34), REPLACE (nonstandard characters), BLANK (empty)`);
      const messages = [];
      changedNameIndexes.forEach((i) => {
        const reason = reasons[i];
        messages.push(`- [${reason.index + 1}] ${reason.origName} -> ${reason.newName} (${reason.reason.join(', ')})`);
        // this.logger.warn(`- [${reason.index + 1}] ${reason.origName} -> ${reason.newName} (${reason.reason.join(', ')})`);
      });
      this._warn(messages);

    }
  }

  // Check what the most common genetic code is in the features
  // Set the default genetic code to the most common one
  // Features with the default genetic code do not need to have the genetic code specified
  // We will only keep the genetic code for a feature if is different the common case.
  _adjustFeatureGeneticCode(json) {
    const features = json.features;
    if (!features || features.length < 1) { return; }
    const cdsFeatures = features.filter((f) => f.type === 'CDS');
    if (!cdsFeatures || cdsFeatures.length < 1) { return; }
    const geneticCodes = cdsFeatures.map((f) => f.geneticCode);
    const counts = {};
    geneticCodes.forEach((code) => {

      counts[code] = counts[code] ? counts[code] + 1 : 1;
    });
    let maxCode = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    this.logger.info(`- Most common genetic code (transl_table): ${maxCode} (Count: ${counts[maxCode]}/${cdsFeatures.length} CDS features}`);
    if (Object.keys(counts).length > 1) {
      this._warn(`- Additional genetic codes found: ${Object.keys(counts).join(', ')}`);
    }
    // Set the JSON genetic code to the most common one
    json.settings.geneticCode = parseInt(maxCode);
    // Remove common genetic code from features
    json.features.forEach((f) => {
      if (f.type === 'CDS' && f.geneticCode === parseInt(maxCode)) {
        delete f.geneticCode;
      }
    });
  }

  // Based on seq records, determine the format of the sequence:
  // Default wil be "circular" unless there is only one sequence and it is linear
  static determineFormat(seqRecords=[]) {
    if (seqRecords.length > 1) {
      return "circular";
    } else if (seqRecords[0]?.topology === 'linear') {
      return "linear";
    } else {
      return "circular";
    }
  }


  // Given an array of sequence names, returns an object with:
  // - names: an array of corrected sequence names
  // - reasons: an array of object reasons for the correction:
  //   - index: the index of the name in the original array
  //   - origName: the original name
  //   - newName: the corrected name
  //   - reason: the reason for the correction
  //     (e.g. "duplicate", "too long", "nonstandard characters", "blank")
  //     (e.g. "DUP", "LONG", "REPLACE", "BLANK"
  static adjustContigNames(names=[]) {
    // console.log(names)
    const reasons = {};
    // Replace nonstandard characters
    // Consider adding (.:#) here: https://www.ncbi.nlm.nih.gov/genbank/fastaformat/
    // - do any of these break Crispr/Other tools
    let replacedNames = names.map((name) => name.replace(/[^a-zA-Z0-9\*\_\-]+/g, '_'));
    names.forEach((name, i) => {
      if (name !== replacedNames[i]) {
        reasons[i] = {index: i, origName: name, newName: replacedNames[i], reason: ["REPLACE"]};
      }
    });
    // Blank names
    // NOTE: Blank names should not have been changed by above (they would have been replaced with '_')
    // - So we don't need to push to reasons, we can just set he reason here
    replacedNames.forEach((name, i) => {
      const newName = 'Unknown';
      if (name === '') {
        replacedNames[i] = newName;
        reasons[i] = {index: i, origName: name, newName: newName, reason: ["BLANK"]};
      }
    });
    // Shorten names
    replacedNames.forEach((name, i) => {
      if (name.length > 34) {
        replacedNames[i] = name.slice(0, 34);
        if (reasons[i]) {
          reasons[i].newName = replacedNames[i];
          reasons[i].reason.push("LONG");
        } else {
          reasons[i] = {index: i, origName: name, newName: replacedNames[i], reason: ["LONG"]};
        }
      }
    });
    // Make names unique
    const finalNames = [];
    replacedNames.forEach((name, i) => {
      const newName = helpers.uniqueName(name, finalNames);
      finalNames.push(newName);
      if (newName !== name) {
        if (reasons[i]) {
          reasons[i].newName = newName;
          reasons[i].reason.push("DUP");
        } else {
          reasons[i] = {index: i, origName: name, newName: newName, reason: ["DUP"]};
        }
      }
    });

    return {names: finalNames, reasons: Object.values(reasons)};
  }

  // TODO: contig names MUST BE UNIQUE
  _extractSequenceAndFeatures(json, seqJson) {
    const contigs = [];
    const features = [];
    this._skippedTypesSetup();
    seqJson.forEach((seqRecord) => {
      contigs.push({name: seqRecord.name, length: seqRecord.sequence.length, seq: seqRecord.sequence});
      const contigFeatures = this._extractFeatures(seqRecord, seqRecord.name, seqRecord.inputType);
      features.push(...contigFeatures);
    });
    json.sequence = {contigs};
    json.features = features;
    return json;
  }

  _skippedTypesSetup() {
    const options = this.options;
    if (options.skipTypes === false) {
      this.featuresToSkip = [];
    } else if (Array.isArray(options.skipTypes)) {
      this.featuresToSkip = options.skipTypes;
    } else {
      this.featuresToSkip = this.defaultTypesToSkip;
    }
    const skipTypes = this.featuresToSkip.length === 0 ? "none" : this.featuresToSkip.join(', ');
    this.logger.info(`- Feature types to skip: ${skipTypes}`);
  }

  // Onlys adds a Features track if there are features
  // Other tracks may come from the config (in which case they are already added to the JSON)
  _buildTracks(json, inputType) {
    const tracks = json.tracks || [];
    if (json.features && json.features.length > 0) {
      tracks.push({
        name: 'Features',
        separateFeaturesBy: 'strand',
        position: 'both',
        dataType: 'feature',
        dataMethod: 'source',
        dataKeys: `${inputType}-features`,
      });
    }
    return tracks;
  }

  // TODO: Remove legends from config that are not used
  _removeUnusedLegends(json) {
    const legendItems = json.legend?.items || [];
    if (legendItems.length === 0) { return json; }
    const featureLegends = json.features?.map((f) => f.legend) || [];
    const uniqueFeatureLegends = [...new Set(featureLegends)];
    const filteredLegendItems = legendItems.filter((i) => uniqueFeatureLegends.includes(i.name));
    json.legend.items = filteredLegendItems;
    return json
  }

  _extractFeatures(seqContig, contigName, inputType) {
    const features = [];
    const source = inputType ? `${inputType}-features` : "features";
    for (const f of seqContig.features) {
      if (this.featuresToSkip.includes(f.type)) {
        this._skippedFeaturesByType[f.type] = this._skippedFeaturesByType[f.type] ? this._skippedFeaturesByType[f.type] + 1 : 1;
        continue;
      }
      if (f.locations.length > 1) {
        this._skippedComplexFeatures.push(f);
        continue;
      }
      if (f.locations.length < 1) {
        this._skippedLocationlessFeatures.push(f);
        continue;
      }
      const feature = {
        start: f.start,
        stop: f.stop,
        strand: f.strand,
        name: f.name,
        type: f.type,
        contig: contigName,
        source,
        legend: f.type,
      };
      // codonStart (from codon_start)
      if (f.qualifiers && f.qualifiers.codon_start && parseInt(f.qualifiers.codon_start[0]) !== 1) {
        feature.codonStart = parseInt(f.qualifiers.codon_start[0]);
      }
      // geneticCode (from transl_table)
      if (feature.type === 'CDS') {
        const geneticCode = f.qualifiers && f.qualifiers.transl_table && parseInt(f.qualifiers.transl_table[0]);
        // The default genetic code for GenBank/EMBL is 1
        feature.geneticCode = geneticCode || 1;
      }
      const qualifiers = CGViewBuilder.extractQualifiers(f.qualifiers, this.includeQualifiers);
      if (qualifiers) {
        feature.qualifiers = qualifiers;
      }

      // Add feature to list
      features.push(feature);
    };
    return features;
  }

  static extractQualifiers(qualifiersIn, includeQualifiers) {
    let qualifiersOut = {};

    if (includeQualifiers === true && qualifiersIn) {
      qualifiersOut = qualifiersIn;
    } else if (Array.isArray(includeQualifiers)) {
      includeQualifiers.forEach((q) => {
        if (qualifiersIn[q] !== undefined) {
          qualifiersOut[q] = qualifiersIn[q];
        }
      });
    }

    if (Object.keys(qualifiersOut).length > 0) {
      return qualifiersOut;
    }
  }

  toJSON() {
    return this._json;
  }

  static fromSequenceText(text, options) {
    const logger = new Logger({logToConsole: false, showIcons: true});
    const builder = new CGViewBuilder(text, {logger: logger, ...options});
    return {json: builder.toJSON(), log: builder.logger.history()};
  }



}
