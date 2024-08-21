import FeatureFile from '../src/FeatureFile.js';
import GFF3FeatureFile from '../src/FeatureFileFormats/GFF3FeatureFile.js';
import GTFFeatureFile from '../src/FeatureFileFormats/GTFFeatureFile.js';

describe('FeatureFile', () => {
  let featureFile = new FeatureFile("");
  let gff3FeatureFile = new GFF3FeatureFile(featureFile);
  let gtfFeatureFile = new GTFFeatureFile(featureFile);

  /////////////////////////////////////////////////
  // Detect Format

  describe('_determineFormat', () => {

    test('- return gff3', () => {
      const input = `
##gff-version 3.1.26
##sequence-region ctg123 1 1497228
ctg123	.	gene	1000	9000	.	+	.	ID=gene00001;Name=EDEN
`.trim();
      const format = featureFile.detectFormat(input);
      expect(format).toBe("gff3");
    });

    test('- return gtf', () => {
      const input = `
chr123	Twinscan	CDS	380	401	.	+	0	gene_id "001"; transcript_id "001.1";
`.trim();
      const format = featureFile.detectFormat(input);
      expect(format).toBe("gtf");
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // GFF3
  /////////////////////////////////////////////////////////////////////////////

  describe('_parseType', () => {
    test('- return input if not an SO Term', () => {
      const input = "gene";
      const format = gff3FeatureFile._parseType(input);
      expect(format).toBe("gene");
    });
    test('- return SO Term conversion', () => {
      const input = "SO:0000316";
      const format = gff3FeatureFile._parseType(input);
      expect(format).toBe("CDS");
    });
  });

  describe('_parseAttributes', () => {
    test('- return attributes object', () => {
      const input = "ID=gene00001;Name=EDEN";
      const attributes = gff3FeatureFile._parseAttributes(input);
      expect(attributes).toEqual({ID: "gene00001", Name: "EDEN"});
    });
  });

  describe('_extractQualifiers', () => {
    test('- return qualifiers object', () => {
      const input = "ID=NC_001823.1;Dbxref=ATCC:50394,taxon:48483;Name=MT;gbkey=Src;genome=mitochondrion;mol_type=genomic DNA";
      const attributes = gff3FeatureFile._parseAttributes(input);
      const record = {attributes};
      const output = gff3FeatureFile._extractQualifiers(record);
      // FIXME: when/are we splitting the values into an ARRAY!
      // expect(output).toEqual({db_xref: ["ATCC:50394", "taxon:48483"], mol_type: "genomic DNA"});
      expect(output).toEqual({db_xref: "ATCC:50394,taxon:48483", mol_type: "genomic DNA"});
    });
  });

  describe('_addQualifierNote', () => {
    test('- and new note to qualifiers', () => {
      const input = "My Note";
      const qualifiers = {};
      gff3FeatureFile._addQualifierNote(qualifiers, input);
      expect(qualifiers).toEqual({note: "My Note"});
    });

    test('- and additional note to qualifiers', () => {
      const input = "My New Note";
      const qualifiers = {note: "My Note"};
      gff3FeatureFile._addQualifierNote(qualifiers, input);
      expect(qualifiers).toEqual({note: "My Note; My New Note"});
    });
  });

  describe('_joinRecordGroup', () => {
    test('- join records and create locations', () => {
      const input = [
        {name: "gene", start: 1000, stop: 9000, strand: "+", attributes: {ID: "gene00001"}},
        {name: "gene", start: 2000, stop: 19000, strand: "+", attributes: {ID: "gene00001"}},
      ];
      const output = gff3FeatureFile._joinRecordGroup(input);
      expect(output.locations).toEqual([[1000, 9000], [2000, 19000]]);
      expect(output.start).toBe(1000);
      expect(output.stop).toBe(19000);
    });
  });




  /////////////////////////////////////////////////////////////////////////////
  // GTF
  /////////////////////////////////////////////////////////////////////////////

  describe('_parseGTFAttributes', () => {
    test('- return attributes object', () => {
      const input = 'gene_id "NTHI477_RS00005"; transcript_id "trans_1"; db_xref "RFAM:1"; db_xref "RFAM:2"';
      const attributes = gtfFeatureFile._parseGTFAttributes(input);
      expect(attributes).toEqual({gene_id: "NTHI477_RS00005", transcript_id: "trans_1", db_xref: ['RFAM:1','RFAM:2']});
    });
  });


  describe('_joinRecordGroup', () => {

    test('- join records and create locations', () => {
      const input = [
        {name: "CDS", start: 100, stop: 200, strand: "+", attributes: {ID: "gene00001"}},
        {name: "CDS", start: 300, stop: 400, strand: "+", attributes: {ID: "gene00001"}},
        // {name: "start_codoon", start: 100, stop: 102, strand: "+", attributes: {ID: "gene00001"}},
        // {name: "stop_codoon", start: 400, stop: 402, strand: "+", attributes: {ID: "gene00001"}},
      ];
      const output = gtfFeatureFile._joinRecordGroup(input);
      expect(output.locations).toEqual([[100, 200], [300, 400]]);
      expect(output.start).toBe(100);
      expect(output.stop).toBe(400);
    });

    test('- ignore start_codon and add stop_codon', () => {
      const input = [
        {type: "CDS", start: 100, stop: 200, strand: "+", attributes: {ID: "gene00001"}},
        {type: "CDS", start: 300, stop: 400, strand: "+", attributes: {ID: "gene00001"}},
        {type: "start_codon", start: 100, stop: 102, strand: "+", attributes: {ID: "gene00001"}},
        {type: "stop_codon", start: 401, stop: 403, strand: "+", attributes: {ID: "gene00001"}},
      ];
      const output = gtfFeatureFile._joinRecordGroup(input);
      expect(output.locations).toEqual([[100, 200], [300, 400], [401, 403]]);
    });

    test('- ignore start_codon and add stop_codon (-ve) strand', () => {
      const input = [
        {type: "CDS", start: 100, stop: 200, strand: "-", attributes: {ID: "gene00001"}},
        {type: "CDS", start: 300, stop: 400, strand: "-", attributes: {ID: "gene00001"}},
        {type: "start_codon", start: 398, stop: 400, strand: "-", attributes: {ID: "gene00001"}},
        {type: "stop_codon", start: 97, stop: 99, strand: "-", attributes: {ID: "gene00001"}},
      ];
      const output = gtfFeatureFile._joinRecordGroup(input);
      expect(output.locations).toEqual([[97, 99], [100, 200], [300, 400]]);
    });

  });




});
