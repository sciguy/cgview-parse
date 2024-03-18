import SeqRecToCGVJSON from '../src/SeqRecToCGVJSON.js';

describe('SeqRecToCGVJSON', () => {

  describe('adjustContigNames', () => {
    test('- no changes', () => {
      const names = ['contig1', 'contig_2', 'contig-3'];
      const result = SeqRecToCGVJSON.adjustContigNames(names);
      expect(result.names).toEqual(names);
    });

    test('- replace characters: ;, |, etc', () => {
      const names = ['contig1;bob', 'contig2|bob', 'contig3(bob)'];
      const result = SeqRecToCGVJSON.adjustContigNames(names);
      const expected = ['contig1_bob', 'contig2_bob', 'contig3_bob_'];
      expect(result.names).toEqual(expected);
      expect(Object.keys(result.reasons).length).toBe(3);
    });

    test('- reduce long names (> 34)', () => {
      const names = ['thisnameislongandforsurehaschar_34',
                     'thisnameislongandforsurehaschara_35',
                     'thisnameislongandforsurehascharacters_40']
      const result = SeqRecToCGVJSON.adjustContigNames(names);
      const expected = ['thisnameislongandforsurehaschar_34',
                        'thisnameislongandforsurehaschara_3',
                        'thisnameislongandforsurehascharact']
      expect(result.names).toEqual(expected);
      expect(Object.keys(result.reasons).length).toBe(2);
    });

    test('- return unique names', () => {
      const names = ['contig1', 'contig2', 'contig2', 'contig3', 'contig2', 'contig3'];
      const result = SeqRecToCGVJSON.adjustContigNames(names);
      const expected = ['contig1', 'contig2', 'contig2-2', 'contig3', 'contig2-3', 'contig3-2'];
      expect(result.names).toEqual(expected);
      expect(Object.keys(result.reasons).length).toBe(3);
    });

    test('- return replaced, shortened, unique names', () => {
      const names = ['thisnameis\;longandforsurehaschar_36a',
                     'thisnameis&longandforsurehaschar_36a',
                     'thisnameis;longandforsurehascharacters_40']
      const result = SeqRecToCGVJSON.adjustContigNames(names);
      const expected = ['thisnameis_longandforsurehaschar_3',
                        'thisnameis_longandforsurehaschar_3-2',
                        'thisnameis_longandforsurehascharac']
      expect(result.names).toEqual(expected);
      expect(Object.keys(result.reasons).length).toBe(3);
    });
  });


});