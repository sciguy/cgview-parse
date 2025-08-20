/*!
 * CGParse.js – Sequence & Feature Parser for CGView.js
 * Copyright © 2024–2025 Jason R. Grant
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Status from '../Support/Status.js';
import Logger from '../Support/Logger.js';
import SequenceFile from './SequenceFile.js';
import CodonTable from '../Support/CodonTable.js';
import * as helpers from '../Support/Helpers.js';

// INPUT:
// - SequenceFile or string of sequence file (e.g. GenBank, FASTA) that can be converted to SequenceFile
// OPTIONS:
// TODO:
// - change these to featureTypes and qualifiers with each being an object with {mode, items}
//   - mode: 'include', 'exclude', 'all', 'none'
//   - items: array of strings (feature types or qualifiers) to include or exclude
// - config: jsonConfig
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
// - includeCaption: boolean [Default: true]
//   - NOTE: captions could come from the config (like I did for cgview_builder.rb)
// - maxLogCount: number (undefined means no limit) [Default: undefined]
//
// NOTES:
// - Dashes and periods (ie Gaps) sequences are replaced with Ns
export default class CGViewBuilder extends Status {

  constructor(input, options = {}) {
    // super(options, 'BUILDING CGVIEW JSON');
    super(options);
    // this.input = input;
    this.cgvJSONVersion = "1.7.0";
    // this.options = options;

    // this.includeFeatures = options.includeFeatures || true;
    this.includeFeatures = (options.includeFeatures === undefined) ? true : options.includeFeatures;
    this.excludeFeatures = options.excludeFeatures || ['gene', 'source', 'exon'];
    this.includeQualifiers = options.includeQualifiers || false;
    this.excludeQualifiers = options.excludeQualifiers || [];
    this.includeCaption = (options.includeCaption === undefined) ? true : options.includeCaption;

    this.seqFile = this._parseInput(input);
    this.inputType = this.seqFile.inputType
    this.sequenceType = this.seqFile.sequenceType
    if (this.seqFile.passed === true) {
      try {
        this.logHeader('BUILDING CGVIEW JSON');
        this._json = this._build(this.seqFile.records);
      } catch (error) {
        this._fail('- Failed: An error occurred while building the JSON.', {errorCode: 'parsing'});
        this._fail(`- ERROR: ${error.message}`);
      }
    } else {
      this._fail('*** Cannot convert to CGView JSON because parsing sequence file failed ***');
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

  _build(seqRecords) {
    // this.logger.info(`Converting ${seqRecord.length} sequence record(s) to CGView JSON (version ${this.cgvJSONVersion})`);
    this._skippedFeaturesByType = {};
    this._skippedComplexFeatures = []; // not skipped anymore
    this._complexFeatures = [];
    this._skippedLocationlessFeatures = [];
    this._featuresWithTranslationCount = 0;
    this._featuresWithTranslationMismatches = [];
    // this.logger.info(`Date: ${new Date().toUTCString()}`);
    this.logger.info('CGParse: ', { padded: this.version });
    this.logger.info(`Converting to CGView JSON...`);
    this.logger.info('- CGView JSON version: ', { padded: this.cgvJSONVersion });
    this.logger.info('- Input Sequence Count: ', { padded: seqRecords.length });
    this.logger.info('- Input File Type: ', { padded: this.inputType || 'Unknown' });
    this.logger.info('- Input Sequence Type: ', { padded: this.sequenceType || 'Unknown' });
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
    let json = this._addConfigToJSON({}, this.options.config, seqRecords); 
    // Version: we should keep the version the same as the latest for CGView.js
    json.version = this.cgvJSONVersion;
    this._adjustContigNames(seqRecords);
    // json.captions = this._getCaptions(json, seqRecords);
    json.settings.format = CGViewBuilder.determineFormat(seqRecords);
    json = this._extractSequenceAndFeatures(json, seqRecords);
    this._summarizeSkippedFeatures()
    this._adjustFeatureGeneticCode(json)
    this._qualifiersSetup();
    if (this._complexFeatures.length > 0) {
      this.logger.info('- Complex Features Found: ', { padded: this._complexFeatures.length });
    }
    // json.name = json.sequence?.contigs[0]?.name || "Untitled";
    json.name = seqRecords[0]?.definition || seqRecords[0]?.name || seqRecords[0]?.seqID || "Untitled";
    json = this._removeUnusedLegends(json);
    // Add track for features (if there are any)
    json.tracks = this._buildTracks(json, this.inputType);
    this._buildSummary(json);
    return { cgview: json };
  }

  // _getCaptions(json, seqRecords) {
  //   const captions = json.captions ? [...json.captions] : [];
  //   // console.log(this.includeCaption)
  //   if (this.includeCaption) {
  //     this.logger.info(`- Adding caption...`);
  //     const captionText = seqRecords[0]?.definition || seqRecords[0].seqID || "Untitled";
  //     const caption = {name: captionText, textAlignment: "center", font: "sans-serif,plain,24", fontColor: "darkblue", position: "bottom-center"}
  //     captions.push(caption);
  //   }
  //   return captions;
  // }

  _buildSummary(json) {
    const contigs = json.sequence?.contigs || [];
    const contigCount = contigs.length || 0;
    const featureCount = json.features?.length || 0;
    const trackCount = json.tracks?.length || 0;
    const legendCount = json.legend?.items?.length || 0;
    const seqLength = contigs.map((contig) => contig.length).reduce((a, b) => a + b, 0);
    let skippedFeatures = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
    skippedFeatures += this._skippedComplexFeatures.length;
    skippedFeatures += this._skippedLocationlessFeatures.length;
    // this.logger.break('--------------------------------------------\n')
    this.logger.divider();
    this.logger.info('CGView JSON Summary:');
    this.logger.info('- Map Name: ', { padded: json.name });
    this.logger.info('- Contig Count: ', { padded: contigCount });
    this.logger.info('- Total Length (bp): ', { padded: seqLength.toLocaleString() });
    this.logger.info('- Track Count: ', { padded: trackCount });
    this.logger.info('- Legend Count: ', { padded: legendCount });
    this.logger.info('- Features Included: ', { padded: featureCount });
    this.logger.info('- Features Skipped: ', { padded: skippedFeatures });
    this.logStatusLine()
    this.logger.divider();
  }

  _summarizeSkippedFeatures() {
    // Skipped Types
    const skippedFeatures = this._skippedFeaturesByType;
    const skippedFeatureCount = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
    if (Object.keys(skippedFeatures).length > 0) {
      this.logger.info(`- Skipped features (${skippedFeatureCount}) by type:`)
      for (const [key, value] of Object.entries(skippedFeatures)) {
        this.logger.info(`  - ${key}: `, { padded: value });
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
  _addConfigToJSON(json, config = {}, seqRecords = {}) {
    const configKeys = config ? Object.keys(config) : ['none'];
    this.logger.info(`- Config properties provided: ${configKeys.join(', ')}`);

    json.settings   = config?.settings || {};
    json.backbone   = config?.backbone || {};
    json.ruler      = config?.ruler    || {};
    json.dividers   = config?.dividers || {};
    json.annotation = config?.annotation ||  {};
    json.sequence   = config?.sequence || {};
    json.legend     = config?.legend   || {};
    json.tracks     = config?.tracks   || [];
    json.captions   = config?.captions || [];

    if (json.captions.length > 0) {
      json.captions.forEach((caption) => {
        // NOTE: we could have additional types here: LENGTH, VERSION, etc
        if (caption.name == 'DEFINITION') {
          caption.name = seqRecords[0]?.definition || "Untitled";
          this.logger.info(`- Adding caption (DEFINITION): '${caption.name}'`);
        } else if (caption.name == 'ID') {
          caption.name = seqRecords[0].seqID || "Untitled";
          this.logger.info(`- Adding caption (ID): '${caption.name}'`);
        }
      });
    }

    return json;
  }

  // Adjust contig names:
  // - to be unique by adding a number to the end of duplicate names
  // - replace nonstandard characters with underscores
  // - length of contig names should be less than 37 characters
  _adjustContigNames(seqRecords) {
    // const names = seqRecords.map((seqRecord) => seqRecord.name);
    const names = seqRecords.map((seqRecord) => seqRecord.seqID || seqRecord.name);
    const adjustedNameResults = CGViewBuilder.adjustContigNames(names);
    // console.log("AdjustedNameResults", adjustedNameResults);
    const adjustedNames = adjustedNameResults.names;
    const reasons = adjustedNameResults.reasons;
    this.logger.info('- Checking contig names...');
    const changedNameIndexes = Object.keys(reasons);

    // Change SeqRecord names
    // We do this even if there are no reasons
    // because this will set names to seqID instead of name (if seqID exists)
    seqRecords.forEach((seqRecord, i) => {
      seqRecord.name = adjustedNames[i];
    });

    if (changedNameIndexes.length > 0) {
      // Change SeqRecord names
      // seqRecords.forEach((seqRecord, i) => {
      //   seqRecord.name = adjustedNames[i];
      // });
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
  // We will only keep the genetic code for a feature if is different from the common case.
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
    // Log translations that do not match
    this._info(`- Features with Translations: ${this._featuresWithTranslationCount.toLocaleString()}`);
    if (this._featuresWithTranslationMismatches.length > 0) {
      this._warn(`- Translation Mismatches: ${this._featuresWithTranslationMismatches.length.toLocaleString()} (out of ${this._featuresWithTranslationCount.toLocaleString()})`);
      this._warn(`  - Feature names: ${this._featuresWithTranslationMismatches.map((f) => f.name).join(', ')}`);
      this._warn("  - Feature qualifier translation does not match the translation from the sequence");
      this._warn('  - These qualifer translations will be saved with the feature');
    }
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
    // - I've removed * and - from the list as they may cause issues too ("-" failed for Crispr)
    // let replacedNames = names.map((name) => name.replace(/[^a-zA-Z0-9\*\_\-]+/g, '_'));
    let replacedNames = names.map((name) => name.replace(/[^a-zA-Z0-9\_]+/g, '_'));
    names.forEach((name, i) => {
      // console.log(name, replacedNames[i])
      if (name !== replacedNames[i]) {
        reasons[i] = {index: i, origName: name, newName: replacedNames[i], reason: ["REPLACE"]};
      }
    });
    // Blank names
    // NOTE: Blank names should not have been changed by above (they would have been replaced with '_')
    // - So we don't need to push to reasons, we can just set the reason here
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
  _countPeriodsAndDashes(str) {
    const match = str.match(/[.-]/g);
    return match ? match.length : 0;
  }

  _extractSequenceAndFeatures(json, seqJson) {
    const contigs = [];
    const features = [];
  // TODO: contig names MUST BE UNIQUE
    let sequencePeriodsAndDashes = 0;
    this._featureTypesSetup();
    seqJson.forEach((seqRecord) => {
      // Get count of periods and dashes in the sequence
      sequencePeriodsAndDashes += this._countPeriodsAndDashes(seqRecord.sequence);
      // Convert all periods and dashes to N's
      const seq = seqRecord.sequence.replace(/[.-]/g, 'N');
      // contigs.push({name: seqRecord.name, length: seqRecord.sequence.length, seq: seqRecord.sequence});
      contigs.push({name: seqRecord.name, length: seqRecord.sequence.length, seq});
      const contigFeatures = this._extractFeatures(seqRecord, seqRecord.name, seqRecord.inputType, seqRecord.sequence);
      features.push(...contigFeatures);
    });
    if (sequencePeriodsAndDashes) {
      this._warn(`- Sequence ./- replaced with 'N': ${sequencePeriodsAndDashes}`);
    }
    json.sequence = {contigs};
    json.features = features;
    return json;
  }

  _featureTypesSetup() {
    const inExclude = this._setupInExcludeItems('Feature types', this.includeFeatures, this.excludeFeatures);
    this.featuresToInclude = inExclude.itemsToInclude;
    this.featuresToExclude = inExclude.itemsToExclude;
  }

  _qualifiersSetup() {
    const inExclude = this._setupInExcludeItems('Qualifier', this.includeQualifiers, this.excludeQualifiers);
    this.includeQualifiers = inExclude.itemsToInclude;
    this.excludeQualifiers = inExclude.itemsToExclude;
  }

  // name: string to dislplay in log messages
  // includeItems: true, false, or array of strings
  // excludeItems: array of strings
  _setupInExcludeItems(name, includeItems, excludeItems) {
    let itemsToInclude = [];
    let itemsToExclude = [];
    let logData = {inexclude: 'EMPTY', items: 'EMPTY'}
    if (includeItems === true) {
      itemsToInclude = true;
      if (Array.isArray(excludeItems)) {
        itemsToExclude = excludeItems;
        if (itemsToExclude.length > 0) {
          // this.logger.info(`- ${name} to exclude: ${itemsToExclude.join(', ')}`);
          logData = {inexclude: 'exclude', items: itemsToExclude.join(', ')}
        } else {
          // this.logger.info(`- ${name} to include: All`);
          logData = {inexclude: 'include', items: 'All'};
        }
      } else {
          // this.logger.info(`- ${name} to include: All`);
          logData = {inexclude: 'include', items: 'All'};
      }
    } else if (Array.isArray(includeItems)) {
      itemsToInclude = includeItems;
      if (itemsToInclude.length > 0) {
        // this.logger.info(`- ${name} to include: ${itemsToInclude.join(', ')}`);
        logData = {inexclude: 'include', items: itemsToInclude.join(', ')};
      } else {
        // this.logger.info(`- ${name} to include: None`);
        logData = {inexclude: 'include', items: 'None'};
      }
    } else {
      // false, or aything but true or an array
      itemsToInclude = [];
      // this.logger.info(`- ${name} to include: None`);
      logData = {inexclude: 'include', items: 'None'};
    }
    this.logger.info(`- ${name} to ${logData.inexclude}: `, {padded: logData.items });
    return {itemsToInclude, itemsToExclude};
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

  _extractFeatures(seqContig, contigName, inputType, contigSequence) {
    const features = [];
    const source = inputType ? `${inputType}-features` : "features";
    for (const f of seqContig.features) {
      if (this.featuresToExclude.includes(f.type)) {
        this._skippedFeaturesByType[f.type] = this._skippedFeaturesByType[f.type] ? this._skippedFeaturesByType[f.type] + 1 : 1;
        continue;
      }
      if (Array.isArray(this.featuresToInclude) && !this.featuresToInclude.includes(f.type)) {
        this._skippedFeaturesByType[f.type] = this._skippedFeaturesByType[f.type] ? this._skippedFeaturesByType[f.type] + 1 : 1;
        continue;
      }
      // if (f.locations.length > 1) {
      //   this._skippedComplexFeatures.push(f);
      //   continue;
      // }
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
      if (f.locations.length > 1) {
        // this.logger.info(`- locs: ${f.locations.length}; ${f.type}; ${f.name}; trans: ${!!f.qualifiers?.translation}; pseudo: ${!!f.qualifiers?.pseudo}`);
        feature.locations = f.locations;
        this._complexFeatures.push(f);
      }
      // codonStart (from codon_start)
      if (f.qualifiers?.codon_start && parseInt(f.qualifiers.codon_start) !== 1) {
        feature.codonStart = parseInt(f.qualifiers.codon_start);
      }
      // geneticCode (from transl_table)
      if (feature.type?.toUpperCase() === 'CDS') {
        const geneticCode =  f.qualifiers?.transl_table && parseInt(f.qualifiers.transl_table);
        // The default genetic code for GenBank/EMBL is 1
        feature.geneticCode = geneticCode || 1;
      }
      // Grab translation from qualifiers before filtering them
      const qualifierTranslation = f.qualifiers?.translation;
      const qualifiers = CGViewBuilder.extractQualifiers(f.qualifiers, this.includeQualifiers, this.excludeQualifiers);
      if (qualifiers) {
        feature.qualifiers = qualifiers;
      }
      if (feature.type?.toUpperCase() === 'CDS' && qualifierTranslation) {
        this._featuresWithTranslationCount++;
        let translation = this._extractTranslation(feature, contigSequence);
        if (translation.slice(-1) === "*") {
          translation = translation.slice(0, -1);
        }
        // Replace the first AA with M
        // This should depend on the genetic code
        // translation = "M" + translation.slice(1);
        if (translation !== qualifierTranslation) {
          this._featuresWithTranslationMismatches.push(feature);
          feature.translation = qualifierTranslation;
        }
      }

      // Add feature to list
      features.push(feature);
    };
    return features;
  }

  _extractTranslation(feature, contigSequence) {
    const codonTable = new CodonTable(feature.geneticCode);
    let seq = '';
    let translation = '';
    const revComp = feature.strand === -1;
    if (feature.locations) {
      for (const location of feature.locations) {
        // seq += this._extractSequenceRange(contigSequence, location[0], location[1], revComp);
        const locationSeq = this._extractSequenceRange(contigSequence, location[0], location[1], revComp);
        seq = revComp ? locationSeq + seq : seq + locationSeq;
      }
    } else {
      seq = this._extractSequenceRange(contigSequence, feature.start, feature.stop, revComp);
    }
    return codonTable?.translate(seq, feature.codonStart);
  }

  _extractSequenceRange(sequence, start, stop, revComp=false) {
    let extract = sequence.substring(start - 1, stop);
    if (revComp) {
      extract = helpers.reverseComplement(extract);
    }
    return extract;
  }


  static extractQualifiers(qualifiersIn, includeQualifiers, excludeQualifiers) {
    let qualifiersOut = {};

    if (includeQualifiers === true && qualifiersIn) {
      if (Array.isArray(excludeQualifiers) && excludeQualifiers.length > 0) {
        const qualifiersInCopy = {...qualifiersIn};
          excludeQualifiers.forEach((q) => {
            delete qualifiersInCopy[q];
          });
        qualifiersOut = qualifiersInCopy;
      } else {
        qualifiersOut = qualifiersIn;
      }
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

  static fromSequenceText(text, options={}) {
    const logger = new Logger({logToConsole: false, showIcons: true});
    const builder = new CGViewBuilder(text, {logger: logger, ...options});
    return {json: builder.toJSON(), log: builder.logger.history()};
  }



}
