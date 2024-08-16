import FeatureFile from '../src/FeatureFile.js';

describe('FeatureFile', () => {
  let featureFile = new FeatureFile("");

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
      const format = featureFile._parseType(input);
      expect(format).toBe("gene");
    });
    test('- return SO Term conversion', () => {
      const input = "SO:0000316";
      const format = featureFile._parseType(input);
      expect(format).toBe("CDS");
    });
  });

  describe('_parseAttributes', () => {
    test('- return attributes object', () => {
      const input = "ID=gene00001;Name=EDEN";
      const attributes = featureFile._parseAttributes(input);
      expect(attributes).toEqual({ID: "gene00001", Name: "EDEN"});
    });
  });

  describe('_extractQualifiers', () => {
    test('- return qualifiers object', () => {
      const input = "ID=NC_001823.1;Dbxref=ATCC:50394,taxon:48483;Name=MT;gbkey=Src;genome=mitochondrion;mol_type=genomic DNA";
      const attributes = featureFile._parseAttributes(input);
      const record = {attributes};
      const output = featureFile._extractQualifiers(record);
      // FIXME: when/are we splitting the values into an ARRAY!
      // expect(output).toEqual({db_xref: ["ATCC:50394", "taxon:48483"], mol_type: "genomic DNA"});
      expect(output).toEqual({db_xref: "ATCC:50394,taxon:48483", mol_type: "genomic DNA"});
    });
  });

  describe('_addQualifierNote', () => {
    test('- and new note to qualifiers', () => {
      const input = "My Note";
      const qualifiers = {};
      featureFile._addQualifierNote(qualifiers, input);
      expect(qualifiers).toEqual({note: "My Note"});
    });

    test('- and additional note to qualifiers', () => {
      const input = "My New Note";
      const qualifiers = {note: "My Note"};
      featureFile._addQualifierNote(qualifiers, input);
      expect(qualifiers).toEqual({note: "My Note; My New Note"});
    });
  });



  /////////////////////////////////////////////////////////////////////////////
  // GTF
  /////////////////////////////////////////////////////////////////////////////

  describe('_parseGTFAttributes', () => {
    test('- return attributes object', () => {
      const input = 'gene_id "NTHI477_RS00005"; transcript_id "trans_1"; db_xref "RFAM:1"; db_xref "RFAM:2"';
      const attributes = featureFile._parseGTFAttributes(input);
      expect(attributes).toEqual({gene_id: "NTHI477_RS00005", transcript_id: "trans_1", db_xref: ['RFAM:1','RFAM:2']});
    });
  });



});
