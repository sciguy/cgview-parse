import CGVParse from "../src/seqToJSON.js";

// getSeqName
test('CGVParse.getSeqName return GenBank name', () => {
  const input = "LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999\n\n\n";
  const name = CGVParse.getSeqName(input);
  expect(name).toBe("AF177870");
});
test('CGVParse.getSeqName return EMBL name', () => {
  const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\n\n\n";
  const name = CGVParse.getSeqName(input);
  expect(name).toBe("AF177870");
});
test('CGVParse.getSeqName return "" if it can not be parsed', () => {
  const input = "some unknown string";
  const name = CGVParse.getSeqName(input);
  expect(name).toBe("");
});

// getSeqLength
test('CGVParse.getSeqLength return length from GenBank', () => {
  const input = "LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999\n\n\n";
  const length = CGVParse.getSeqLength(input);
  expect(length).toBe(3123);
});
test('CGVParse.getSeqLength return length from EMBL', () => {
  const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\n\n\n";
  const length = CGVParse.getSeqLength(input);
  expect(length).toBe(3123);
});
test('CGVParse.getSeqLength return undefined if it can not be parsed', () => {
  const input = "some unknown string";
  const length = CGVParse.getSeqLength(input);
  expect(length).toBe(undefined);
});

// remove whitespace
test('CGVParse.removeWhiteSpace removes whitespace', () => {
  const input = "some  unknown string with spaces and\ttabs   ";
  const output = CGVParse.removeWhiteSpace(input);
  expect(output).toBe("someunknownstringwithspacesandtabs");
});
// remove digits
test('CGVParse.removeDigits removes digits', () => {
  const input = "some 123 unknown string with 456 789 digits";
  const output = CGVParse.removeDigits(input);
  expect(output).toBe("some  unknown string with   digits");
});
// remove newlines
test('CGVParse.removeNewlines removes newlines', () => {
  const input = "some\n\r unknown\r string\nwith newlines";
  const output = CGVParse.removeNewlines(input);
  expect(output).toBe("some unknown stringwith newlines");
});
