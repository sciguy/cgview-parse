import CGVParse from "../OLD/seqToJSON.js";

///////////////////////////
// OLD TESTS
///////////////////////////
///////////////////////////
// Sequence Records
///////////////////////////

describe('CGVParse.getSeqName', () => {
  // let cgparse = new CGVParse();

  // test('- TEST BOB', () => {
  //   const name = cgparse.testBob();
  //   expect(name).toBe("bob");
  // });
  test('- return GenBank name', () => {
    const input = "LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999\n\n\n";
    const name = CGVParse.getSeqName(input);
    expect(name).toBe("AF177870");
  });
  test('- return EMBL name', () => {
    const input = "ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.\n\n\n";
    const name = CGVParse.getSeqName(input);
    expect(name).toBe("AF177870");
  });
  test('- return "" if it can not be parsed', () => {
    const input = "some unknown string";
    const name = CGVParse.getSeqName(input);
    expect(name).toBe("");
  });
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

///////////////////////////
// HELPERS
///////////////////////////

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

///////////////////////////
// FEATURES
///////////////////////////

// getFeatureType
test('CGVParse.getFeatureType return feature type', () => {
  const input = '     gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
  const type = CGVParse.getFeatureType(input);
  expect(type).toBe("gene");
});
test('CGVParse.getFeatureType return null if it can not be parsed', () => {
  // Added extra spaces to input
  const input = '       gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
  const type = CGVParse.getFeatureType(input);
  expect(type).toBe(null);
});

// getFeatureStrand
test('CGVParse.getFeatureStrand return -1 if complement is found', () => {
  const input = '     gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
  const strand = CGVParse.getFeatureStrand(input);
  expect(strand).toBe(-1);
});
test('CGVParse.getFeatureStrand return 1 if complement is missing', () => {
  // Added extra spaces to input
  const input = '       gene            1..172\n                     /locus_tag="ECPA2_RS30085"';
  const strand = CGVParse.getFeatureStrand(input);
  expect(strand).toBe(1);
});

// getFeatureLocationText
test('CGVParse.getFeatureLocationText return location text', () => {
  const input = '     gene            complement(<1..>172)\n                     /locus_tag="ECPA2_RS30085"';
  const locationText = CGVParse.getFeatureLocationText(input);
  expect(locationText).toBe("complement(<1..>172)");
});
test('CGVParse.getFeatureLocationText return empty string if there is a qualifier instead', () => {
  const input = '     gene            /gene="someGene"                     /locus_tag="ECPA2_RS30085"';
  const locationText = CGVParse.getFeatureLocationText(input);
  expect(locationText).toBe("");
});

// isParsableFeatureRange
test("CGVParse.isParsableFeatureRange is true good ranges", () => {
  const inputs = ['102..110', 'complement(123..124)'];
  inputs.forEach(input => {
    const parsable = CGVParse.isParsableFeatureRange(input);
    expect(parsable).toBe(true);
  });
});
test("CGVParse.isParsableFeatureRange is false for ranges including '.^:'", () => {
  const inputs = ['102.110', '123^124', 'J00194.1:100..202', 'join(1..100,J00194.1:100..202)'];
  inputs.forEach(input => {
    const parsable = CGVParse.isParsableFeatureRange(input);
    expect(parsable).toBe(false);
  });
});

// getFeatureLocations
test("CGVParse.getFeatureLocations returns array of locations (complement)", () => {
  const input = "complement(<1..>172)";
  const locations = CGVParse.getFeatureLocations(input);
  expect(locations).toEqual([[1, 172]]);
});
test("CGVParse.getFeatureLocations returns array of locations (joins)", () => {
  const input = "join(1..172, 200..234)";
  const locations = CGVParse.getFeatureLocations(input);
  expect(locations).toEqual([[1,172], [200,234]]);
});

// getFeatureQualifiers
test("CGVParse.getFeatureQualifiers returns single qualifier", () => {
  const input = '       gene            1..172\n                     /locus_tag="ECPA2_RS30085"';
  const qualifiers = CGVParse.getFeatureQualifiers(input);
  expect(Object.keys(qualifiers).length).toBe(1);
  expect(qualifiers.locus_tag).toEqual(["ECPA2_RS30085"]);
});
test("CGVParse.getFeatureQualifiers returns mulitple qualifiers", () => {
  const input = '       gene            1..172\n                     /locus_tag="tag_1"\n                     /locus_tag="tag_2"';
  const qualifiers = CGVParse.getFeatureQualifiers(input);
  expect(Object.keys(qualifiers).length).toBe(1);
  expect(qualifiers.locus_tag).toEqual(["tag_1", "tag_2"]);
});
