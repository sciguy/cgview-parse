// import teselagenToCGJson from "./teselagenToCGView.js";
// import genbankToJSON from "./genbankToJSON.js";
// import seqToJSON from "./seqToJSON.js";
import CGViewParse from "./seqToJSON.js";

// export { seqToJSON, genbankToJSON, teselagenToCGJson, genbankToTeselagen, anyToJson };
// export { seqToJSON };

// This should be removed for production
// import { genbankToJson as genbankToTeselagen} from "@teselagen/bio-parsers";
// CGViewParse.genbankToTeselagen = genbankToTeselagen;
import { anyToJson as anyToTeselagen} from "@teselagen/bio-parsers";
CGViewParse.anyToTeselagen = anyToTeselagen;

export default CGViewParse;





// Export Size
// Both the following gave the same export size
// export { genbankToJson, anyToJson };
// export { genbankToJson};
// -rw-r--r--  1 jason  staff   1.0M Jan 18 07:55 cgview-parsers.js
// -rw-r--r--  1 jason  staff   463K Jan 18 07:55 cgview-parsers.min.js