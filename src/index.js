import SequenceFile from "./SequenceFile.js";
// import CGVParse from "./CGVParse.js";

// Teselagen:
// This should be removed for production
// import { genbankToJson as genbankToTeselagen} from "@teselagen/bio-parsers";
// CGViewParse.genbankToTeselagen = genbankToTeselagen;
// import { anyToJson as anyToTeselagen} from "@teselagen/bio-parsers";
// CGVParse.anyToTeselagen = anyToTeselagen;

const CGVParse = {}
CGVParse.SequenceFile = SequenceFile;

export default CGVParse;
