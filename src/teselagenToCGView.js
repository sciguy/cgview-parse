// TODO
// - contig names must be unique
// Options:
// - config: CGView config object containing keys that will be copied into the final JSON
//   keys: settings, backbone, ruler, dividers, annotation, sequence, legend, tracks
// - ??inputType: genbank, fasta, etc.
// - ??name: name of the sequence
// LOG (NEED LOG FUNCTION)
const teselagenToCGJson = function(tes, options={}) {
  let success = true;
  let log = [];
  const inputType = "genbank";

  // Check teselagen output status
  // - did any fail?
  // - are there any warnings?
  const failedTes = tes.filter((t) => !t.success);
  if (failedTes.length > 0) {
    // const log = '';
    log = ['Some sequences failed to parse.'];
    otherLogs = [];
    tes.forEach((t, index) => {
      if (!t.success) {
        log.push(`Sequence ${index + 1} [FAIL]: ${t?.parsedSequence?.name}`);
        if (t?.parsedSequence?.warnings) {
          t.parsedSequence.warnings.forEach((w) => {
            log.push(` - ${w}`);
          });
        }
      } else {
        if (t?.parsedSequence?.warnings) {
          otherLog.push(`Sequence ${index + 1} [PASS]: ${t?.parsedSequence?.name}`);
          t.parsedSequence.warnings.forEach((w) => {
            otherLog.push(` - ${w}`);
          });
        }
      }
    });
    // This keeps the failed sequence at the top of the log
    if (otherLog.length > 0) {
      log.push(...otherLog);
    }
    return { log, success: false };
  }



  // Build inital JSON using config if provided
  var json = addConfigToJSON({}, options.config);
  // Version: we should keep the version the same as the latest for CGView.js
  json.version = "1.6.0";

  json = extractSequenceAndFeatures(json, tes);
  json.name = json.sequence?.contigs[0]?.name || "Untitled";
  json = removeUnusedLegends(json);

  // Add track for features (if there are any)
  json.tracks = buildTracks(json, inputType);

  return { json: {cgview: json}, log, success};
}

// Add config to JSON. Note that no validation of the config is done.
function addConfigToJSON(json, config) {
  if (!config) { return json; }
  if (config.settings) { json.settings = config.settings; }
  if (config.backbone) { json.backbone = config.backbone; }
  if (config.ruler) { json.ruler = config.ruler; }
  if (config.dividers) { json.dividers = config.dividers; }
  if (config.annotation) { json.annotation = config.annotation; }
  if (config.sequence) { json.sequence = config.sequence; }
  if (config.legend) { json.legend = config.legend; }
  if (config.tracks) { json.tracks = config.tracks; }
  return json;
}

// TODO: contig names MUST BE UNIQUE
function extractSequenceAndFeatures(json, tes) {
  const contigs = [];
  const features = [];
  tes.forEach((t) => {
    const tesContig = t.parsedSequence;
    const name = tesContig.accession || tesContig.name;
    contigs.push({name: name, length: tesContig.sequence.length, seq: tesContig.sequence});
    const contigFeatures = extractFeatures(tesContig, name);
    features.push(...contigFeatures);
  });
  json.sequence = {contigs};
  json.features = features;
  return json;
}

// Onlys adds a Features track if there are features
// Other tracks may come from the config (in which case they are already added to the JSON)
function buildTracks(json, inputType) {
  const tracks = json.tracks || [];
  if (json.features && json.features.length > 0) {
    tracks.push({
      name: 'Features',
      separateFeaturesBy: 'strand',
      position: 'both',
      dataType: 'feature',
      dataMethod: 'source',
      dataKeys: `${inputType}-features`,
    });
  }
  return tracks;
}

// TODO: Remove legends from config that are not used
function removeUnusedLegends(json) {
  const legendItems = json.legend?.items || [];
  if (legendItems.length === 0) { return json; }
  const featureLegends = json.features?.map((f) => f.legend) || [];
  const uniqueFeatureLegends = [...new Set(featureLegends)];
  const filteredLegendItems = legendItems.filter((i) => uniqueFeatureLegends.includes(i.name));
  json.legend.items = filteredLegendItems;
  return json
}

function extractFeatures(tesContig, contigName) {
  const featuresToSkip = ['source', 'gene', 'exon']
  const features = [];
  const inputType = "genbank"; // FIXME: this should be passed in
  for (const f of tesContig.features) {
    if (featuresToSkip.includes(f.type)) { continue; }
    // NEED TO LOG
    const feature = {
      start: f.start,
      stop: f.end,
      strand: f.strand,
      name: f.name,
      type: f.type,
      contig: contigName,
      source: `${inputType}-features`,
      legend: f.type,
    };
    features.push(feature);
  };
  return features;
}

export default teselagenToCGJson;