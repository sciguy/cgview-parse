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

// LOGGING (including from sequence file)
// - start with date and version (and options: skipTypes, includeQualifiers, skipComplexLocations)
// - provide summary of CGView JSON (contigs, features, tracks, legends)
// - total number of features skipped

// TODO:
// - FAIL if sequence type is protein
// - better binary check see example proksee5.txt
// - add name to CGView JSON summary
// - Read over cgview_builder.rb script
// - genetic code, codon_start

export class SeqRecordsToCGVJSON {

  constructor(seqRecords, options = {}) {
    this.version = "1.6.0";
    this.options = options;
    this.logger = options.logger || new Logger();
    this.seqRecords = seqRecords;
    this.inputType = seqRecords && seqRecords[0]?.inputType;
    this.defaultTypesToSkip = ['gene', 'source', 'exon'];

    this.json = this._convert(seqRecords);
  }

  _convert(seqRecords) {
    // this.logger.info(`Converting ${seqRecord.length} sequence record(s) to CGView JSON (version ${this.version})`);
    this._skippedFeaturesByType = {};
    this._skippedComplexFeatures = [];
    this.logger.info(`Converting to CGView JSON...`);
    this.logger.info(`- CGView JSON version ${this.version}`);
    this.logger.info(`- Input Sequence Count: ${seqRecords.length}`);
    // Here json refers to the CGView JSON
    let json = this._addConfigToJSON({}, this.options.config); 
    // Version: we should keep the version the same as the latest for CGView.js
    json.version = this.version;
    json = this._extractSequenceAndFeatures(json, seqRecords);
    this._summarizeSkippedFeatures()
    json.name = json.sequence?.contigs[0]?.name || "Untitled";
    json = this._removeUnusedLegends(json);
    // Add track for features (if there are any)
    json.tracks = this._buildTracks(json, this.inputType);
    this._convertSummary(json);
    return { cgview: json };
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
    this.logger.break('------------------------------------------\n')
    this.logger.info('CGView JSON Summary:');
    this.logger.info(`- Contig Count: ${contigCount.toLocaleString().padStart(15)}`);
    this.logger.info('- Total Length (bp): ' + `${seqLength.toLocaleString()}`.padStart(10));
    this.logger.info(`- Track Count: ${trackCount.toLocaleString().padStart(16)}`);
    this.logger.info(`- Legend Count: ${legendCount.toLocaleString().padStart(15)}`);
    this.logger.info(`- Features Included: ${featureCount.toLocaleString().padStart(10)}`);
    this.logger.info(`- Features Skipped: ${skippedFeatures.toLocaleString().padStart(11)}`);
    this.logger.break('------------------------------------------\n')
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
      const exampleCount = Math.min(5, complexFeatures.length);
      this.logger.info(`- Skipped features (${complexCount}) with complex locations:`);
      complexFeatures.slice(0, exampleCount).forEach(f => this.logger.info(`  - ${f.type} '${f.name}': ${f.locationText}`));
      if (complexCount > exampleCount) {
        this.logger.info(`  - ${complexCount - exampleCount} more not shown (${complexCount.toLocaleString()} total)`);
      }
    }

  }

  // Add config to JSON. Note that no validation of the config is done.
  _addConfigToJSON(json, config) {
    const configKeys = config ? Object.keys(config) : ['none'];
    this.logger.info(`- Config properties provided: ${configKeys.join(', ')}`);

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
    // const skippedFeatures = {};
    // const complexFeatures = [];
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
    return features;
  }

}
