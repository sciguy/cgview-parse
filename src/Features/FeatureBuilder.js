import Status from '../Support/Status.js';
import Logger from '../Support/Logger.js';
import FeatureFile from './FeatureFile.js';
import CGViewBuilder from '../Sequence/CGViewBuilder.js';
import * as helpers from '../Support/Helpers.js';

// INPUT:
// - FeatureFile or string of feature file (e.g. GFF3, GTF, BED, CSV) that can be converted to FeatureFile
// OPTIONS:
// - FIXME: CHANGE TO includ/excludeFeatures skipTypes: boolean (TEST) [Default: ['gene', 'source', 'exon']]
//   - If false, include ALL feature types in the JSON
// - includeFeatures: boolean [Default: true]
//   - If true, include ALL feature types in the JSON
//   - If array of strings, include only those feature type
//   - If false, include NO features
// - excludeFeatures: array of string [Default: undefined]
//   - include all feature types except for these
//   - ignored unless includeFeatures is true
// - includeQualifiers: boolean [Default: false]
//   - If true, include ALL qualifiers in the JSON
//   - If array of strings, include only those qualifiers
//   - If false, include NO qualifiers
// - excludeQualifiers: array of string [Default: undefined]
//   - include all qualifiers except for these
//   - ignored unless includeQualifiers is true
// - maxLogCount: number (undefined means no limit) [Default: undefined]

export default class FeatureBuilder extends Status {

  constructor(input, options = {}) {
    super(options, 'BUILDING FEATURES');

    this.includeFeatures = (options.includeFeatures === undefined) ? true : options.includeFeatures;
    this.excludeFeatures = options.excludeFeatures || ['gene', 'source', 'exon'];
    this.includeQualifiers = options.includeQualifiers || false;
    this.excludeQualifiers = options.excludeQualifiers || [];

    this.featureFile = this._parseInput(input);
    this.inputDisplayFormat = this.featureFile.displayFileFormat
    if (this.featureFile.passed) {
      this._json = this._build(this.featureFile.records);
    } else {
      this._fail('*** Cannot convert to CGView Feature JSON because feature file parsing failed ***');
    }
  }

  toJSON() {
    return this._json;
  }

  _parseInput(input) {
    // console.log("Parse input")
    if (typeof input === "string") {
      return new FeatureFile(input, {logger: this.logger});
    } else if (input instanceof FeatureFile) {
      return input;
    } else {
      this._fail("Invalid input: must be a string (from GFF3, GTF, BED, CSV) or FeatureFile object");
    }
  }

  _build(records) {
    const features = [];
    this._skippedFeaturesByType = {};
    this._complexFeatures = [];
    this._skippedLocationlessFeatures = [];
    // this.logger.info(`Date: ${new Date().toUTCString()}`);
    this.logger.info('FeatureBuilder: ', { padded: this.version });
    this.logger.info(`Converting to CGView Feature JSON...`);
    this.logger.info('- Input File Format: ', { padded: (this.inputDisplayFormat || 'Unknown') });
    this.logger.info('- Input Feature Count: ', { padded: records.length });
    // Check for records
    if (!records || records.length < 1) {
      this._fail("Conversion Failed: No feature records provided");
      return;
    }

    // this._summarizeSkippedFeatures()
    // this._adjustFeatureGeneticCode(json)
    // this._qualifiersSetup();
    // if (this._complexFeatures.length > 0) {
    //   this.logger.info(`- Complex Features Found: ${this._complexFeatures.length.toLocaleString()}`);
    // }

    for (const record of records) {
      const feature = this._buildFeature(record);
      if (feature) {
        features.push(feature);
      }
    }
    this._adjustFeatureContigNames(features);
    this._buildSummary(features);
    return features;
  }

  // TODO: LOCATIONS!!!!!!!!!!
  _buildFeature(record) {
    const feature = {};

    if (record.name) { feature.name = record.name; }
    feature.contig = record.contig;
    feature.start = record.start;
    feature.stop = record.stop;
    feature.strand = ["-1", "-", -1].includes(record.strand) ? -1 : 1;
    feature.type = record.type;

    if (!isNaN(Number(record.score))) {
      feature.score = Number(record.score);
    }
    if (record.source) {
      feature.source = record.source;
    }
    // TODO: CODON
    // if (record.frame) {
    //   feature.frame = record.frame;
    // }
    if (record.qualifiers) {
      feature.qualifiers = record.qualifiers;
    }
    if (record.locations) {
      feature.locations = record.locations;
    }
    return feature;
  }

  _buildSummary(features) {
    this.logger.divider();
    this.logger.info('CGView Feature JSON Summary:');
    this.logger.info(`- Feature Count: `, { padded: features.length });
    // this.logger.info(`- Features Included: `, { padded: features.length });
    // this.logger.info(`- Features Skipped: `, { padded: features.length });
    this.logStatusLine()
    this.logger.divider();
  }

  // Adjust contig names:
  // - replace nonstandard characters with underscores
  // - length of contig names should be less than 37 characters
  _adjustFeatureContigNames(features) {
    this.logger.info('- Checking feature contig names...');
    const contigNames = features.map((feature) => feature.contig);
    const uniqueContigNames = [...new Set(contigNames)];
    const adjustedContigNameResults = CGViewBuilder.adjustContigNames(uniqueContigNames);
    const contigNameMap = {};
    adjustedContigNameResults.reasons.forEach((reason) => {
      contigNameMap[reason.origName] = reason.newName;
    });

    const messages = [];
    let featuresChangedCount = 0;
    if (adjustedContigNameResults.reasons.length > 0) {
      // Update Feature contigs
      for (const feature of features) {
        if (contigNameMap[feature.contig]) {
          feature.contig = contigNameMap[feature.contig];
          featuresChangedCount++;
        }
      }
      // Log details
      this.logger.warn(`The following contig names (${adjustedContigNameResults.reasons.length}) were adjusted:`);
      this.logger.warn(`Reasons: DUP (duplicate), LONG (>34), REPLACE (nonstandard characters), BLANK (empty)`);
      for (const reason of adjustedContigNameResults.reasons) {
        messages.push(`- ${reason.origName} -> ${reason.newName} (${reason.reason.join(', ')})`);
      }
      this._warn(messages);
      this._warn(`- Features with adjusted contig names: ${featuresChangedCount}`);
    }
  }


}