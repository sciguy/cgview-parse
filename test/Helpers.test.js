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

});