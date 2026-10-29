import FeatureFile from '../src/Features/FeatureFile.js';
import FeatureBuilder from '../src/Features/FeatureBuilder.js';
import Logger from '../src/Support/Logger.js';

const annotationLines = [
  '##gff-version 3',
  '##sequence-region ctg1 1 100',
  '# An annotation comment',
  'ctg1\tProkka\tCDS\t1\t3\t.\t+\t0\tID=cds1;Name=joined;product=test protein',
  'ctg1\tProkka\tCDS\t7\t9\t.\t+\t0\tID=cds1;Name=joined;Note=second segment',
  '###',
  '',
  '##sequence-region ctg2 1 100',
  'ctg2\tProkka\ttRNA\t10\t20\t.\t-\t.\tID=trna1;Name=transfer RNA',
];

const sequenceLines = [
  '>ctg1',
  'ATGCCCTAA',
  '>ctg2',
  'ACGTACGTACGTACGTACGT',
  // Even annotation-like text after the sequence boundary must be ignored.
  'ctg2\tProkka\tgene\t30\t40\t.\t+\t.\tID=ignored;Name=ignored',
];

const parse = (lines, options = {}) => new FeatureFile(lines.join('\n'), {
  logger: new Logger({logToConsole: false}),
  ...options,
});

describe('GFF3 sequence sections', () => {
  test('keeps annotations across directives and feature boundaries', () => {
    const file = parse(annotationLines);

    expect(file.status).toBe('success');
    expect(file.lineCount).toBe(3);
    expect(file.records).toHaveLength(2);
    expect(file.records[0]).toMatchObject({
      contig: 'ctg1', name: 'joined', type: 'CDS', start: 1, stop: 9, strand: '+',
      locations: [[1, 3], [7, 9]],
      qualifiers: {product: 'test protein', note: 'second segment'},
    });
    expect(file.records[1]).toMatchObject({
      contig: 'ctg2', name: 'transfer RNA', type: 'tRNA', start: 10, stop: 20, strand: '-',
    });
  });

  describe.each(['auto', 'gff3'])('with format %s', (format) => {
    test.each([
      ['##FASTA', '\n'],
      ['##FASTA', '\r\n'],
      ['##FASTA \t', '\n'],
      ['##', '\n'],
      ['##', '\r\n'],
      ['## \t', '\n'],
      [null, '\n'],
      [null, '\r\n'],
    ])('ignores the section starting at %s with %j line endings', (separator, newline) => {
      const boundary = separator === null ? [] : [separator];
      const text = [...annotationLines, ...boundary, ...sequenceLines].join(newline);
      const expected = parse(annotationLines, {format});
      const file = new FeatureFile(text, {format, logger: new Logger({logToConsole: false})});

      expect(file.status).toBe('success');
      expect(file.validationIssues).toEqual({});
      expect(file.lineCount).toBe(3);
      expect(file.records).toEqual(expected.records);

      const builder = new FeatureBuilder(file, {logger: file.logger});
      const expectedBuilder = new FeatureBuilder(expected, {logger: expected.logger});
      expect(builder.status).toBe('success');
      expect(builder.toJSON()).toEqual(expectedBuilder.toJSON());
    });
  });

  test('does not treat ordinary metadata or comments mentioning FASTA as boundaries', () => {
    const file = parse([
      ...annotationLines.slice(0, 3),
      '##FASTA-source custom',
      '# ##FASTA is mentioned in a comment',
      ...annotationLines.slice(3),
    ]);

    expect(file.status).toBe('success');
    expect(file.records).toEqual(parse(annotationLines).records);
  });

  test('keeps validation errors for malformed annotation rows before FASTA', () => {
    const file = parse([...annotationLines, 'invalid annotation', '##FASTA', ...sequenceLines]);

    expect(file.status).toBe('failed');
    expect(file.validationIssueCount('lineError')).toBe(1);
    expect(file.validationIssues.lineError[0]).toContain('invalid annotation');
    expect(file.lineCount).toBe(4);
  });

  test('ignores all content after the bare separator even without a FASTA header', () => {
    const file = parse([...annotationLines, '##', 'ATGCCCTAA', sequenceLines[4]]);

    expect(file.status).toBe('success');
    expect(file.records).toEqual(parse(annotationLines).records);
    expect(file.lineCount).toBe(3);
  });

  test('still rejects GFF files with no annotations', () => {
    const file = parse(['##gff-version 3', '##FASTA', ...sequenceLines.slice(0, 4)]);

    expect(file.status).toBe('failed');
    expect(file.records).toEqual([]);
    expect(file.validationIssues).toEqual({});
    expect(file.lineCount).toBe(0);
  });
});
