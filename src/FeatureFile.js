// This will be the main interface to parseing Feature Files. 
// For each feature file type (e.g. GFF3, GTF, BED, CSV, etc.)
// we will have delagates that will parse the file and return a FeatureFile object.

// Check out gff-js utils for parsing GFF3 files:
// https://github.com/GMOD/gff-js/blob/master/src/util.ts

import Logger from './Logger.js';
// import FeatureBuilder from './FeatureBuilder.js';
import * as helpers from './Helpers.js';

class FeatureFile {
  
}