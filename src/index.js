import { genbankToJson as genbankToTeselagen,  anyToJson } from "@teselagen/bio-parsers";
import teselagenToCGJson from "./teselagenToCGView.js";
import genbankToJSON from "./genbankToJSON.js";

export { genbankToJSON, teselagenToCGJson, genbankToTeselagen, anyToJson };





// Export Size
// Both the following gave the same export size
// export { genbankToJson, anyToJson };
// export { genbankToJson};
// -rw-r--r--  1 jason  staff   1.0M Jan 18 07:55 cgview-parsers.js
// -rw-r--r--  1 jason  staff   463K Jan 18 07:55 cgview-parsers.min.js