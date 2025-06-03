import Logger from "./Support/Logger.js";
import SequenceFile from "./Sequence/SequenceFile.js";
import CGViewBuilder from "./Sequence/CGViewBuilder.js";
import FeatureFile from "./Features/FeatureFile.js";
import FeatureBuilder from "./Features/FeatureBuilder.js";
import * as helpers from './Support/Helpers.js';
import CSVFeatureFile from "./Features/FeatureFileFormats/CSVFeatureFile.js";

const CGParse = {}
CGParse.version = helpers.CGPARSE_VERSION;
CGParse.Logger = Logger;
CGParse.helpers = helpers;
CGParse.SequenceFile = SequenceFile;
CGParse.CGViewBuilder = CGViewBuilder;
CGParse.FeatureFile = FeatureFile;
CGParse.FeatureBuilder = FeatureBuilder;
CGParse.CSVFeatureFile = CSVFeatureFile

export default CGParse;
