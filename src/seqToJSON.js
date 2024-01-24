
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
      records.push(record);
    });
    return records;
  }

  // Return FALSE if feature appears to be empty, e.g. just / or blank line
  static isSeqRecord(seqRecord) {
    if (/^\s*\/\s*$/.test(seqRecord)) {
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
    const match = seqRecordText.match(/^\s*(?:LOCUS|ID)\s*(\S+);?/);
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