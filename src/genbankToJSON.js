import { genbankToJson as genbankToTeselagen,  anyToJson } from "@teselagen/bio-parsers";
import teselagenToCGJson from "./teselagenToCGView";

const genbankToJSON = function(genbank, options={}) {
  const tesJSON = genbankToTeselagen(genbank, {inclusive1BasedStart: true, inclusive1BasedEnd: true});
  const cgvParsed = teselagenToCGJson(tesJSON, options);
  return cgvParsed;
}

export default genbankToJSON;

// log should be an array
// we have status and possible warning for each sequence (tesJSON)
// 