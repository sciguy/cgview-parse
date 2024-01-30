export function removeWhiteSpace(string) {
  return string.replace(/\s+/g, "");
}

export function removeDigits(string) {
  return string.replace(/\d+/g, "");
}

export function removeNewlines(string) {
  return string.replace(/[\n\r]+/g, "");
}
