import Logger from "./Logger.js";
import SequenceFile from "./SequenceFile.js";
import CGViewBuilder from "./CGViewBuilder.js";
// import FeatureFile from "./FeatureFile.js";

const CGParse = {}
CGParse.Logger = Logger;
CGParse.SequenceFile = SequenceFile;
CGParse.CGViewBuilder = CGViewBuilder;
// CGParse.FeatureFile = FeatureFile;

export default CGParse;

// Teselagen (For development only; Useful for comparison):
// This should be removed for production
// import { genbankToJson as genbankToTeselagen} from "@teselagen/bio-parsers";
// CGViewParse.genbankToTeselagen = genbankToTeselagen;
// import { anyToJson as anyToTeselagen} from "@teselagen/bio-parsers";
// CGVParse.anyToTeselagen = anyToTeselagen;
