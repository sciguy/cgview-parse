var CGParse = (function () {
  'use strict';

  // OPTIONS:
  // - logToConsole [Default: true]: log to console
  // - showTimestamps [Default: true]: Add time stamps
  // - showIcons: Add level as icon: warn, info, etc
  // - maxLogCount: Maximum number of similar log messages to keep
  // NOTE:
  // - logToConsole and showTimestamps can be overridden in each log call
  //   as well as the history
  // TODO:
  // - add groups to group logs together for formatting and filtering
  // Logging levels: log, info, warn, error
  // Log messages can be a simgle message or an array of messages
  // - When an array of messages is provided, if the cound is more than maxLogCount
  //   then only the first maxLogCount messages are shown.
  class Logger {

    constructor(options={}) {
      this.options = options;
      this.logToConsole = (options.logToConsole === undefined) ? true : options.logToConsole;
      this.showTimestamps = (options.showTimestamps === undefined) ? true : options.showTimestamps;
      this.showIcons = (options.showIcons === undefined) ? false : options.showIcons;
      this.maxLogCount = (options.maxLogCount === undefined) ? false : options.maxLogCount;
      this.logs = [];
    }

    get count() {
      return this.logs.length;
    }

    log(messages, options={}) {
      this._log(messages, 'log', options);
    }

    info(messages, options={}) {
      this._log(messages, 'info', options);
    }

    warn(messages, options={}) {
      this._log(messages, 'warn', options);
    }

    error(messages, options={}) {
      this._log(messages, 'error', options);
    }

    break(divider="\n") {
      const logItem = { type: 'break', break: divider };
      this.logs.push(logItem);
    }

    history(options={}) {
      let text = '';
      for (const logItem of this.logs) {
        if (logItem.type === 'message') {
          text += `${this._formatMessage(logItem, options)}\n`;
        } else if (logItem.type === 'break') {
          text += logItem.break;
        }
      }
      return text;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Private methods
    ///////////////////////////////////////////////////////////////////////////

    // level: warn, error, info, log
    _log(messages, level, options={}) {
      const timestamp = this._formatTime(new Date());
      messages = (Array.isArray(messages)) ? messages : [messages];
      const maxLogCount = this._optionFor('maxLogCount', options);
      let messageLimitReached;
      for (const [index, message] of messages.entries()) {
        if (maxLogCount && index >= maxLogCount && index !== messages.length - 1) {
          const padding = messages[0].match(/^\s*/)[0];
          messageLimitReached = `${padding}- Only showing first ${maxLogCount}: ${messages.length - maxLogCount} more not shown (${messages.length.toLocaleString()} total)`;
        }
        const logItem = { type: 'message', message: (messageLimitReached || message), level, timestamp, icon: options.icon };
        this.logs.push(logItem);
        this._consoleMessage(logItem, options);
        if (messageLimitReached) { break; }
      }
      // const logItem = { type: 'message', messages, level, timestamp, icon: options.icon };
      // this.logs.push(logItem);
      // this._consoleMessage(logItem, options);
    }

    _consoleMessage(logItem, options={} ) {
      if (this._optionFor('logToConsole', options)) {
        console[logItem.level](this._formatMessage(logItem, options));
      }
    }

    _formatMessage(logItem, options={}) {
      let message = "";
      if (this._optionFor('showIcons', options)) {
        const icon = logItem.icon || logItem.level;
        message += this._icon(icon) + "";
      }
      if (this._optionFor('showTimestamps', options)) {
        message += `[${logItem.timestamp}] `;
      }
      message += logItem.message;
      return message
    }

    // e.g. 15:30:00
    _formatTime(date) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        hour12: false
      });
    }

    // Return an icon for the name which may be a level or a custom icon
    // - name can be a level (e.g. log, info, warn, error), one of the other
    //   icons names (e.g. success, fail), or a custom icon (e.g. name = '🍎')
    _icon(name) {
        const icons = {
          log: '📝', info: 'ℹ️', warn: '⚠️', error: '🛑',
          success: '✅', fail: '🛑', none: ' ',
       };
       if (name) {
          return icons[name] || name;
        } else {
          return icons.none;
        }
    }

    // Return the value for the option name from the default options (provided in Logger constructor)
    // Options passed here will override the default options
    _optionFor(name, options={}) {
      if (options[name] !== undefined) {
        return options[name];
      } else {
        return this[name];
      }
    }

  }

  function removeWhiteSpace(string) {
    return string.replace(/\s+/g, "");
  }

  function removeDigits(string) {
    return string.replace(/\d+/g, "");
  }

  function convertLineEndingsToLF(text) {
    // Replace CRLF and CR with LF
    return text.replace(/\r\n?/g, '\n');
  }

  /**
   * Returns a string id using the _name_ and _start_ while
   * making sure the id is not in _currentIds_.
   * ```javascript
   * JSV.uniqueName('CDS', ['RNA', 'CDS']);
   * //=> 'CDS-2'
   * ```
   * @param {String} name - Name to check
   * @param {Array} allNames - Array of all names to compare against
   * @return {String}
   */
  function uniqueName(name, allNames) {
    if (allNames.includes(name)) {
      return uniqueId(`${name}-`, 2, allNames);
    } else {
      return name;
    }
  }
  /**
   * Returns a string id using the _idBase_ and _start_ while
   * making sure the id is not in _currentIds_.
   * ```javascript
   * JSV.uniqueId('spectra_', 1, ['spectra_1', 'spectra_2']);
   * //=> 'spectra_3'
   * ```
   * @param {String} idBase - Base of ids
   * @param {Integer} start - Integer to start trying to creat ids with
   * @param {Array} currentIds - Array of current ids
   * @return {String}
   */
  function uniqueId(idBase, start, currentIds) {
    let id;
    do {
      id = idBase + start;
      start++;
    } while (currentIds.indexOf(id) > -1);
    return id;
  }
  // Basic testing shows that Method #2 is faster
  // Using E.Coli PA2 as a test case:
  // Times are for full parsing of the file
  // Method #1: ~500ms
  // Method #2: ~420ms
  function reverse(string) {
    // Method #1
    // return string.split("").reverse().join("");
    // Method #2
    let reversed = '';
    for (let i = string.length - 1; i >= 0; i--) {
      reversed += string[i];
    }
    return reversed;
  }

  // export function isASCII(text) {
  //   // const isBinary = !/^[\x00-\x7F]*$/.test(text);
  //   const isBinary = /[\x00-\x08\x0E-\x1F\x7F]/.test(text); 
  //   console.log("IS BINARY? ", isBinary)
  //   return !isBinary;
  //   // return /^[\x00-\x7F]*$/.test(text);
  //   // return !/^[\x00-\x08\x0E-\x1F\x7F]*$/.test(text);
  //   // return /^[\x00]*$/.test(text);
  // }

  // ChatGPT special
  function isBinary(text) {
    const CHUNK_SIZE = 512; // Number of bytes to read
    let isBinary = false;
    const data = text.slice(0, CHUNK_SIZE);
    let printableCharacterCount = 0;
    let controlCharacterCount = 0;
    let totalCharacterCount = 0;

     // Check for BOM (Byte Order Mark)
     if (data.length >= 3 && data.charCodeAt(0) === 0xEF && data.charCodeAt(1) === 0xBB && data.charCodeAt(2) === 0xBF) {
      isBinary = false;
    } else {
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i);

        // Check for printable characters
        if ((charCode >= 0x20 && charCode <= 0x7E) || charCode === 0x09 || charCode === 0x0A || charCode === 0x0D) {
          printableCharacterCount++;
        } else if (charCode < 0x20 && charCode !== 0x09 && charCode !== 0x0A && charCode !== 0x0D) {
          controlCharacterCount++;
        }
      }

      // Heuristic to determine binary vs text
      const printableRatio = printableCharacterCount / totalCharacterCount;
      const controlRatio = controlCharacterCount / totalCharacterCount;

      console.log("IS BINARY: ", printableRatio, controlRatio);
      if (printableRatio < 0.8 || controlRatio > 0.1) {
        isBinary = true;
      }
    }
    return isBinary;
  }


  // May not be very fast
  // https://medium.com/@marco.amato/playing-with-javascript-performances-and-dna-cb0270ad37c1
  function complement(dna) {
    const table = {
        'A': 'T', 'C': 'G', 'G': 'C', 'T': 'A', 'U': 'A', 'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W',
        'K': 'M', 'M': 'K', 'B': 'V', 'D': 'H', 'H': 'D', 'V': 'B', 'N': 'N', 
        'a': 't', 'c': 'g', 'g': 'c', 't': 'a', 'u': 'a', 'r': 'y', 'y': 'r', 's': 's', 'w': 'w',
        'k': 'm', 'm': 'k', 'b': 'v', 'd': 'h', 'h': 'd', 'v': 'b', 'n': 'n'
    };

    return dna.split('').map(char => table[char] || char).join('');
  }


    // OLD PROKSEE METHOD
    // _seqMolType(seq) {
    //   const nonDNASeq = seq.replace(/[AGCTN\-]/gi, '');
    //   return ( (nonDNASeq.length / seq.length) > 0.25 ) ? 'protein' : 'dna';
    // }
    // NOTE we may need to be less stringent with dna check (like above)
    // - allow n's and -'s
    function determineSeqMolType(sequence) {
      let type;
      const commonDNAChars = "ATGC";
      const commonProteinChars = "ACDEFGHIKLMNPQRSTVWY";
      const seqLength = sequence.length;
      const numCommonDNAChars = countCharactersInSequence(sequence, commonDNAChars);
      if ( (numCommonDNAChars / seqLength) > 0.9) {
        type = 'dna';
      } else {
        const numCommonProteinChars = countCharactersInSequence(sequence, commonProteinChars);
        if ( (numCommonProteinChars / seqLength) > 0.9) {
          type = 'protein';
        } else {
          type = 'unknown';
        }
      }
      return type;
    }

    function findNonIUPACCharacters(seq, type) {
      const seqType = type.toLowerCase();
      let chars;
      if (seqType === 'dna') {
        const nonIUPAC = seq.replace(/[AGCTURYSWKMBDHVN\-\.]/gi, '');
        if (nonIUPAC.length > 0) {
          chars = Array.from(new Set([...nonIUPAC])).join(',');
        }
      } else if (seqType === 'protein') {
        const nonIUPAC = seq.replace(/[ARNDCQEGHILKMFPOSUTWYVBZJ\-\.\*]/gi, '');
        if (nonIUPAC.length > 0) {
          chars = Array.from(new Set([...nonIUPAC])).join(',');
        }
      }
      return chars;
    }

  // Args:
  // - sequence (upper or lower case) is a string of the sequence to count characters in
  // - characters (upper case) is a string of the individual characters (not pattern) to count
  //   (e.g. "A", "AT", "ATGC", "ATGCN", "ATCG.-")
  // Note about speed.
  // - I've tested sevaral methods and this one is the fastest.
  // - The other methods are below for reference (ranked by speed)
  // - Speed is based on the parse test page for E.Coli PA2
  // - The speed is the total parse time (in orange on the test page)
  // Speeds
  // - base speed (no countCharactersInSequence): ~190ms
  // - selected method (using Set and for loop): ~330ms (~140ms slower than base speed)
  // - regex: ~700ms (~510ms slower than base speed)
  // - split(regex): ~840ms (~650ms slower than base speed)
  // - includes: ~930ms (~740ms slower than base speed)
  function countCharactersInSequence(sequence, characters) {
    const seq = sequence.toUpperCase();
    const charsSet = new Set(characters.split(""));
    let count = 0;
    for (let i=0, len=seq.length; i < len; i++) {
      if (charsSet.has(seq[i])) {
        count++;
      }
    }
    return count;
  }
  // - regex is pretty damn slow: ~700ms (adds ~500ms to Ecoli PA2 parsing time from 190ms to 700ms)
  // export function countCharactersInSequence(sequence, characters) {
  //   const regString = `[${characters}]`
  //   const regex = new RegExp(regString, "gi");
  //   return (sequence.match(regex) || []).length;
  //   // const regex = new RegExp(regString, "g");
  //   // const seq = sequence.toUpperCase();
  //   // return (seq.match(regex) || []).length;
  // }
  // This one is still slow: ~840ms
  // export function countCharactersInSequence(sequence, characters) {
  //   const regString = `[${characters}]`
  //   const regex = new RegExp(regString, "gi");
  //   return (sequence.split(regex).length - 1);
  // }
  // This one is even slower: ~930ms
  // export function countCharactersInSequence(sequence, characters) {
  //   const seq = sequence.toUpperCase();
  //   const chars = characters.toUpperCase().split("");
  //   let count = 0;
  //   for (let i=0, len=seq.length; i < len; i++) {
  //     if (chars.includes(seq[i])) {
  //       count++;
  //     }
  //   }
  //   return count;
  // }

  // INPUT:
  // - SequenceFile or string of sequence file (e.g. GenBank, FASTA) that can be converted to SequenceFile
  // OPTIONS:
  // - config: jsonConfig
  // - skipTypes: boolean (TEST) [Default: ['gene', 'source', 'exon']]
  //   - If false, include ALL feature types in the JSON
  // - includeQualifiers: boolean [Defualt: false]
  //   - If true, include ALL qualifiers in the JSON
  //   - If array of strings, include only those qualifiers
  //   - If false, include NO qualifiers
  // - includeCaption: boolean [Defualt: true]
  //   - NOTE: captions could come from the config (like I did for cgview_builder.rb)
  // - skipComplexLocations: boolean (not implemented yet) [Defualt: true]
  //   - need to decide how to handle these
  // - maxLogCount: number (undefined means no limit) [Default: undefined]

  // LOGGING (including from sequence file)
  // - start with date and version (and options: skipTypes, includeQualifiers, skipComplexLocations)
  class CGViewBuilder {

    constructor(input, options = {}) {
      // this.input = input;
      this.version = "1.6.0";
      this.options = options;
      this.logger = options.logger || new Logger();
      if (options.maxLogCount) {
        this.logger.maxLogCount = options.maxLogCount;
      }
      this._success = true;
      this._status = 'success';
      this.includeQualifiers = options.includeQualifiers || false;
      this.includeCaption = (options.includeCaption === undefined) ? true : options.includeCaption;
      this.defaultTypesToSkip = ['gene', 'source', 'exon'];

      this.seqFile = this._parseInput(input);
      this.inputType = this.seqFile.inputType;
      this.sequenceType = this.seqFile.sequenceType;
      if (this.seqFile.success === true) {
        this._json = this._convert(this.seqFile.records);
      } else {
        this._fail('*** Cannot convert to CGView JSON because parsing sequence file failed ***');
      }
    }

    // Should be one of: 'success', 'warnings', 'fail'
    get success() {
      // return this._success;
      return this.status === 'success';
    }

    get passed() {
      return this.status === 'success' || this.status === 'warnings';
    }

    get status() {
      return this._status;
    }

    _fail(message) {
      this.logger.error(message);
      // this._success = false;
      this._status = 'fail';
    }

    _warn(message) {
      this.logger.warn(message);
      if (this.status !== 'fail') {
        this._status = 'warnings';
      }
    }

    _parseInput(input) {
      // console.log("Parse input")
      if (typeof input === "string") {
        return new SequenceFile$1(input, {logger: this.logger});
      } else if (input instanceof SequenceFile$1) {
        return input;
      } else {
        this._fail("Invalid input: must be a string (from GenBank, EMBL, FASTA, Raw) or SequenceFile object");
        // throw new Error("Invalid input");
      }
    }

    _convert(seqRecords) {
      // this.logger.info(`Converting ${seqRecord.length} sequence record(s) to CGView JSON (version ${this.version})`);
      this._skippedFeaturesByType = {};
      this._skippedComplexFeatures = [];
      this._skippedLocationlessFeatures = [];
      this.logger.info(`Date: ${new Date().toUTCString()}`);
      this.logger.info(`Converting to CGView JSON...`);
      this.logger.info(`- CGView JSON version ${this.version}`);
      this.logger.info(`- Input Sequence Count: ${seqRecords.length}`);
      this.logger.info(`- Input File Type: ${this.inputType || 'Unknown'}`);
      this.logger.info(`- Input Sequence Type: ${this.sequenceType || 'Unknown'}`);
      // Check for records and make sure they are DNA
      if (!seqRecords || seqRecords.length < 1) {
        this._fail("Conversion Failed: No sequence records provided");
        return;
      }
      if (this.sequenceType?.toLowerCase() !== 'dna') {
        this._fail(`Conversion Failed: Input type is not DNA: '${this.sequenceType}'`);
        return;
      }
      // Here json refers to the CGView JSON
      let json = this._addConfigToJSON({}, this.options.config); 
      // Version: we should keep the version the same as the latest for CGView.js
      json.version = this.version;
      this._adjustContigNames(seqRecords);
      json.captions = this._getCaptions(json, seqRecords);
      json.settings.format = CGViewBuilder.determineFormat(seqRecords);
      json = this._extractSequenceAndFeatures(json, seqRecords);
      this._summarizeSkippedFeatures();
      this._adjustFeatureGeneticCode(json);
      this._logQualifiers();
      // json.name = json.sequence?.contigs[0]?.name || "Untitled";
      json.name = seqRecords[0]?.definition || seqRecords[0]?.name || seqRecords[0]?.seqID || "Untitled";
      json = this._removeUnusedLegends(json);
      // Add track for features (if there are any)
      json.tracks = this._buildTracks(json, this.inputType);
      this._convertSummary(json);
      return { cgview: json };
    }

    _getCaptions(json, seqRecords) {
      const captions = json.captions ? [...json.captions] : [];
      // console.log(this.includeCaption)
      if (this.includeCaption) {
        this.logger.info(`- Adding caption...`);
        const captionText = seqRecords[0]?.definition || seqRecords[0].seqID || "Untitled";
        const caption = {name: captionText, textAlignment: "center", font: "sans-serif,plain,24", fontColor: "darkblue", position: "bottom-center"};
        captions.push(caption);
      }
      return captions;
    }

    _logQualifiers() {
      let qualifiersToInclude = "none";
      if (this.includeQualifiers === true) {
        qualifiersToInclude = "all";
      } else if (Array.isArray(this.includeQualifiers)) {
        qualifiersToInclude = this.includeQualifiers.join(', ');
      }
      this.logger.info(`- Extracted Qualifiers: ${qualifiersToInclude} `);
    }

    _convertSummary(json) {
      const contigs = json.sequence?.contigs || [];
      const contigCount = contigs.length || 0;
      const featureCount = json.features?.length || 0;
      const trackCount = json.tracks?.length || 0;
      const legendCount = json.legend?.items?.length || 0;
      const seqLength = contigs.map((contig) => contig.length).reduce((a, b) => a + b, 0);
      let skippedFeatures = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
      skippedFeatures += this._skippedComplexFeatures.length;
      skippedFeatures += this._skippedLocationlessFeatures.length;
      this.logger.break('--------------------------------------------\n');
      this.logger.info('CGView JSON Summary:');
      this.logger.info(`- Map Name: ${json.name.padStart(19)}`);
      this.logger.info(`- Contig Count: ${contigCount.toLocaleString().padStart(15)}`);
      this.logger.info('- Total Length (bp): ' + `${seqLength.toLocaleString()}`.padStart(10));
      this.logger.info(`- Track Count: ${trackCount.toLocaleString().padStart(16)}`);
      this.logger.info(`- Legend Count: ${legendCount.toLocaleString().padStart(15)}`);
      this.logger.info(`- Features Included: ${featureCount.toLocaleString().padStart(10)}`);
      this.logger.info(`- Features Skipped: ${skippedFeatures.toLocaleString().padStart(11)}`);
      if (this.success) {
        this.logger.info('- Status: ' + 'Success'.padStart(21), {icon: 'success'});
      } else if (this.status === 'warnings') {
        this.logger.warn('- Status: ' + 'Warnings'.padStart(21), {icon: 'warn'});
      } else {
        this.logger.error('- Status: ' + 'FAILED'.padStart(21), {icon: 'fail'});
      }
      this.logger.break('--------------------------------------------\n');
    }

    _summarizeSkippedFeatures() {
      // Skipped Types
      const skippedFeatures = this._skippedFeaturesByType;
      const skippedFeatureCount = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
      if (Object.keys(skippedFeatures).length > 0) {
        this.logger.info(`- Skipped features (${skippedFeatureCount}) by type:`);
        for (const [key, value] of Object.entries(skippedFeatures)) {
          this.logger.info(`  - ${key}: ${value.toLocaleString().padStart(15 - key.length)}`);
        }
      }
      // Complex Locations
      const complexFeatures = this._skippedComplexFeatures;
      const complexCount = complexFeatures.length;
      if (complexCount > 0) {
        this.logger.info(`- Skipped features (${complexCount}) with complex locations:`);
        const messages = complexFeatures.map((f) => `  - ${f.type} '${f.name}': ${f.locationText}`);
        this.logger.info(messages);
      }
      // Missing Locations
      const locationlessFeatures = this._skippedLocationlessFeatures;
      const locationlessCount = locationlessFeatures.length;
      if (locationlessCount > 0) {
        this._warn(`- Skipped features (${locationlessCount}) with missing locations:`);
        const messages = locationlessFeatures.map((f) => `  - ${f.type} '${f.name}': ${f.locationText}`);
        this._warn(messages);
      }
    }

    // Add config to JSON. Note that no validation of the config is done.
    _addConfigToJSON(json, config) {
      const configKeys = config ? Object.keys(config) : ['none'];
      this.logger.info(`- Config properties provided: ${configKeys.join(', ')}`);

      json.settings = (config && config.settings) ? config.settings : {};
      json.backbone = (config && config.backbone) ? config.backbone : {};
      json.ruler = (config && config.ruler) ? config.ruler : {};
      json.dividers = (config && config.dividers) ? config.dividers : {};
      json.annotation = (config && config.annotation) ? config.annotation : {};
      json.sequence = (config && config.sequence) ? config.sequence : {};
      json.legend = (config && config.legend) ? config.legend : {};
      json.tracks = (config && config.tracks) ? config.tracks : [];

      return json;
    }

    // Adjust contig names:
    // - to be unique by adding a number to the end of duplicate names
    // - replace nonstandard characters with underscores
    // - length of contig names should be less than 37 characters
    _adjustContigNames(seqRecords) {
      const names = seqRecords.map((seqRecord) => seqRecord.name);
      const adjustedNameResults = CGViewBuilder.adjustContigNames(names);
      const adjustedNames = adjustedNameResults.names;
      const reasons = adjustedNameResults.reasons;
      this.logger.info('- Checking contig names...');
      const changedNameIndexes = Object.keys(reasons);
      if (changedNameIndexes.length > 0) {
        // Change SeqRecord names
        seqRecords.forEach((seqRecord, i) => {
          seqRecord.name = adjustedNames[i];
        });
        // Log details
        this._warn(`The following contig names (${changedNameIndexes.length}) were adjusted:`);
        this._warn(`Reasons: DUP (duplicate), LONG (>34), REPLACE (nonstandard characters), BLANK (empty)`);
        const messages = [];
        changedNameIndexes.forEach((i) => {
          const reason = reasons[i];
          messages.push(`- [${reason.index + 1}] ${reason.origName} -> ${reason.newName} (${reason.reason.join(', ')})`);
          // this.logger.warn(`- [${reason.index + 1}] ${reason.origName} -> ${reason.newName} (${reason.reason.join(', ')})`);
        });
        this._warn(messages);

      }
    }

    // Check what the most common genetic code is in the features
    // Set the default genetic code to the most common one
    // Features with the default genetic code do not need to have the genetic code specified
    // We will only keep the genetic code for a feature if is different the common case.
    _adjustFeatureGeneticCode(json) {
      const features = json.features;
      if (!features || features.length < 1) { return; }
      const cdsFeatures = features.filter((f) => f.type === 'CDS');
      if (!cdsFeatures || cdsFeatures.length < 1) { return; }
      const geneticCodes = cdsFeatures.map((f) => f.geneticCode);
      const counts = {};
      geneticCodes.forEach((code) => {

        counts[code] = counts[code] ? counts[code] + 1 : 1;
      });
      let maxCode = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      this.logger.info(`- Most common genetic code (transl_table): ${maxCode} (Count: ${counts[maxCode]}/${cdsFeatures.length} CDS features}`);
      if (Object.keys(counts).length > 1) {
        this._warn(`- Additional genetic codes found: ${Object.keys(counts).join(', ')}`);
      }
      // Set the JSON genetic code to the most common one
      json.settings.geneticCode = parseInt(maxCode);
      // Remove common genetic code from features
      json.features.forEach((f) => {
        if (f.type === 'CDS' && f.geneticCode === parseInt(maxCode)) {
          delete f.geneticCode;
        }
      });
    }

    // Based on seq records, determine the format of the sequence:
    // Default wil be "circular" unless there is only one sequence and it is linear
    static determineFormat(seqRecords=[]) {
      if (seqRecords.length > 1) {
        return "circular";
      } else if (seqRecords[0]?.topology === 'linear') {
        return "linear";
      } else {
        return "circular";
      }
    }


    // Given an array of sequence names, returns an object with:
    // - names: an array of corrected sequence names
    // - reasons: an array of object reasons for the correction:
    //   - index: the index of the name in the original array
    //   - origName: the original name
    //   - newName: the corrected name
    //   - reason: the reason for the correction
    //     (e.g. "duplicate", "too long", "nonstandard characters", "blank")
    //     (e.g. "DUP", "LONG", "REPLACE", "BLANK"
    static adjustContigNames(names=[]) {
      // console.log(names)
      const reasons = {};
      // Replace nonstandard characters
      // Consider adding (.:#) here: https://www.ncbi.nlm.nih.gov/genbank/fastaformat/
      // - do any of these break Crispr/Other tools
      let replacedNames = names.map((name) => name.replace(/[^a-zA-Z0-9\*\_\-]+/g, '_'));
      names.forEach((name, i) => {
        if (name !== replacedNames[i]) {
          reasons[i] = {index: i, origName: name, newName: replacedNames[i], reason: ["REPLACE"]};
        }
      });
      // Blank names
      // NOTE: Blank names should not have been changed by above (they would have been replaced with '_')
      // - So we don't need to push to reasons, we can just set he reason here
      replacedNames.forEach((name, i) => {
        const newName = 'Unknown';
        if (name === '') {
          replacedNames[i] = newName;
          reasons[i] = {index: i, origName: name, newName: newName, reason: ["BLANK"]};
        }
      });
      // Shorten names
      replacedNames.forEach((name, i) => {
        if (name.length > 34) {
          replacedNames[i] = name.slice(0, 34);
          if (reasons[i]) {
            reasons[i].newName = replacedNames[i];
            reasons[i].reason.push("LONG");
          } else {
            reasons[i] = {index: i, origName: name, newName: replacedNames[i], reason: ["LONG"]};
          }
        }
      });
      // Make names unique
      const finalNames = [];
      replacedNames.forEach((name, i) => {
        const newName = uniqueName(name, finalNames);
        finalNames.push(newName);
        if (newName !== name) {
          if (reasons[i]) {
            reasons[i].newName = newName;
            reasons[i].reason.push("DUP");
          } else {
            reasons[i] = {index: i, origName: name, newName: newName, reason: ["DUP"]};
          }
        }
      });

      return {names: finalNames, reasons: Object.values(reasons)};
    }

    // TODO: contig names MUST BE UNIQUE
    _extractSequenceAndFeatures(json, seqJson) {
      const contigs = [];
      const features = [];
      this._skippedTypesSetup();
      seqJson.forEach((seqRecord) => {
        contigs.push({name: seqRecord.name, length: seqRecord.sequence.length, seq: seqRecord.sequence});
        const contigFeatures = this._extractFeatures(seqRecord, seqRecord.name, seqRecord.inputType);
        features.push(...contigFeatures);
      });
      json.sequence = {contigs};
      json.features = features;
      return json;
    }

    _skippedTypesSetup() {
      const options = this.options;
      if (options.skipTypes === false) {
        this.featuresToSkip = [];
      } else if (Array.isArray(options.skipTypes)) {
        this.featuresToSkip = options.skipTypes;
      } else {
        this.featuresToSkip = this.defaultTypesToSkip;
      }
      const skipTypes = this.featuresToSkip.length === 0 ? "none" : this.featuresToSkip.join(', ');
      this.logger.info(`- Feature types to skip: ${skipTypes}`);
    }

    // Onlys adds a Features track if there are features
    // Other tracks may come from the config (in which case they are already added to the JSON)
    _buildTracks(json, inputType) {
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
    _removeUnusedLegends(json) {
      const legendItems = json.legend?.items || [];
      if (legendItems.length === 0) { return json; }
      const featureLegends = json.features?.map((f) => f.legend) || [];
      const uniqueFeatureLegends = [...new Set(featureLegends)];
      const filteredLegendItems = legendItems.filter((i) => uniqueFeatureLegends.includes(i.name));
      json.legend.items = filteredLegendItems;
      return json
    }

    _extractFeatures(seqContig, contigName, inputType) {
      const features = [];
      const source = inputType ? `${inputType}-features` : "features";
      for (const f of seqContig.features) {
        if (this.featuresToSkip.includes(f.type)) {
          this._skippedFeaturesByType[f.type] = this._skippedFeaturesByType[f.type] ? this._skippedFeaturesByType[f.type] + 1 : 1;
          continue;
        }
        if (f.locations.length > 1) {
          this._skippedComplexFeatures.push(f);
          continue;
        }
        if (f.locations.length < 1) {
          this._skippedLocationlessFeatures.push(f);
          continue;
        }
        const feature = {
          start: f.start,
          stop: f.stop,
          strand: f.strand,
          name: f.name,
          type: f.type,
          contig: contigName,
          source,
          legend: f.type,
        };
        // codonStart (from codon_start)
        if (f.qualifiers && f.qualifiers.codon_start && parseInt(f.qualifiers.codon_start[0]) !== 1) {
          feature.codonStart = parseInt(f.qualifiers.codon_start[0]);
        }
        // geneticCode (from transl_table)
        if (feature.type === 'CDS') {
          const geneticCode = f.qualifiers && f.qualifiers.transl_table && parseInt(f.qualifiers.transl_table[0]);
          // The default genetic code for GenBank/EMBL is 1
          feature.geneticCode = geneticCode || 1;
        }
        const qualifiers = CGViewBuilder.extractQualifiers(f.qualifiers, this.includeQualifiers);
        if (qualifiers) {
          feature.qualifiers = qualifiers;
        }

        // Add feature to list
        features.push(feature);
      }    return features;
    }

    static extractQualifiers(qualifiersIn, includeQualifiers) {
      let qualifiersOut = {};

      if (includeQualifiers === true && qualifiersIn) {
        qualifiersOut = qualifiersIn;
      } else if (Array.isArray(includeQualifiers)) {
        includeQualifiers.forEach((q) => {
          if (qualifiersIn[q] !== undefined) {
            qualifiersOut[q] = qualifiersIn[q];
          }
        });
      }

      if (Object.keys(qualifiersOut).length > 0) {
        return qualifiersOut;
      }
    }

    toJSON() {
      return this._json;
    }

    static fromSequenceText(text, options) {
      const logger = new Logger({logToConsole: false, showIcons: true});
      const builder = new CGViewBuilder(text, {logger: logger, ...options});
      return {json: builder.toJSON(), log: builder.logger.history()};
    }



  }

  // Holds a sequence and features from a sequence file: genbank, embl, fasta, raw
  // Parses text from sequence file
  // Creates sequence records json that can be converted to CGView JSON
  // Array of sequence records containing array of features
  // TODO: Give examples of output (the record format)


  class SequenceFile {

    static toCGViewJSON(inputText, options={}) {
      const logger = new Logger({logToConsole: false});
      const seqFile = new SequenceFile(inputText, {logger: logger, ...options});
      return seqFile.toCGViewJSON();
    }

    // inputText: string from GenBank, EMBL, Fasta, or Raw [Required]
    // Options:
    // - addFeatureSequences: boolean [Default: false]. This can increase run time ~3x.
    // - nameKeys: The order of preference for the name of a feature
    //   - array of strings [Default: ['gene', 'locus_tag', 'product', 'note', 'db_xref']]
    // - logger: logger object
    // - maxLogCount: number (undefined means no limit) [Default: undefined]
    constructor(inputText, options={}) {
      // this.inputText;
      // console.log("THIS IS THE NEW STUFF$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4")
      // console.log(/\r\n/.test(inputText));
      const convertedText = convertLineEndingsToLF(inputText);
      // console.log(/\r\n/.test(convertedText));
      // const convertedText = inputText;
      this.logger = options.logger || new Logger();
      options.logger = this.logger;
      if (options.maxLogCount) {
        this.logger.maxLogCount = options.maxLogCount;
      }
      this.logger.info(`Date: ${new Date().toUTCString()}`);
      this._success = true;
      this._status = 'success';
      this._records = [];
      this._errorCodes = new Set();

      this.nameKeys = options.nameKeys || ['gene', 'locus_tag', 'product', 'note', 'db_xref'];

      if (!convertedText || convertedText === '') {
        this._fail('Parsing Failed: No input text provided.', 'empty');
      // } else if (!helpers.isASCII(convertedText)) {
      } else if (isBinary(convertedText)) {
        this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', 'binary');
      } else {
        this._records = this._parse(convertedText, options);
        if (options.addFeatureSequences) {
          this._addFeatureSequence(this._records);
        }
        this._determineSequenceTypes(this._records);
        this._determineOverallInputAndSequenceType(this._records);
        this.logger.info('- done parsing sequence file');
        this._validateRecords(this._records);
        this.parseSummary();
      }
      this.logger.break();
    }

    /////////////////////////////////////////////////////////////////////////////
    // Properties
    /////////////////////////////////////////////////////////////////////////////

    get status() {
      return this._status;
    }

    get success() {
      return this.status == 'success';
    }

    get inputType() {
      return this._inputType;
    }

    get sequenceType() {
      return this._sequenceType;
    }

    // { inputType, sequenceType, sequenceCount, featureCount, totalLength, success }
    get summary() {
      return this._summary;
    }

    // Returns an array of unique error codes
    // Codes: unknown, binary, empty
    get errorCodes() {
      return Array.from(this._errorCodes);
    }

    /////////////////////////////////////////////////////////////////////////////
    // EXPORTERS
    /////////////////////////////////////////////////////////////////////////////

    toCGViewJSON(options={}) {
      if (this.success) {
        options.logger = options.logger || this.logger;
        const builder = new CGViewBuilder(this, options);
        return builder.toJSON();
      } else {
        this.logger.error('*** Cannot convert to CGView JSON because parsing failed ***');
      }
    }

    get records() {
      return this._records;
    }

    /////////////////////////////////////////////////////////////////////////////
    // SUMMARY
    /////////////////////////////////////////////////////////////////////////////

    parseSummary() {
      const records = this.records;
      const features = records.map((record) => record.features).flat();
      const seqLength = records.map((record) => record.length).reduce((a, b) => a + b, 0);

      this.logger.break('--------------------------------------------\n');
      this.logger.info('Parsing Summary:');
      this.logger.info(`- Input file type: ${this.inputType.padStart(12)}`);
      this.logger.info(`- Sequence Type: ${this.sequenceType.padStart(14)}`);
      this.logger.info(`- Sequence Count: ${records.length.toLocaleString().padStart(13)}`);
      this.logger.info(`- Feature Count: ${features.length.toLocaleString().padStart(14)}`);
      this.logger.info('- Total Length (bp): ' + `${seqLength.toLocaleString()}`.padStart(10));
      if (this.success) {
        this.logger.info('- Status: ' + 'Success'.padStart(21), {icon: 'success'});
      } else {
        this.logger.error('- Status: ' + 'FAILED'.padStart(21), {icon: 'fail'});
      }
      this.logger.break('--------------------------------------------\n');

      this._summary = {
        inputType: this.inputType,
        sequenceType: this.sequenceType,
        sequenceCount: records.length,
        featureCount: features.length,
        totalLength: seqLength,
        status: this.status,
        success: this.success
      };
    }

    /////////////////////////////////////////////////////////////////////////////
    // INITIAL PARSERS
    /////////////////////////////////////////////////////////////////////////////

    _parse(seqText, options={}) {
      this.logger.info("Parsing sequence file...");
      // Attempt to parse as genbank or embl first
      let records = this._parseGenbankOrEmbl(seqText, options);
      // If that fails, try to parse as fasta or raw
      if ((records.length === 0) ||
          (records[0].name === '' && records[0].length === 0  && records[0].sequence === '')) {
        this.logger.info("- empty results");
        if (/^\s*>/.test(seqText)) {
          this.logger.info("- attempting as FASTA...");
          records = this._parseFasta(seqText, options);
        } else {
          this.logger.info("- attempting as raw...");
          records = this._parseRaw(seqText, options);
        }
      }
      return records;
    }

    _parseGenbankOrEmbl(seqText, options={}) {
      const records = [];
      this.logger.info("- attempting as GenBank or EMBL...");
      this.logger.info("- name keys: " + this.nameKeys.join(', '));
      seqText.split(/^\/\//m).filter(this._isSeqRecord).forEach((seqRecord) => {
        const record = {inputType: 'unknown'};
        if (/^\s*LOCUS|^\s*FEATURES/m.test(seqRecord)) {
          record.inputType = 'genbank';
        } else if (/^\s*ID|^\s*SQ/m.test(seqRecord)) {
          record.inputType = 'embl';
        }
        record.name = this._getSeqName(seqRecord);
        record.seqID = this._getSeqID(seqRecord);
        record.definition = this._getSeqDefinition(seqRecord);
        record.length = this._getSeqLength(seqRecord);
        record.topology = this._getSeqTopology(seqRecord);
        record.comments = this._getSeqComments(seqRecord);
        record.sequence = this._getSequence(seqRecord);
        if (!record.length) {
          record.length = record.sequence.length;
        }
        record.features = this._getFeatures(seqRecord);
        records.push(record);
      });
      return records;
    }

    _parseFasta(seqText, options={}) {
      // console.log("Parsing FASTA...")
      const records = [];
      seqText.split(/^\s*>/m).filter(this._isSeqRecord).forEach((seqRecord) => {
        const record = {inputType: 'fasta', name: '', length: 0, sequence: ''};
        // const match = seqRecord.match(/^\s*([^\n\r]+)(.*)/s);
        const match = seqRecord.match(/^([^\n\r]*)(.*)/s);
        if (match) {
          record.name = match[1].trim();
          record.sequence = removeWhiteSpace(removeDigits(match[2]));
          record.length = record.sequence.length;
          record.features = [];
          // Parse defintion line if name is not empty
          if (record.name !== '') {
            const matchDef = record.name.match(/^(\S+)\s*(.*)/);
            if (matchDef) {
              record.seqID = matchDef[1];
              record.definition = matchDef[2];
            }
          }
        }
        records.push(record);
      });
      return records;
    }

    _parseRaw(seqText, options={}) {
      const record = {inputType: 'raw', name: '', features: []};
      record.sequence = removeWhiteSpace(removeDigits(seqText));
      record.length = record.sequence.length;
      return [record];
    }

    /////////////////////////////////////////////////////////////////////////////
    // SEQUENCE - this could become a class
    /////////////////////////////////////////////////////////////////////////////

    // Return FALSE if sequence record appears to be empty, e.g. just // or blank line
    _isSeqRecord(seqRecord) {
      if (/^\s*\/\/\s*$/.test(seqRecord)) {
        return false;
      } else if (/^\s*$/.test(seqRecord)) {
        return false
      } else {
        return true;
      }
    }

    // Get a sequence name from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999
    // in EMBL look for e.g.:
    // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
    // name is AF177870
    _getSeqName(seqRecordText) {
      const match = seqRecordText.match(/^\s*(?:LOCUS|ID)\s*(\S+)/);
      if (match) {
        let name = match[1];
        // Remove trailing ';' from embl files
        name = name.replace(/;$/, "");
        return name
      } else {
        return "";
      }
    }

    // Get a sequence accessiona and version from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // VERSION     NC_001823.1  GI:11466495
    // in EMBL look for e.g.:
    // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
    _getSeqID(seqRecordText) {
      // GenBank
      let match = seqRecordText.match(/^\s*(?:VERSION)\s*(\S+)/m);
      if (match) {
        let seqID = match[1];
        return seqID;
      }
      // EMBL
      match = seqRecordText.match(/^\s*AC\s*(\S+);/m);
      if (match) {
        let accession = match[1];
        // Look for version
        match = seqRecordText.match(/^\s*ID\s*(\S+);\s*SV\s*(\d+);/);
        let version;
        if (match) {
          version = match[2];
        }
        return version ? `${accession}.${version}` : accession;
      } else {
        // no matches
        return "";
      }
    }


    // Get a sequence definition from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // DEFINITION  Reclinomonas americana mitochondrion, complete genome.
    // in EMBL look for e.g.:
    // DE   Reclinomonas americana mitochondrion, complete genome.
    _getSeqDefinition(seqRecordText) {
      const match = seqRecordText.match(/^\s*(?:DEFINITION|DE)\s+(.+)$/m);
      if (match) {
        let definition = match[1];
        return definition
      } else {
        return "";
      }
    }

    // Get a sequence length from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // LOCUS       AF177870     3123 bp    DNA             INV       31-OCT-1999
    // in EMBL look for e.g.:
    // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
    // length is 3123
    // Returns 0 if it can't be parsed
    _getSeqLength(seqRecordText) {
      const match = seqRecordText.match(/^\s*(?:LOCUS|ID).*?(\d+)\s[Bb][Pp]/);
      if (match) {
        return parseInt(match[1]);
      } else {
        return 0;
      }
    }

    // Get a sequence topology from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // LOCUS       NC_001823              69034 bp    DNA     circular INV 16-AUG-2005
    // in EMBL look for e.g.:
    // ID   AF177870; SV 1; linear; genomic DNA; STD; INV; 3123 BP.
    // ID   NC_001823; SV 1; linear; unassigned DNA; STD; UNC; 69034 BP.
    _getSeqTopology(seqRecordText) {
      const match = seqRecordText.match(/^\s*(?:LOCUS|ID)\s*\S+\s+.*(linear|circular)/);
      if (match) {
        return this.topology = match[1];
      } else {
        return "unknown";
      }
    }

    // Get a sequence comments from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // COMMENT   REVIEWED REFSEQ: This record has been curated by NCBI staff. The
    //           reference sequence was derived from AF007261.
    // in EMBL look for e.g.:
    // CC   REVIEWED REFSEQ: This record has been curated by NCBI staff. The
    // CC   reference sequence was derived from AF007261.
    _getSeqComments(seqRecordText) {
      // Genbank
      let match = seqRecordText.match(/^\s*COMMENT\s+(.*)\nFEATURES/ms);
      let comments = '';
      if (match) {
        comments = match[1];
        comments = comments.replace(/^\s*/mg, "");
      } else {
        // EMBL
        match = seqRecordText.match(/^\s*CC\s+(.*)\nXX/ms);
        if (match) {
          comments = match[1];
          comments = comments.replace(/^\s*CC\s*/mg, "");
        }
      }
      return comments
    }


    // Get the full sequence from a GenBank or EMBL record
    // in GenBank look for e.g.:
    // ORIGIN
    //        1 ttttgccctc agtccgtgac ggcgcaggct ttccgtcacg gtttttactt taaaatggta
    // in EMBL look for e.g.:
    // SQ   Sequence 3123 BP; 986 A; 605 C; 597 G; 935 T; 0 other;
    //     gaacgcgaat gcctctctct ctttcgatgg gtatgccaat tgtccacatt cactcgtgtt        60
    //
    // NOTE: the original regex had a 's' for dotall but it was cuasing an issue when integrating into proksee.
    //       Oddly the issue did not occur in Chrome. It was only Safari.
    //       The regex also didn't actually require the 's', so I removed it.
    _getSequence(seqRecordText) {
      const match = seqRecordText.match(/^(?:ORIGIN|SQ\s{3}).*?$([^\/]*)(^\s*$|^\s*LOCUS)?/m);
      if (match) {
        return removeDigits(removeWhiteSpace(match[1]));
      } else {
        return "" 
      }
    }


    /////////////////////////////////////////////////////////////////////////////
    // FEATURES - this could become a class
    /////////////////////////////////////////////////////////////////////////////

    // Get an array of objects containing feature information from a GenBank or EMBL record
    // in GenBank look for:
    // FEATURES             Location/Qualifiers
    // in EMBL look for:
    // FH   Key             Location/Qualifiers
    // FH
    _getFeatures(seqRecordText) {
      const features = [];
      const match = seqRecordText.match(/^(?:FEATURES.*?$|FH.*?^FH.*?$)(.*)^(?:ORIGIN|SQ\s{3}).*?$/ms);
      if (match) {
        // this.logger.info("- parsing features...")
        let featureAllText = match[1];
        // Replace FT from the start of EMBL lines with 2 spaces
        featureAllText = featureAllText.replaceAll(/^FT/mg, "  ");
        featureAllText.split(/(?=^\s{5}\S+)/m).filter(this._isFeatureRecord).forEach((featureText) => {
          const feature = {};
          feature.type = this._getFeatureType(featureText);
          feature.strand = this._getFeatureStrand(featureText);
          feature.locationText = this._getFeatureLocationText(featureText);
          feature.locations = this._getFeatureLocations(feature.locationText);
          feature.start = feature.locations.map((location) => location[0]).sort((a, b) => a - b)[0];
          feature.stop = feature.locations.map((location) => location[1]).sort((a, b) => b - a)[0];
          feature.qualifiers = this._getFeatureQualifiers(featureText);
          feature.name = this._getFeatureName(feature.qualifiers);
          if (feature.type) {
            features.push(feature);
          }
        });
      }
      return features
    }

    // Return FALSE if feature appears to be empty, e.g. just / or blank line
    _isFeatureRecord(featureText) {
      if (/^\s*\/\s*$/.test(featureText)) {
        return false;
      } else if (/^\s*$/.test(featureText)) {
        return false
      } else {
        return true;
      }
    }

    // Get type of a feature from a feature string
    // e.g.
    //      gene            complement(<1..>172)
    //                      /locus_tag="ECPA2_RS30085"
    //                      /old_locus_tag="ECPA2_5227"
    //                      /pseudo
    _getFeatureType(featureText) {
      const match = featureText.match(/^\s{5}(\S+)/);
      if (match) {
        return match[1];
      } else {
        // TODO: Probably log this
        return null;
      }
    }

    // Get strand of a feature (1 or -1) from a feature string # e.g.
    //      gene            complement(<1..>172)
    //                      /locus_tag="ECPA2_RS30085"
    //                      /old_locus_tag="ECPA2_5227"
    //                      /pseudo
    // FIXME: What about joins?
    _getFeatureStrand(featureText) {
      const match = featureText.match(/^\s{5}\S+\s+complement/);
      return match ? -1 : 1;
    }

    // Get location text of a feature (1 or -1) from a feature string
    // e.g.
    //      gene            complement(<1..>172)
    //                      /locus_tag="ECPA2_RS30085"
    //                      /old_locus_tag="ECPA2_5227"
    //                      /pseudo
    _getFeatureLocationText(featureText) {
      const match = featureText.match(/^\s{5}\S+\s+([^\/]+)/s);
      if (match) {
        return removeWhiteSpace(match[1]);
      } else {
        return "";
      }
    }

    // Return an array of locations from a location string
    // FIXME: What about > and <?
    _getFeatureLocations(locationText) {
      const locations = [];
      const ranges = locationText.split(/(?=,)/).filter(this._isParsableFeatureRange);
      for (const range of ranges) {
        let match = range.match(/(\d+)\D*\.\.\D*(\d+)/);
        if (match) {
          const start = parseInt(match[1]);
          const end = parseInt(match[2]);
          locations.push([start, end]);
        } else {
          match = range.match(/(\d+)/);
          if (match) {
            const start = parseInt(match[1]);
            const end = start;
            locations.push([start, end]);
          }
        }
      }
      return locations;
    }

    // Return FALSE if feature range is of a type that cannot be converted to a start and end
    // examples of ranges that cannot be converted to start and end:
    // 102.110
    // 123^124
    // J00194.1:100..202
    // join(1..100,J00194.1:100..202)
    _isParsableFeatureRange(range) {
      if (/\d\.\d/.test(range)) {
        return false;
      } else if (/\^/.test(range)) {
        return false;
      } else if (/:/.test(range)) {
        return false;
      } else if (/^\s*$/.test(range)) {
        return false;
      } else {
        return true;
      }
    }

    // Return FALSE if feature qualifier appears to be empty, e.g. just / or blank line
    _isFeatureQualifier(qualifierText) {
      if (/^\s*\/\s*$/.test(qualifierText)) {
        return false;
      } else if (/^\s*$/.test(qualifierText)) {
        return false
      } else {
        return true;
      }
    }

    // Format feature qualifier value by removing newlines if there are no spaces within the value
    // otherwise replace newlines with spaces
    _formatFeatureQualifier(qualifierText) {
      if (/\S\s\S/.test(qualifierText)) {
        return qualifierText.replace(/[\s]+/g, " ");
      } else {
        return qualifierText.replace(/[\s]+/g, "");
      }
    }

    // Get an array of objects containing feature qualifier names and values from a feature string
    // NOTE: qualifiers without values will be set to true
    // NOTE: qualifiers values can be a single value or an array of values
    // e.g.
    //      gene            complement(<1..>172)
    //                      /locus_tag="ECPA2_RS30085"
    //                      /old_locus_tag="ECPA2_5227"
    //                      /pseudo
    _getFeatureQualifiers(featureText) {
      const qualifiers = {};
      let match = featureText.match(/(\/.*)/s);
      if (match) {
        const allQualifierText = match[1];
        allQualifierText.split(/(?=^\s*\/)/m).filter(this._isFeatureQualifier).forEach((qualifierText) => {
          let name;
          let value;
          match = qualifierText.match(/\/([^\"\s]+)\s*=\s*\"?([^\"]*)\"?(?=^\s*\/|$)/ms);
          if (match) {
            name = match[1];
            value = this._formatFeatureQualifier(match[2]);
          } else {
            // not a key-value pair
            name = removeWhiteSpace(qualifierText).replace(/^\//, "");
            value = true;
          }
          if (qualifiers[name]) {
            // qualifiers[name].push(value);
            if (qualifiers[name] instanceof Array) {
              qualifiers[name].push(value);
            } else {
              qualifiers[name] = [qualifiers[name], value];
            }
          } else if (value === true) {
            qualifiers[name] = true;
          } else {
            // qualifiers[name] = [value];
            qualifiers[name] = value;
          }
        });
      }
      return qualifiers;
    }

    // Return the value for a qualifer name/key from a qualifiers object
    // If multiple values, return the first value
    // Returns undefined if the qualifier does not exist
    _getFirstQualifierValueForName(name, qualifiers) {
      const value = qualifiers[name];
      if (value instanceof Array) {
        return value[0];
      } else if (value !== undefined) {
        return value
      }
    }

    _getFeatureName(qualifiers) {
      // This is the order of preference for the name of a feature
      // This could become a user-defined list (think tags that the user can rearrange or add/remove)
      // const keys = ['gene', 'locus_tag', 'product', 'note', 'db_xref'];
      const keys = this.nameKeys;
      const foundKey = keys.find((key) => this._getFirstQualifierValueForName(key, qualifiers));
      return foundKey ? this._getFirstQualifierValueForName(foundKey, qualifiers) : "";
    }

    // Optional
    _addFeatureSequence(seqRecords) {
      for (const seqRecord of seqRecords) {
        for (const feature of seqRecord.features) {
          const dna = [];
          for (const location of feature.locations) {
            const start = location[0];
            const end = location[1];
            dna.push(seqRecord.sequence.slice(start-1, end));
            // ERROR CHECK
          }
          if (feature.strand === -1) {
            feature.sequence = reverse(complement(dna.join("")));
          } else {
            feature.sequence = dna.join("");
          }
        }
      }
    }


    // Try to determine whether the sequence in each record is DNA or protein
    // and whether there are unexpected characters in sequence
    _determineSequenceTypes(seqRecords) {
      for (const seqRecord of seqRecords) {
        const sequence = seqRecord.sequence;
        seqRecord.type = determineSeqMolType(sequence);
        const nonIUPAC = findNonIUPACCharacters(sequence, seqRecord.type);
        if (nonIUPAC) {
          seqRecord.hasUnexpectedCharacters = nonIUPAC;
        }
      }
    }

    _determineOverallInputAndSequenceType(records) {
      const inputTypes = records.map((record) => record.inputType);
      const uniqueInputTypes = [...new Set(inputTypes)];
      this._inputType = (uniqueInputTypes.length > 1) ? 'multiple' : uniqueInputTypes[0];

      const seqTypes = records.map((record) => record.type);
      const uniqueSeqTypes = [...new Set(seqTypes)];
      this._sequenceType = (uniqueSeqTypes.length > 1) ? 'multiple' : uniqueSeqTypes[0];
    }

    _fail(message, errorCode='unknown') {
      this.logger.error(message);
      // this._success = false;
      this._status = 'failed';
      this._errorCodes.add(errorCode);
    }

    // Simple way to pluralize a phrase
    // e.g. _pluralizeHasHave(1) => 's has'
    // _pluralizeHasHave(count, singular, plural) {
    //   return count === 1 ? singular : plural;
    // }

    _validateRecords(records) {
      this.logger.info('Validating...');

      // Input Type
      if (this.inputType === 'multiple') {
        const inputTypes = records.map((record) => record.inputType);
        const uniqueInputTypes = [...new Set(inputTypes)];
        this._fail(`Input file contains multiple input types: ${uniqueInputTypes.join(', ')}`);
      }
      // Sequence Type
      if (this.sequenceType === 'multiple') {
        const seqTypes = records.map((record) => record.type);
        const uniqueSeqTypes = [...new Set(seqTypes)];
        this._fail(`Input file contains multiple sequence types: ${uniqueSeqTypes.join(', ')}`);
      }
      if (this.sequenceType === 'unknown') {
        this._fail(`Input file contains an unknown sequence type (i.e. not dna or protein).`);
      }
      // Sequence length is 0
      const recordsZeroLength = records.filter((record) => record.length === 0);
      if (recordsZeroLength.length > 0) {
        const count = recordsZeroLength.length.toLocaleString();
        this._fail(`The following sequences (${count}) have zero length:`);
        this._fail(`- ${recordsZeroLength.map((record) => record.name).join(', ')}`);
      }
      // Sequence lengths do not match length in sequence
      const recordsDiffLengths = records.filter((record) => record.length !== record.sequence.length);
      if (recordsDiffLengths.length > 0) {
        const count = recordsDiffLengths.length.toLocaleString();
        this._fail(`The following sequences (${count}) have mismatched lengths (length attribute vs sequence length):`);
        // for (const record of recordsDiffLengths) {
        //   this.logger.error(`- ${record.name}: ${record.length.toLocaleString()} bp vs ${record.sequence.length.toLocaleString()} bp`);
        // }
        const messages = recordsDiffLengths.map((r) => `- ${r.name}: ${r.length.toLocaleString()} bp vs ${r.sequence.length.toLocaleString()} bp`);
        this.logger.error(messages);
      }
      // Sequence contains unexpected characters
      const recordsUnexpectedChars = records.filter((record) => record.hasUnexpectedCharacters);
      if (recordsUnexpectedChars.length > 0) {
        const count = recordsUnexpectedChars.length.toLocaleString();
        this._fail(`The following sequences (${count}) contain unexpected characters:`);
        // for (const record of recordsUnexpectedChars) {
        //   this.logger.error(`- ${record.name}: ${record.hasUnexpectedCharacters}`);
        // }
        const messages = recordsUnexpectedChars.map((r) => `- ${r.name}: ${r.hasUnexpectedCharacters}`);
        this.logger.error(messages);
      }

      // Feature locations are empty


      // Features start or end/stop is greater than sequence length
      // Features end is less than start
      // - NOTE: we may want to allow features that wrap around the sequence
      const featureStartEndErrors = [];
      const featureStartGreaterThanEnd = [];
      for (const record of records) {
        for (const feature of record.features) {
          if (feature.start > record.length || feature.stop > record.length) {
            // featureStartEndErrors.push(`${record.name} [${record.length.toLocaleString()} bp]: ${feature.name} ${feature.start}..${feature.stop}`);
            featureStartEndErrors.push(`- ${record.name} [${record.length.toLocaleString()} bp]: '${feature.name}' [${feature.start}..${feature.stop}]`);
          }
          if (feature.start > feature.stop) {
            featureStartGreaterThanEnd.push(`- ${record.name}: '${feature.name}' [${feature.start}..${feature.stop}]`);
          }
        }
      }
      if (featureStartEndErrors.length > 0) {
        const count = featureStartEndErrors.length.toLocaleString();
        this._fail(`The following features (${count}) have start or end greater than the sequence length:`);
        this.logger.error(featureStartEndErrors);
        // featureStartEndErrors.forEach((error) => this.logger.error(`- ${error}`));
      }
      if (featureStartGreaterThanEnd.length > 0) {
        const count = featureStartGreaterThanEnd.length.toLocaleString();
        this._fail(`The following features (${count}) have a start greater than the end:`);
        this.logger.error(featureStartGreaterThanEnd);
        // featureStartGreaterThanEnd.forEach((error) => this.logger.error(`- ${error}`));
      }

      if (this.success) {
        this.logger.info('- validations passed', {icon: 'success'});
      } else {
        this.logger.error('- validations failed', {icon: 'fail'});
      }
    }

  }

  var SequenceFile$1 = SequenceFile;

  // import FeatureFile from "./FeatureFile.js";

  const CGParse = {};
  CGParse.Logger = Logger;
  CGParse.SequenceFile = SequenceFile$1;
  CGParse.CGViewBuilder = CGViewBuilder;

  // Teselagen (For development only; Useful for comparison):
  // This should be removed for production
  // import { genbankToJson as genbankToTeselagen} from "@teselagen/bio-parsers";
  // CGViewParse.genbankToTeselagen = genbankToTeselagen;
  // import { anyToJson as anyToTeselagen} from "@teselagen/bio-parsers";
  // CGVParse.anyToTeselagen = anyToTeselagen;

  return CGParse;

})();
