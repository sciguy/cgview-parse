// import Logger from './Logger.js';

// class CGVParse {

//   // constructor(input) {
//   //   this.input = input;
//   //   // this.logger = new Logger();
//   // }

//   // seq: string
//   // options:
//   // - config: jsonConfig
//   // static seqToJSON(seq, options={}) {
//   //   // TODO: add logger options to logger
//   //   options.logger = new Logger();
//   //   const seqJSON = this.seqToSeqJSON(seq, options);
//   //   const cgvJSON = CGVParse.seqJSONToCgvJSON(seqJSON, options);
//   //   return cgvJSON;
//   // }

//   // static seqToSeqJSON(seq, options={}) {
//   //   options.logger = options.logger || new Logger();
//   //   const seqRecords = this.parseSeqRecords(seq, options);
//   //   return seqRecords;
//   // }

//   // static seqJSONToCgvJSON(seqJson, options={}) {
//   //   options.logger = options.logger || new Logger();
//   //   // Here json refers to the CGView JSON
//   //   let json = this.addConfigToJSON({}, options.config); 
//   //   // Version: we should keep the version the same as the latest for CGView.js
//   //   json.version = "1.6.0";
//   //   json = this.extractSequenceAndFeatures(json, seqJson);
//   //   json.name = json.sequence?.contigs[0]?.name || "Untitled";
//   //   json = this.removeUnusedLegends(json);
//   //   // Add track for features (if there are any)
//   //   json.tracks = this.buildTracks(json, seqJson[0].inputType);

//   //   return { cgview: json };
//   // }

// }

// export default CGVParse;