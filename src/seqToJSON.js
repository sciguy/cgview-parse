// NOTES:
// - This code is heavily based on Paul's seq_to_json.py script with some exceptions:
//   - Feature sequence is not extracted (add_feature_sequences)
// TODO:
// - Add Paul's sanity checks
// - Separate parsers to separate files
// - Need log and overal success status
// - Test start_codon
// - Genetic codes
// OPTIONS:
// - config: jsonConfig
// - includeQualifiers: boolean (not implemented yet)
//   - If true, include ALL qualifiers in the JSON
//   - If array of strings, include only those qualifiers
// . - ADD TEST FOR THIS
class CGVParse {

  // seq: string
  // options:
  // - config: jsonConfig
  static seqToJSON(seq, options={}) {
    const seqRecords = this.parseSeqRecords(seq, options);
    return seqRecords;
  }

  static seqToSeqJSON(seq, options={}) {
    const seqRecords = this.parseSeqRecords(seq, options);
    return seqRecords;
  }

  static seqJSONToCgvJSON(seqJson, options={}) {
    // Here json refers to the CGView JSON
    let json = this.addConfigToJSON({}, options.config); 
    // Version: we should keep the version the same as the latest for CGView.js
    json.version = "1.6.0";
    json = this.extractSequenceAndFeatures(json, seqJson);
    json.name = json.sequence?.contigs[0]?.name || "Untitled";
    json = this.removeUnusedLegends(json);
    // Add track for features (if there are any)
    json.tracks = this.buildTracks(json, seqJson[0].inputType);

    return { cgview: json };
  }

  ///////////////////
  // seqJSONToCgvJSON
  ///////////////////

  // Add config to JSON. Note that no validation of the config is done.
  static addConfigToJSON(json, config) {
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
  static extractSequenceAndFeatures(json, seqJson) {
    const contigs = [];
    const features = [];
    seqJson.forEach((seqRecord) => {
      contigs.push({name: seqRecord.name, length: seqRecord.sequence.length, seq: seqRecord.sequence});
      const contigFeatures = this.extractFeatures(seqRecord, seqRecord.name, seqRecord.inputType);
      features.push(...contigFeatures);
    });
    json.sequence = {contigs};
    json.features = features;
    return json;
  }

  // Onlys adds a Features track if there are features
  // Other tracks may come from the config (in which case they are already added to the JSON)
  static buildTracks(json, inputType) {
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
  static removeUnusedLegends(json) {
    const legendItems = json.legend?.items || [];
    if (legendItems.length === 0) { return json; }
    const featureLegends = json.features?.map((f) => f.legend) || [];
    const uniqueFeatureLegends = [...new Set(featureLegends)];
    const filteredLegendItems = legendItems.filter((i) => uniqueFeatureLegends.includes(i.name));
    json.legend.items = filteredLegendItems;
    return json
  }

  static extractFeatures(seqContig, contigName, inputType) {
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
      console.log("Skipped features:", skippedFeatures);
    }
    return features;
  }

  ///////////////////
  // seqToSeqJSON
  ///////////////////

  static parseSeqRecords(seqText, options={}) {
    let records = this.parseGenbankOrEmbl(seqText, options);
    // console.log("records", records)
    if ((records.length === 0) ||
        (records[0].name === '' && records[0].length === undefined && records[0].sequence === '')) {
      if (/^\s*>/.test(seqText)) {
        console.log("Parsing FASTA-here...")
        records = this.parseFasta(seqText, options);
      } else {
        console.log("Parsing RAW-here...")
        records = this.parseRaw(seqText, options);
      }
    }
    return records;
  }

  static parseGenbankOrEmbl(seqText, options={}) {
    const records = [];
    seqText.split(/^\/\//m).filter(this.isSeqRecord).forEach((seqRecord) => {
      const record = {inputType: 'UNKNOWN'};
      if (/^\s*LOCUS|^\s*FEATURES/m.test(seqRecord)) {
        record.inputType = 'genbank';
      } else if (/^\s*ID|^\s*SQ/m.test(seqRecord)) {
        record.inputType = 'embl';
      }
      record.name = this.getSeqName(seqRecord);
      record.length = this.getSeqLength(seqRecord);
      record.sequence = this.getSequence(seqRecord);
      record.features = this.getFeatures(seqRecord);
      records.push(record);
    });
    return records;
  }

  static parseFasta(seqText, options={}) {
    console.log("Parsing FASTA...")
    const records = [];
    seqText.split(/^\s*>/m).filter(this.isSeqRecord).forEach((seqRecord) => {
      const record = {inputType: 'fasta', name: '', length: undefined, sequence: ''};
      const match = seqRecord.match(/^\s*([^\n\r]+)(.*)/s);
      if (match) {
        record.name = match[1];
        record.sequence = this.removeWhiteSpace(this.removeDigits(match[2]));
        record.length = record.sequence.length;
        record.features = [];
      }
      records.push(record);
    });
    return records;
  }

  static parseRaw(seqText, options={}) {
    const record = {inputType: 'raw', name: '', features: []};
    record.sequence = this.removeWhiteSpace(this.removeDigits(seqText));
    record.length = record.sequence.length;
    return [record];
  }

  // Return FALSE if sequence record appears to be empty, e.g. just // or blank line
  static isSeqRecord(seqRecord) {
    if (/^\s*\/\/\s*$/.test(seqRecord)) {
      return false;
    } else if (/^\s*$/.test(seqRecord)) {
      return false
    } else {
      return true;
    }
  }

  // get a sequence name from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999
  // in EMBL look for e.g.:
  // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
  // name is AF177870
  static getSeqName(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID)\s*(\S+)/);
    if (match) {
      let name = match[1];
      // Remove trailing ';' from embl files
      name = name.replace(/;$/, "");
      return name
    } else {
      return "";
    }
  }

  // get a sequence length from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999
  // in EMBL look for e.g.:
  // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
  // length is 3123
  // Returns undefined if it can't be parsed
  static getSeqLength(seqRecordText) {
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID).*?(\d+)\s[Bb][Pp]/);
    if (match) {
      return parseInt(match[1]);
    // } else {
    //   return 0;
    }
  }

  // get the full sequence from a GenBank or EMBL record
  // in GenBank look for e.g.:
  // ORIGIN
  //        1 ttttgccctc agtccgtgac ggcgcaggct ttccgtcacg gtttttactt taaaatggta
  // in EMBL look for e.g.:
  // SQ   Sequence 3123 BP; 986 A; 605 C; 597 G; 935 T; 0 other;
  //     gaacgcgaat gcctctctct ctttcgatgg gtatgccaat tgtccacatt cactcgtgtt        60
  static getSequence(seqRecordText) {
    const match = seqRecordText.match(/^(?:ORIGIN|SQ\s{3}).*?$([^\/]*)(^\s*$|^\s*LOCUS)?/ms);
    if (match) {
      return this.removeDigits(this.removeWhiteSpace(match[1]));
    } else {
      return "" 
    }
  }

  // get an array of objects containing feature information from a GenBank or EMBL record
  // in GenBank look for:
  // FEATURES             Location/Qualifiers
  // in EMBL look for:
  // FH   Key             Location/Qualifiers
  // FH
  static getFeatures(seqRecordText) {
    console.log("Parsing features...")
    const features = [];
    const match = seqRecordText.match(/^(?:FEATURES.*?$|FH.*?^FH.*?$)(.*)^(?:ORIGIN|SQ\s{3}).*?$/ms);
    if (match) {
      let featureAllText = match[1];
      // Replace FT from the start of EMBL lines with 2 spaces
      featureAllText = featureAllText.replaceAll(/^FT/mg, "  ");
      featureAllText.split(/(?=^\s{5}\S+)/m).filter(this.isFeatureRecord).forEach((featureText) => {
        const feature = {};
        feature.type = this.getFeatureType(featureText);
        feature.strand = this.getFeatureStrand(featureText);
        feature.locationText = this.getFeatureLocationText(featureText);
        feature.locations = this.getFeatureLocations(feature.locationText);
        feature.start = feature.locations.map((location) => location[0]).sort((a, b) => a - b)[0];
        feature.stop = feature.locations.map((location) => location[1]).sort((a, b) => b - a)[0];
        feature.qualifiers = this.getFeatureQualifiers(featureText);
        feature.name = this.getFeatureName(feature.qualifiers);
        if (feature.type) {
          features.push(feature);
        }
      });
    }
    return features
  }

  // Return FALSE if feature appears to be empty, e.g. just / or blank line
  static isFeatureRecord(featureText) {
    if (/^\s*\/\s*$/.test(featureText)) {
      return false;
    } else if (/^\s*$/.test(featureText)) {
      return false
    } else {
      return true;
    }
  }

  // Get type of a feature from a feature string
  // e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  static getFeatureType(featureText) {
    const match = featureText.match(/^\s{5}(\S+)/);
    if (match) {
      return match[1];
    } else {
      // TODO: Probably log this
      return null;
    }
  }

  // Get strand of a feature (1 or -1) from a feature string # e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  // FIXME: What about joins?
  static getFeatureStrand(featureText) {
    const match = featureText.match(/^\s{5}\S+\s+complement/);
    return match ? -1 : 1;
  }

  // Get location text of a feature (1 or -1) from a feature string
  // e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  static getFeatureLocationText(featureText) {
    const match = featureText.match(/^\s{5}\S+\s+([^\/]+)/s);
    if (match) {
      return this.removeWhiteSpace(match[1]);
    } else {
      return "";
    }
  }

  // Return FALSE if feature range is of a type that cannot be converted to a start and end
  // examples of ranges that cannot be converted to start and end:
  // 102.110
  // 123^124
  // J00194.1:100..202
  // join(1..100,J00194.1:100..202)
  static isParsableFeatureRange(range) {
    if (/\d\.\d/.test(range)) {
      return false;
    } else if (/\^/.test(range)) {
      return false;
    } else if (/:/.test(range)) {
      return false;
    } else if (/^\s*$/.test(range)) {
      return false;
    } else {
      return true;
    }
  }

  // Return an array of locations from a location string
  // FIXME: What about > and <?
  static getFeatureLocations(locationText) {
    const locations = [];
    const ranges = locationText.split(/(?=,)/).filter(this.isParsableFeatureRange);
    for (const range of ranges) {
      const location = {};
      let match = range.match(/(\d+)\D*\.\.\D*(\d+)/);
      if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        locations.push([start, end]);
      } else {
        match = range.match(/(\d+)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = start;
          locations.push([start, end]);
        }
      }
    }
    return locations;
  }

  // Return FALSE if feature qualifier appears to be empty, e.g. just / or blank line
  static isFeatureQualifier(qualifierText) {
    if (/^\s*\/\s*$/.test(qualifierText)) {
      return false;
    } else if (/^\s*$/.test(qualifierText)) {
      return false
    } else {
      return true;
    }
  }

  // Format feature qualifier value by removing newlines if there are no spaces within the value
  // otherwise replace newlines with spaces
  static formatFeatureQualifier(qualifierText) {
    if (/\S\s\S/.test(qualifierText)) {
      return qualifierText.replace(/[\s]+/g, " ");
    } else {
      return qualifierText.replace(/[\s]+/g, "");
    }

  }

  // Get an array of objects containing feature qualifier names and values from a feature string
  // e.g.
  //      gene            complement(<1..>172)
  //                      /locus_tag="ECPA2_RS30085"
  //                      /old_locus_tag="ECPA2_5227"
  //                      /pseudo
  static getFeatureQualifiers(featureText) {
    const qualifiers = {};
    let match = featureText.match(/(\/.*)/s);
    if (match) {
      const allQualifierText = match[1];
      allQualifierText.split(/(?=^\s*\/)/m).filter(this.isFeatureQualifier).forEach((qualifierText) => {
        const qualifier = {};
        let name;
        let value;
        match = qualifierText.match(/\/([^\"\s]+)\s*=\s*\"?([^\"]*)\"?(?=^\s*\/|$)/ms);
        if (match) {
          name = match[1];
          value = this.formatFeatureQualifier(match[2]);
        } else {
          name = this.removeWhiteSpace(qualifierText);
          value = "";
        }
        if (qualifiers[name]) {
          qualifiers[name].push(value);
        } else {
          qualifiers[name] = [value];
        }
      });
    }
    return qualifiers;
  }

  static getFeatureName(qualifiers) {
    if (qualifiers?.gene) {
      return qualifiers.gene[0];
    } else if (qualifiers?.locus_tag) {
      return qualifiers.locus_tag[0];
    } else if (qualifiers?.product) {
      return qualifiers.product[0];
    } else if (qualifiers?.note) {
      return qualifiers.note[0];
    } else if (qualifiers?.db_xref) {
      return qualifiers.db_xref[0];
    } else {
      return "";
    }
  }

  static removeWhiteSpace(string) {
    return string.replace(/\s+/g, "");
  }

  static removeDigits(string) {
    return string.replace(/\d+/g, "");
  }

  static removeNewlines(string) {
    return string.replace(/[\n\r]+/g, "");
  }

}

export default CGVParse;