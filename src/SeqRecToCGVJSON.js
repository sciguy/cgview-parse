import Logger from './Logger.js';

// OPTIONS:
// - config: jsonConfig
// - skipTypes: boolean (TEST) [Default: ['gene', 'source', 'exon']]
//   - If false, include ALL feature types in the JSON
// - includeQualifiers: boolean (not implemented yet) [Defualt: false]
//   - If true, include ALL qualifiers in the JSON
//   - If array of strings, include only those qualifiers
//   - ADD TEST FOR THIS
// - skipComplexLocations: boolean (not implemented yet) [Defualt: true]

// LOGING (including from sequence file)
// - start with date and version (and options: skipTypes, includeQualifiers, skipComplexLocations)
// - provide summary of sequence file (input type, number of sequences, number of features)
// - provide summary of CGView JSON (contigs, features, tracks, legends)
// - provide summary of skipped features
// - provide summary of skipped features becuase of complex locations
// - total number of features skipped

export class SeqRecordsToCGVJSON {

  constructor(seqRecords, options = {}) {
    this.version = "1.6.0";
    this.options = options;
    this.logger = options.logger || new Logger();
    this.seqRecords = seqRecords;
    this.inputType = seqRecords[0].inputType;
    this.defaultTypesToSkip = ['gene', 'source', 'exon'];

    this.json = this._convert(seqRecords);
  }

  _convert(seqRecord) {
    this.logger.info(`Converting ${seqRecord.length} sequence record(s) to CGView JSON (version ${this.version})`);
    // Here json refers to the CGView JSON
    let json = this._addConfigToJSON({}, this.options.config); 
    // Version: we should keep the version the same as the latest for CGView.js
    json.version = this.version;
    json = this._extractSequenceAndFeatures(json, seqRecord);
    json.name = json.sequence?.contigs[0]?.name || "Untitled";
    json = this._removeUnusedLegends(json);
    // Add track for features (if there are any)
    json.tracks = this._buildTracks(json, this.inputType);
    return { cgview: json };
  }

  // Add config to JSON. Note that no validation of the config is done.
  _addConfigToJSON(json, config) {
    if (!config) { return json; }
    if (config.settings) { json.settings = config.settings; }
    if (config.backbone) { json.backbone = config.backbone; }
    if (config.ruler) { json.ruler = config.ruler; }
    if (config.dividers) { json.dividers = config.dividers; }
    if (config.annotation) { json.annotation = config.annotation; }
    if (config.sequence) { json.sequence = config.sequence; }
    if (config.legend) { json.legend = config.legend; }
    if (config.tracks) { json.tracks = config.tracks; }
    return json;
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
    this.logger.info(`Features of the following type will be skipped: ${this.featuresToSkip.join(', ')}`);
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
    const featuresToSkip = ['source', 'gene', 'exon']
    const skippedFeatures = {};
    const features = [];
    const source = inputType ? `${inputType}-features` : "features";
    for (const f of seqContig.features) {
      if (featuresToSkip.includes(f.type)) {
        skippedFeatures[f.type] = skippedFeatures[f.type] ? skippedFeatures[f.type] + 1 : 1;
        continue;
      }
      // NEED TO LOG
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
      if (f.qualifiers && f.qualifiers.start_codon && f.qualifiers.start_codon[0] !== 1) {
        feature.start_codon = f.qualifiers.start_codon[0];
      }
      features.push(feature);
    };
    if (Object.keys(skippedFeatures).length > 0) {
      // LOG!!!!
      console.log("Features of the following type are skipped: ...");
      for (const [key, value] of Object.entries(skippedFeatures)) {
        console.log(`${key}: ${value}`);
      }
    }
    return features;
  }

}
