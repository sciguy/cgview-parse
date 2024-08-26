import Logger from "./Support/Logger.js";
import SequenceFile from "./Sequence/SequenceFile.js";
import CGViewBuilder from "./Sequence/CGViewBuilder.js";
import FeatureFile from "./Features/FeatureFile.js";
import FeatureBuilder from "./Features/FeatureBuilder.js";

const CGParse = {}
CGParse.Logger = Logger;
CGParse.SequenceFile = SequenceFile;
CGParse.CGViewBuilder = CGViewBuilder;
CGParse.FeatureFile = FeatureFile;
CGParse.FeatureBuilder = FeatureBuilder;

export default CGParse;

// Teselagen (For development only; Useful for comparison):
// This should be removed for production
// import { genbankToJson as genbankToTeselagen} from "@teselagen/bio-parsers";
// CGViewParse.genbankToTeselagen = genbankToTeselagen;
// import { anyToJson as anyToTeselagen} from "@teselagen/bio-parsers";
// CGVParse.anyToTeselagen = anyToTeselagen;
