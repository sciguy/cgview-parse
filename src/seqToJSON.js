
class CGVParse {

  // seq: string
  // options:
  // - config: jsonConfig
  static seqToJSON(seq, options={}) {
    const seqRecords = this.parseSeqRecords(seq, options);
    return seqRecords;
  }

  static parseSeqRecords(seqText, options={}) {
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
      featureAllText = featureAllText.replace(/^FT/m, "  ");
      featureAllText.split(/(?=^\s{5}\S+)/m).filter(this.isFeatureRecord).forEach((featureText) => {
        const feature = {};
        feature.type = this.getFeatureType(featureText);
        feature.strand = this.getFeatureStrand(featureText);
        feature.locationText = this.getFeatureLocationText(featureText);
        feature.locations = this.getFeatureLocations(feature.locationText);
        feature.qualifiers = this.getFeatureQualifiers(featureText);
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

  // Return an arrao fo locations from a location string
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

  // Get an array of dictionaries containing feature qualifier names and values from a feature string
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
          // qualifier.name = match[1];
          // qualifier.value = this.formatFeatureQualifier(match[2]);
        } else {
          name = this.removeWhiteSpace(qualifierText);
          value = "";
          // qualifier.name = this.removeWhiteSpace(qualifierText);
          // qualifier.value = "";
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