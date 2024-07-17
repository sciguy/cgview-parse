import SequenceFile from '../src/SequenceFile.js';

describe('SequenceFile', () => {
  let seqFile = new SequenceFile("");

  /////////////////////////////////////////////////
  // SEQUENCE

  describe('_getSeqName', () => {
    test('- return GenBank name', () => {
      const input = "LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999\n\n\n";
      const name = seqFile._getSeqName(input);
      expect(name).toBe("AF177870");
    });
    test('- return EMBL name', () => {
      const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\n\n\n";
      const name = seqFile._getSeqName(input);
      expect(name).toBe("AF177870");
    });
    test('- return "" if it can not be parsed', () => {
      const input = "some unknown string";
      const name = seqFile._getSeqName(input);
      expect(name).toBe("");
    });
  });

  describe('_getSeqDefinition', () => {
    test('- return GenBank name', () => {
      const input = "\nDEFINITION  Reclinomonas americana mitochondrion, complete genome.\n";
      const definition = seqFile._getSeqDefinition(input);
      expect(definition).toBe("Reclinomonas americana mitochondrion, complete genome.");
    });
    test('- return EMBL name', () => {
      const input = "\nDE   Reclinomonas americana mitochondrion, complete genome.\n";
      const definition = seqFile._getSeqDefinition(input);
      expect(definition).toBe("Reclinomonas americana mitochondrion, complete genome.");
    });
    test('- return "" if it can not be parsed', () => {
      const input = "some unknown string";
      const name = seqFile._getSeqName(input);
      expect(name).toBe("");
    });
  });

  describe('_getSeqID', () => {
    test('- return GenBank accession.version', () => {
      const input = "\nVERSION     NC_001823.1  GI:11466495\n";
      const definition = seqFile._getSeqID(input);
      expect(definition).toBe("NC_001823.1");
    });
    test('- return EMBL accesion.version', () => {
      const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\nXX\nAC   AF177870;\nXX\n";
      const definition = seqFile._getSeqID(input);
      expect(definition).toBe("AF177870.1");
    });
    test('- return "" if it can not be parsed', () => {
      const input = "some unknown string";
      const name = seqFile._getSeqName(input);
      expect(name).toBe("");
    });
  });


  describe('_getSeqLength', () => {
    test('- return length from GenBank', () => {
      const input = "LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999\n\n\n";
      const length = seqFile._getSeqLength(input);
      expect(length).toBe(3123);
    });
    test('- return length from EMBL', () => {
      const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\n\n\n";
      const length = seqFile._getSeqLength(input);
      expect(length).toBe(3123);
    });
    test('- return 0 if it can not be parsed', () => {
      const input = "some unknown string";
      const length = seqFile._getSeqLength(input);
      expect(length).toBe(0);
    });
  });

  describe('_getSeqTopology', () => {
    test('- return topology cicular from GenBank', () => {
      const input = "LOCUS       NC_001823              69034 bp    DNA     circular INV 16-AUG-2005";
      const topology = seqFile._getSeqTopology(input);
      expect(topology).toBe('circular');
    });
    test('- return topology linear from GenBank', () => {
      const input = "LOCUS       NC_001823              69034 bp    DNA     linear INV 16-AUG-2005";
      const topology = seqFile._getSeqTopology(input);
      expect(topology).toBe('linear');
    });
    test('- return topology circular from EMBL', () => {
      const input = "ID   AF177870; SV 1; circular; genomic DNA; STD; INV; 3123 BP.\n\n\n";
      const topology = seqFile._getSeqTopology(input);
      expect(topology).toBe('circular');
    });
    test('- return topology linear from EMBL', () => {
      const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\n\n\n";
      const topology = seqFile._getSeqTopology(input);
      expect(topology).toBe('linear');
    });
    test('- return unknown if it can not be parsed', () => {
      const input = "some unknown string";
      const topology = seqFile._getSeqTopology(input);
      expect(topology).toBe('unknown');
    });
  });


  describe('_parseFasta', () => {
    test('- return seqID', () => {
      const input = ">NC_001823.1 Reclinomonas americana mitochondrion, complete genome.\nATGCTT";
      const fasta  = seqFile._parseFasta(input);
      expect(fasta[0].seqID).toBe("NC_001823.1");
    });
    test('- return definition', () => {
      const input = ">NC_001823.1 Reclinomonas americana mitochondrion, complete genome.\nATGCTT";
      const fasta  = seqFile._parseFasta(input);
      expect(fasta[0].definition).toBe("Reclinomonas americana mitochondrion, complete genome.");
    });
  });


  /////////////////////////////////////////////////
  // FEATURES

  describe('_getFeatureType', () => {
    test('- return feature type', () => {
      const input = '     gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
      const type = seqFile._getFeatureType(input);
      expect(type).toBe("gene");
    });
    test('- return null if it can not be parsed', () => {
      // Added extra spaces to input
      const input = '       gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
      const type = seqFile._getFeatureType(input);
      expect(type).toBe(null);
    });
  });

  describe('_getFeatureStrand', () => {
    test('- return -1 if complement is found', () => {
      const input = '     gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
      const strand = seqFile._getFeatureStrand(input);
      expect(strand).toBe(-1);
    });
    test('- return 1 if complement is missing', () => {
      // Added extra spaces to input
      const input = '       gene            1..172\n                     /locus_tag="ECPA2_RS30085"';
      const strand = seqFile._getFeatureStrand(input);
      expect(strand).toBe(1);
    });
  });

  describe('_getFeatureLocationText', () => {
    test('- return location text', () => {
      const input = '     gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
      const locationText = seqFile._getFeatureLocationText(input);
      expect(locationText).toBe("complement(<1..>172)");
    });
    test('- return empty string if there is a qualifier instead', () => {
      const input = '     gene            /gene="someGene"                     /locus_tag="ECPA2_RS30085"';
      const locationText = seqFile._getFeatureLocationText(input);
      expect(locationText).toBe("");
    });
  });

  describe('_isParsableFeatureRange', () => {
    test("- is true good ranges", () => {
      const inputs = ['102..110', 'complement(123..124)'];
      inputs.forEach(input => {
        const parsable = seqFile._isParsableFeatureRange(input);
        expect(parsable).toBe(true);
      });
    });
    test("- is false for ranges including '.^:'", () => {
      const inputs = ['102.110', '123^124', 'J00194.1:100..202', 'join(1..100,J00194.1:100..202)'];
      inputs.forEach(input => {
        const parsable = seqFile._isParsableFeatureRange(input);
        expect(parsable).toBe(false);
      });
    });
  });

  describe('_getFeatureLocations', () => {
    test("- returns array of locations (complement)", () => {
      const input = "complement(<1..>172)";
      const locations = seqFile._getFeatureLocations(input);
      expect(locations).toEqual([[1, 172]]);
    });
    test("- returns array of locations (joins)", () => {
      const input = "join(1..172, 200..234)";
      const locations = seqFile._getFeatureLocations(input);
      expect(locations).toEqual([[1,172], [200,234]]);
    });
  });

  describe('_getFeatureQualifiers', () => {
    test("- returns single qualifier", () => {
      const input = '       gene            1..172\n                     /locus_tag="ECPA2_RS30085"';
      const qualifiers = seqFile._getFeatureQualifiers(input);
      expect(Object.keys(qualifiers).length).toBe(1);
      expect(qualifiers.locus_tag).toEqual("ECPA2_RS30085");
    });
    test("- returns mulitple qualifiers", () => {
      const input = '       gene            1..172\n                     /locus_tag="tag_1"\n                     /locus_tag="tag_2"';
      const qualifiers = seqFile._getFeatureQualifiers(input);
      expect(Object.keys(qualifiers).length).toBe(1);
      expect(qualifiers.locus_tag).toEqual(["tag_1", "tag_2"]);
    });
    test("- returns qualifiers without values", () => {
      const input = '       gene            1..172\n                     /pseudo\n';
      const qualifiers = seqFile._getFeatureQualifiers(input);
      expect(Object.keys(qualifiers).length).toBe(1);
      expect(qualifiers.pseudo).toBe(true);
    });
  });

  describe('_addFeatureSequence', () => {
    test("- forward simple sequence", () => {
      const records = [{
        inputType: "genbank", name: "AF177870", length: 3123,
        features: [{locations: [[2,3]], strand: 1}],
        sequence: "aTGc"
      }];
      seqFile._addFeatureSequence(records);
      expect(records[0].features[0].sequence).toBe("TG");
    });
    test("- forward joined sequence", () => {
      const records = [{
        inputType: "genbank", name: "AF177870", length: 3123,
        features: [{locations: [[2,3], [11, 14]], strand: 1}],
        sequence: "aTGcatcgatGCATactg"
        //         123456789012345678
      }];
      seqFile._addFeatureSequence(records);
      expect(records[0].features[0].sequence).toBe("TGGCAT");
    });
    test("- reversed joined sequence", () => {
      const records = [{
        inputType: "genbank", name: "AF177870", length: 3123,
        features: [{locations: [[2,3], [11, 14]], strand: -1}],
        sequence: "aTGcatcgatGCATactg"
        //         123456789012345678
      }];
      seqFile._addFeatureSequence(records);
      expect(records[0].features[0].sequence).toBe("ATGCCA");
    });
  });

});