import FeatureFile from '../src/Features/FeatureFile.js';
import GFF3FeatureFile from '../src/Features/FeatureFileFormats/GFF3FeatureFile.js';
import GTFFeatureFile from '../src/Features/FeatureFileFormats/GTFFeatureFile.js';
import CSVFeatureFile from '../src/Features/FeatureFileFormats/CSVFeatureFile.js';

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

  /////////////////////////////////////////////////////////////////////////////
  // CSV/TSV
  /////////////////////////////////////////////////////////////////////////////

  describe('detectSeparator', () => {

    test('- return comma from CSV', () => {
      const input = `
# name, start, stop, strand
gene00001, 100, 200, +
gene00001, 300, 400, +
`.trim();
      const output = CSVFeatureFile.detectSeparator(input);
      expect(output).toEqual(',');
    });

    test('- return tab from TSV', () => {
      const input = `
# name	 start	 stop	 strand
gene00001	 100	 200	 +
gene00001	 300	 400	 +
`.trim();
      const output = CSVFeatureFile.detectSeparator(input);
      expect(output).toEqual("\t");
    });

    test('- return tab from Mixed', () => {
      const input = `
# name	 start	 stop	 strand	test
gene00001	 100	 200	 +	a,b,c
gene00001	 300	 400	 +	d,e,f
`.trim();
      const output = CSVFeatureFile.detectSeparator(input);
      expect(output).toEqual("\t");
    });

    test('- return undefined if not consistent', () => {
      const input = `
# name, start, stop, strand
gene00001, 100, 200, +,
gene00001, 300, 400, +
`.trim();
      const output = CSVFeatureFile.detectSeparator(input);
      expect(output).toEqual(undefined);
    });

  });

  describe('createColumnIndexToKeyMapFromHeader', () => {

    test('- return {} with empty line', () => {
      const header = "";
      const options = {};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(output).toEqual({});
      expect(csvFile.file.passed).toBe(false);
    });

    test('- return map with default column names (case-insensitive)', () => {
      const header = "Start, stoP";
      const options = {};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(output).toEqual({0: 'start', 1: 'stop'});
      expect(csvFile.file.passed).toBe(true);
    });

    test('- return map with updated column names (case-insensitive)', () => {
      const header = "name, start, enD";
      const options = {columnMap: {stop: 'End'}};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(output).toEqual({0: 'name', 1: 'start', 2: 'stop'});
      expect(csvFile.file.passed).toBe(true);
    });

    test('- fail with unknown columns', () => {
      const header = "start, stop";
      const options = {columnMap: {bob: 'end'}};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexMapFromHeader(header);
      expect(output).toEqual({start: 0, stop: 1});
      expect(csvFile.file.passed).toBe(false);
    });

    test('- fail if missing start', () => {
      const header = "stop";
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(csvFile.file.passed).toBe(false);
    });

    test('- fail missing stop', () => {
      const header = "start";
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(csvFile.file.passed).toBe(false);
    });

    test('- fail with missing columns', () => {
      const header = "start, stop, direction";
      const options = {columnMap: {strand: 'direct'}};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(output).toEqual({0: 'start', 1: 'stop', 2: 'ignored'});
      expect(csvFile.file.passed).toBe(false);
    });

    test('- onlyColumns', () => {
      const header = "start, stop, name";
      const options = {onlyColumns: ['start', 'stop']};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(header);
      expect(output).toEqual({0: 'start', 1: 'stop', 2: 'ignored'});
      expect(csvFile.file.passed).toBe(true);
    });

    test('- fail: no header or column map', () => {
      const firstLine = "0, 1";
      const options = {noHeader: true};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(firstLine);
      expect(output).toEqual({0: 'ignored', 1: 'ignored'});
      expect(csvFile.file.passed).toBe(false);
    });

    test('- no header but has column map', () => {
      const firstLine = "0, 1";
      const options = {noHeader: true, columnMap: {start: 0 , stop: 1}};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(firstLine);
      expect(output).toEqual({0: 'start', 1: 'stop'});
      expect(csvFile.file.passed).toBe(true);
    });

    test('- fail: no header and column map index too large', () => {
      const firstLine = "0, 1";
      const options = {noHeader: true, columnMap: {start: 0 , stop: 1, strand: 2}};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(firstLine);
      expect(output).toEqual({0: 'start', 1: 'stop'});
      expect(csvFile.file.passed).toBe(false);
    });

    test('- fail: no header and column map not number', () => {
      const firstLine = "0, 1";
      const options = {noHeader: true, columnMap: {start: 0 , stop: 'end'}};
      featureFile._status = 'success';
      const csvFile = new CSVFeatureFile(featureFile, options);
      const output = csvFile.createColumnIndexToKeyMapFromHeader(firstLine);
      expect(output).toEqual({0: 'start', 1: 'ignored'});
      expect(csvFile.file.passed).toBe(false);
    });


  });





  // describe('createColumnIndexMapFromHeader', () => {

  //   test('- return {} with empty line', () => {
  //     const header = "";
  //     const options = {};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(output).toEqual({});
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- return map with for default column names (case-insensitive)', () => {
  //     const header = "Start, stoP";
  //     const options = {};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(output).toEqual({start: 0, stop: 1});
  //     expect(csvFile.file.passed).toBe(true);
  //   });

  //   test('- return map with for updated column names (case-insensitive)', () => {
  //     const header = "name, start, enD";
  //     const options = {columnMap: {stop: 'End'}};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(output).toEqual({name: 0, start: 1, stop: 2});
  //     expect(csvFile.file.passed).toBe(true);
  //   });

  //   test('- fail if missing start', () => {
  //     const header = "stop";
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- fail missing stop', () => {
  //     const header = "start";
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- fail with unknown columns', () => {
  //     const header = "start, stop";
  //     const options = {columnMap: {bob: 'end'}};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(output).toEqual({start: 0, stop: 1});
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- fail with missing columns', () => {
  //     const header = "start, end";
  //     const options = {columnMap: {stop: 'bend'}};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(output).toEqual({start: 0});
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- onlyColumns', () => {
  //     const header = "start, stop, name";
  //     const options = {onlyColumns: ['start', 'stop']};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(header);
  //     expect(output).toEqual({start: 0, stop: 1});
  //     expect(csvFile.file.passed).toBe(true);
  //   });

  //   test('- fail: no header or column map', () => {
  //     const firstLine = "0, 1";
  //     const options = {noHeader: true};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile);
  //     const output = csvFile.createColumnIndexMapFromHeader(firstLine);
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- no header but has column map', () => {
  //     const firstLine = "0, 1";
  //     const options = {noHeader: true, columnMap: {start: 0 , stop: '1'}};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(firstLine);
  //     expect(output).toEqual({start: 0, stop: 1});
  //     expect(csvFile.file.passed).toBe(true);
  //   });

  //   test('- fail: no header and column map index too large', () => {
  //     const firstLine = "0, 1";
  //     const options = {noHeader: true, columnMap: {start: 0 , stop: 2}};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(firstLine);
  //     expect(output).toEqual({start: 0, stop: 2});
  //     expect(csvFile.file.passed).toBe(false);
  //   });

  //   test('- fail: no header and column map not number', () => {
  //     const firstLine = "0, 1";
  //     const options = {noHeader: true, columnMap: {start: 0 , stop: 'end'}};
  //     featureFile._status = 'success';
  //     const csvFile = new CSVFeatureFile(featureFile, options);
  //     const output = csvFile.createColumnIndexMapFromHeader(firstLine);
  //     expect(output).toEqual({start: 0, stop: NaN});
  //     expect(csvFile.file.passed).toBe(false);
  //   });


  // });

});
