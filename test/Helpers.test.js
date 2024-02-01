import * as helpers from '../src/Helpers.js';

describe('Helpers', () => {

  // remove whitespace
  test('- removeWhiteSpace removes whitespace', () => {
    const input = "some  unknown string with spaces and\ttabs   ";
    const output = helpers.removeWhiteSpace(input);
    expect(output).toBe("someunknownstringwithspacesandtabs");
  });
  // remove digits
  test('- removeDigits removes digits', () => {
    const input = "some 123 unknown string with 456 789 digits";
    const output = helpers.removeDigits(input);
    expect(output).toBe("some  unknown string with   digits");
  });
  // remove newlines
  test('- removeNewlines removes newlines', () => {
    const input = "some\n\r unknown\r string\nwith newlines";
    const output = helpers.removeNewlines(input);
    expect(output).toBe("some unknown stringwith newlines");
  });
  // reverse
  test('- reverse a string', () => {
    const input = "This string should be reversed";
    const output = helpers.reverse(input);
    expect(output).toBe("desrever eb dluohs gnirts sihT");
  });
  // complement
  test('- complement a DNA string', () => {
    const input = "ACGTURYSWKMBDHVNacgturyswkmbdhvn";
    const output = helpers.complement(input);
    expect(output).toBe("TGCAAYRSWMKVHDBNtgcaayrswmkvhdbn");
  });
  // count characters in sequence
  test('- countCharactersInSequence', () => {
    const input = "ATGBASATAGaTafgtAGAS";
    const output = helpers.countCharactersInSequence(input, "AT");
    expect(output).toBe(12);
  });
  // determineSeqMolType
  test('- determineSeqMolType: dna', () => {
    const input = "atgtagATgCTAGN";
    const output = helpers.determineSeqMolType(input);
    expect(output).toBe('dna');
  });
  test('- determineSeqMolType: protein', () => {
    const input = "kvamdMGWYRKLiN";
    const output = helpers.determineSeqMolType(input);
    expect(output).toBe('protein');
  });
  test('- determineSeqMolType: unknown', () => {
    const input = "xxxxxxxxxxxxxxxxx";
    const output = helpers.determineSeqMolType(input);
    expect(output).toBe('unknown');
  });
  // findNonIUPACCharacters
  test('- findNonIUPACCharacters: none', () => {
    const input = "ATGCTatgcgtacgat";
    const output = helpers.findNonIUPACCharacters(input, 'dna');
    expect(output).toBe(undefined);
  });
  test('- findNonIUPACCharacters: dna', () => {
    const input = "ATGCTatfxgcOpgtacgat";
    const output = helpers.findNonIUPACCharacters(input, 'dna');
    expect(output).toBe("f,x,O,p");
  });
  test('- findNonIUPACCharacters: protein', () => {
    const input = "MSGHTGKLMxNXQWYVX*";
    const output = helpers.findNonIUPACCharacters(input, 'protein');
    expect(output).toBe("x,X");
  });


});