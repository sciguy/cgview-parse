import Logger from '../Support/Logger.js';
import FeatureFile from './FeatureFile.js';
import * as helpers from '../Support/Helpers.js';

// INPUT:
// - FeatureFile or string of feature file (e.g. GFF3, GTF, BED, CSV) that can be converted to FeatureFile
// OPTIONS:
// - FIXME: CHANGE TO includ/excludeFeatures skipTypes: boolean (TEST) [Default: ['gene', 'source', 'exon']]
//   - If false, include ALL feature types in the JSON
// - includeFeatures: boolean [Default: true]
//   - If true, include ALL feature types in the JSON
//   - If array of strings, include only those feature type
//   - If false, include NO features
// - excludeFeatures: array of string [Default: undefined]
//   - include all feature types except for these
//   - ignored unless includeFeatures is true
// - includeQualifiers: boolean [Default: false]
//   - If true, include ALL qualifiers in the JSON
//   - If array of strings, include only those qualifiers
//   - If false, include NO qualifiers
// - excludeQualifiers: array of string [Default: undefined]
//   - include all qualifiers except for these
//   - ignored unless includeQualifiers is true
// - maxLogCount: number (undefined means no limit) [Default: undefined]