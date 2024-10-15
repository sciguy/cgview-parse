// OPTIONS:
// - logToConsole [Default: true]: log to console
// - showTimestamps [Default: true]: Add time stamps
// - showIcons: Add level as icon: warn, info, etc
// - maxLogCount: Maximum number of similar log messages to keep
// - lineLength: Number of characters to pad each line [Default: 48]
//   - lines are not wrapped
//   - this is for dividers and padded text
// NOTE:
// - logToConsole and showTimestamps can be overridden in each log call
//   as well as the history
// TODO:
// - add groups to group logs together for formatting and filtering
// Logging levels: log, info, warn, error
// Log messages can be a simgle message or an array of messages
// - When an array of messages is provided, if the count is more than maxLogCount
//   then only the first maxLogCount messages are shown.
class Logger {

  constructor(options={}) {
    this.options = options;
    this.logToConsole = (options.logToConsole === undefined) ? true : options.logToConsole;
    this.showTimestamps = (options.showTimestamps === undefined) ? true : options.showTimestamps;
    this.showIcons = (options.showIcons === undefined) ? false : options.showIcons;
    this.maxLogCount = (options.maxLogCount === undefined) ? false : options.maxLogCount;
    this.lineLength = options.lineLength || 48;
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

  // Add a diver to the logs (e.g. a line of dashes)
  // divider: the character to use for the divider
  divider(divider="-") {
    const line = divider.repeat(this.lineLength) + '\n';
    const logItem = { type: 'break', break: line };
    this.logs.push(logItem);
  }

  // Add a break to the logs (e.g. a a return or a line of text)
  break(divider="\n") {
    const logItem = { type: 'break', break: divider };
    this.logs.push(logItem);
  }

  title(title, paddingChar = '-') {
    const length = this.lineLength;
    let text = title + '\n';
    if (title.length < length) {
      const totalPadding = length - title.length;
      const paddingLeft = Math.floor(totalPadding / 2);
      const paddingRight = totalPadding - paddingLeft;
      text = paddingChar.repeat(paddingLeft) + title + paddingChar.repeat(paddingRight) + "\n";
    }
    this.break(text);
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

  // - messages: a single message or an array of messages
  // - level: warn, error, info, log
  // - options:
  //   - logToConsole, showTimestamps, showIcons, maxLogCount, lineLength: override default options (see constructor)
  //   - padded: text or number that should be padded to the right of each line (based on lineLength)
  _log(messages, level, options={}) {
    const timestamp = this._formatTime(new Date());
    messages = (Array.isArray(messages)) ? messages : [messages];
    const maxLogCount = this._optionFor('maxLogCount', options);
    let messageLimitReached;
    for (const [index, message] of messages.entries()) {
      if (maxLogCount && index >= maxLogCount && index !== messages.length - 1) {
        const listPadding = messages[0].match(/^\s*/)[0];
        messageLimitReached = `${listPadding}- Only showing first ${maxLogCount}: ${messages.length - maxLogCount} more not shown (${messages.length.toLocaleString()} total)`;
      }
      const logItem = { type: 'message', message: (messageLimitReached || message), level, timestamp, icon: options.icon, padded: options.padded };
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
    const showTimestamps = this._optionFor('showTimestamps', options);
    // Icons
    const showIcons = this._optionFor('showIcons', options);
    if (showIcons) {
      const icon = logItem.icon || logItem.level;
      message += this._icon(icon) + (showTimestamps ? '' : ' ');
    }
    // Timestamp
    if (showTimestamps) {
      message += `[${logItem.timestamp}] `;
    }
    // Message
    message += logItem.message;
    // Padded Text
    if (logItem.padded !== undefined) {
      const lineLength = this._optionFor('lineLength', options);
      let padding = lineLength - message.length;
      // Weirdness with emoji lengths. Adjust as needed.
      if (showIcons && logItem.icon == 'success') {
        padding = padding - 1;
      }
      const paddedText = `${logItem.padded.toLocaleString().padStart(padding)}`;
      message += paddedText;
    }

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

var version = "1.0.3";

// ----------------------------------------------------------------------------
// CGPARSE HELPERS
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

const CGPARSE_VERSION = version;

// All GenBank/EMBL Feature Types
const FEATURE_TYPES = ["assembly_gap", "C_region", "CDS", "centromere", "D-loop", "D_segment", "exon", "gap", "gene", "iDNA", "intron", "J_segment", "mat_peptide", "misc_binding", "misc_difference", "misc_feature", "misc_recomb", "misc_RNA", "misc_structure", "mobile_element", "modified_base", "mRNA", "ncRNA", "N_region", "old_sequence", "operon", "oriT", "polyA_site", "precursor_RNA", "prim_transcript", "primer_bind", "propeptide", "protein_bind", "regulatory", "repeat_region", "rep_origin", "rRNA", "S_region", "sig_peptide", "source", "stem_loop", "STS", "telomere", "tmRNA", "transit_peptide", "tRNA", "unsure", "V_region", "V_segment", "variation", "3'UTR", "5'UTR"];

// All GenBank/EMBL Qualifiers
const QUALIFIERS = [ "allele", "altitude", "anticodon", "artificial_location", "bio_material", "bound_moiety", "cell_line", "cell_type", "chromosome", "circular_RNA", "citation", "clone", "clone_lib", "codon_start", "collected_by", "collection_date", "compare", "country", "cultivar", "culture_collection", "db_xref", "dev_stage", "direction", "EC_number", "ecotype", "environmental_sample", "estimated_length", "exception", "experiment", "focus", "frequency", "function", "gap_type", "gene", "gene_synonym", "germline", "haplogroup", "haplotype", "host", "identified_by", "inference", "isolate", "isolation_source", "lab_host", "lat_lon", "linkage_evidence", "locus_tag", "macronuclear", "map", "mating_type", "metagenome_source", "mobile_element_type", "mod_base", "mol_type", "ncRNA_class", "note", "number", "old_locus_tag", "operon", "organelle", "organism", "partial", "PCR_conditions", "PCR_primers", "phenotype", "plasmid", "pop_variant", "product", "protein_id", "proviral", "pseudo", "pseudogene", "rearranged", "ination_class", "tory_class", "replace", "ribosomal_slippage", "rpt_family", "rpt_type", "rpt_unit_range", "rpt_unit_seq", "satellite", "segment", "serotype", "serovar", "sex", "specimen_voucher", "standard_name", "strain", "sub_clone", "submitter_seqid", "sub_species", "sub_strain", "tag_peptide", "tissue_lib", "tissue_type", "transgenic", "translation", "transl_except", "transl_table", "trans_splicing", "type_material", "variety"];

// Sequence Ontology Terms (add more as needed)
const SO_TERMS = {
  "SO:0000704": "gene",
  "SO:0000234": "mRNA",
  "SO:0000147": "exon",
  "SO:0000316": "CDS",
  "SO:0000188": "intron",
  "SO:0000610": "polyA_sequence",
  "SO:0000553": "polyA_site",
  "SO:0000204": "five_prime_UTR",
  "SO:0000205": "three_prime_UTR",
};

// ----------------------------------------------------------------------------
// FORMATTING
// ----------------------------------------------------------------------------

function removeWhiteSpace(string) {
  return string.replace(/\s+/g, "");
}

function removeDigits(string) {
  return string.replace(/\d+/g, "");
}

function removeNewlines(string) {
  return string.replace(/[\n\r]+/g, "");
}

function convertLineEndingsToLF(text) {
  // Replace CRLF and CR with LF
  return text.replace(/\r\n?/g, '\n');
}

// Simple way to pluralize a phrase
// e.g. _pluralizeHasHave(1) => 's has'
// _pluralizeHasHave(count, singular, plural) {
//   return count === 1 ? singular : plural;
// }


// ----------------------------------------------------------------------------
// OTHERS
// ----------------------------------------------------------------------------

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
// ChatGPT special
// Uses Heuristic to determine binary vs text
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

    // console.log("IS BINARY: ", printableRatio, controlRatio)
    if (printableRatio < 0.8 || controlRatio > 0.1) {
      isBinary = true;
    }
  }
  return isBinary;
}

// Give text, return an array of lines
// - comments lines starting with # are removed
// - empty lines are removed
// - options:
//   - maxLines: the number of lines returned (default is all lines)
function getLines(text, options={}) {
  const lines = text.split(/\r\n|\r|\n/);
  // Filter out comments and empty lines
  const filteredLines = lines.filter(line => !line.startsWith('#') && line.trim() !== '');
  // return the first maxLines or all lines
  return options.maxLines ? filteredLines.slice(0, options.maxLines) : filteredLines;
}

// Invert an object so the keys are values and the values are keys
// - lowercaseKeys: if true, the keys will be lowercased
// - Note: this assumes the values are unique
function invertObject(obj, lowercaseKeys=false) {
  const inverted = {};
  for (const key of Object.keys(obj)) {
    let origValue = obj[key];
    if (lowercaseKeys && typeof origValue === 'string') {
      origValue = origValue.toLowerCase();
    }
    inverted[origValue] = key;
  }
  return inverted;
}

// ----------------------------------------------------------------------------
// SEQUENCE METHODS
// ----------------------------------------------------------------------------

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

  // Given a sequence, return an array of unique characters that are not IUPAC characters
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
// ----------------------------------------------------------------------------
// OLD METHODS (FOR REFERENECE)
// ----------------------------------------------------------------------------
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
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

var helpers = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CGPARSE_VERSION: CGPARSE_VERSION,
  FEATURE_TYPES: FEATURE_TYPES,
  QUALIFIERS: QUALIFIERS,
  SO_TERMS: SO_TERMS,
  complement: complement,
  convertLineEndingsToLF: convertLineEndingsToLF,
  countCharactersInSequence: countCharactersInSequence,
  determineSeqMolType: determineSeqMolType,
  findNonIUPACCharacters: findNonIUPACCharacters,
  getLines: getLines,
  invertObject: invertObject,
  isBinary: isBinary,
  removeDigits: removeDigits,
  removeNewlines: removeNewlines,
  removeWhiteSpace: removeWhiteSpace,
  reverse: reverse,
  uniqueId: uniqueId,
  uniqueName: uniqueName
});

/**
   * Base class for FeatureFile, SequenceFile, FeatureBuilder, CGViewBuilder
   * - Provides logging and status tracking
   * 
   * The status can be one of:
   * - 'success':  parsing/building was successful
   * - 'warnings': parsing/building was successful with warnings (can still proceed)
   * - 'failed':   parsing/building failed (cannot proceed)
   *
   * Using the methods _fail() and _warn() will set the status accordingly
   * - Once the status is set to 'failed', it cannot be changed
   *
   * Error codes can be provided to keep track of the type of errors
   * - Error codes can be provided as options to _fail() and _warn()
   * - They can also be added with the addErrorCode() method
   * - The errorCodes property returns an array of unique error codes
   * - To check if a specific error code is present, use the hasErrorCode(ERROR_CODE) method
   * - allowed error codes are set with the static property ERROR_CODES and are all lowercase
   *
   * @param {Object} Options - passed to logger
   *   - logger: logger object
   *   - maxLogCount: number (undefined means no limit) [Default: undefined]
   */
class Status {

  // constructor(options = {}, logTitle) {
  constructor(options = {}) {

    this._options = options;

    // Logger
    this.logger = options.logger || new Logger();
    options.logger = this.logger;
    if (options.maxLogCount) {
      this.logger.maxLogCount = options.maxLogCount;
    }
    // this.logger.divider();
    // if (logTitle) {
    //   this.logger.title(` ${logTitle} `);
    // } else {
    //   this.logger.divider();
    // }
    // this._info(`Date: ${new Date().toUTCString()}`);
    // this.logVersion();

    // Initialize status
    this._status = 'success';
    this._errorCodes = new Set();
  }

  static get ERROR_CODES() {
    return ['unknown', 'binary', 'empty', 'unknown_format', 'parsing', 'validating'];
  }

  /////////////////////////////////////////////////////////////////////////////
  // Properties
  /////////////////////////////////////////////////////////////////////////////

  get options() {
    return this._options;
  }

  get version() {
    return CGPARSE_VERSION;
  }

  // Parsing status
  // Should be one of: 'success', 'warnings', 'failed'
  get status() {
    return this._status;
  }

  // Parsing is successful (No errors or warnings)
  // This can be confusing because it doesn't includes warnings use passed instead
  // get success() {
  //   return this.status === 'success';
  // }

  // Parsing has passed with success or warnings
  get passed() {
    return this.status === 'success' || this.status === 'warnings';
  }

  // Returns an array of unique error codes
  // See Status.ERROR_CODES for allowed error codes
  get errorCodes() {
    return Array.from(this._errorCodes);
  }


  /////////////////////////////////////////////////////////////////////////////
  // Methods
  /////////////////////////////////////////////////////////////////////////////

  // See Status.ERROR_CODES for allowed error codes
  addErrorCode(errorCode) {
    if (!Status.ERROR_CODES.includes(errorCode)) {
      this._fail(`Invalid error code: ${errorCode}`);
      return;
    }
    this._errorCodes.add(errorCode);
  }

  hasErrorCode(errorCode) {
    return this._errorCodes.has(errorCode);
  }

  // Alias for logger.info()
  _info(message, options={}) {
    this.logger.info(message, options);
  }

  // Parsing has failed
  // Optional error code can be provided to help identify the error
  // _fail(message, errorCode='unknown') {
  _fail(message, options={}) {
    this.logger.error(message, options);
    this._status = 'failed';
    // TODO: consider keeping error codes in Logger
    const errorCode = options.errorCode || 'unknown';
    this.addErrorCode(errorCode);
  }

  _warn(message, options={}) {
    this.logger.warn(message, options);
    if (this.status !== 'failed') {
      this._status = 'warnings';
    }
  }

  // Header with option title following by the date and time
  logHeader(title) {
    if (title) {
      this.logger.title(` ${title} `);
    } else {
      this.logger.divider();
    }
    this._info(`Date: ${new Date().toUTCString()}`);
  }

  logStatusLine() {
    if (this.status === 'success') {
      this.logger.info('- Status: ', { padded: 'Success', icon: 'success' });
    } else if (this.status === 'warnings') {
      this.logger.warn('- Status: ', { padded: 'Warnings', icon: 'warn' });
    } else {
      this.logger.error('- Status: ', { padded: 'FAILED', icon: 'fail' });
    }
  }

  // logVersion() {
  //   this.logger.info(`- Version: ${this.version}`);
  // }

}

// INPUT:
// - SequenceFile or string of sequence file (e.g. GenBank, FASTA) that can be converted to SequenceFile
// OPTIONS:
// - config: jsonConfig
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
// - includeCaption: boolean [Default: true]
//   - NOTE: captions could come from the config (like I did for cgview_builder.rb)
// - maxLogCount: number (undefined means no limit) [Default: undefined]
class CGViewBuilder extends Status {

  constructor(input, options = {}) {
    // super(options, 'BUILDING CGVIEW JSON');
    super(options);
    // this.input = input;
    this.cgvJSONVersion = "1.7.0";
    // this.options = options;

    // this.includeFeatures = options.includeFeatures || true;
    this.includeFeatures = (options.includeFeatures === undefined) ? true : options.includeFeatures;
    this.excludeFeatures = options.excludeFeatures || ['gene', 'source', 'exon'];
    this.includeQualifiers = options.includeQualifiers || false;
    this.excludeQualifiers = options.excludeQualifiers || [];
    this.includeCaption = (options.includeCaption === undefined) ? true : options.includeCaption;

    this.seqFile = this._parseInput(input);
    this.inputType = this.seqFile.inputType;
    this.sequenceType = this.seqFile.sequenceType;
    if (this.seqFile.passed === true) {
      try {
        this.logHeader('BUILDING CGVIEW JSON');
        this._json = this._build(this.seqFile.records);
      } catch (error) {
        this._fail('- Failed: An error occurred while building the JSON.', {errorCode: 'parsing'});
        this._fail(`- ERROR: ${error.message}`);
      }
    } else {
      this._fail('*** Cannot convert to CGView JSON because parsing sequence file failed ***');
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

  _build(seqRecords) {
    // this.logger.info(`Converting ${seqRecord.length} sequence record(s) to CGView JSON (version ${this.cgvJSONVersion})`);
    this._skippedFeaturesByType = {};
    this._skippedComplexFeatures = []; // not skipped anymore
    this._complexFeatures = [];
    this._skippedLocationlessFeatures = [];
    // this.logger.info(`Date: ${new Date().toUTCString()}`);
    this.logger.info('CGParse: ', { padded: this.version });
    this.logger.info(`Converting to CGView JSON...`);
    this.logger.info('- CGView JSON version: ', { padded: this.cgvJSONVersion });
    this.logger.info('- Input Sequence Count: ', { padded: seqRecords.length });
    this.logger.info('- Input File Type: ', { padded: this.inputType || 'Unknown' });
    this.logger.info('- Input Sequence Type: ', { padded: this.sequenceType || 'Unknown' });
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
    json.version = this.cgvJSONVersion;
    this._adjustContigNames(seqRecords);
    json.captions = this._getCaptions(json, seqRecords);
    json.settings.format = CGViewBuilder.determineFormat(seqRecords);
    json = this._extractSequenceAndFeatures(json, seqRecords);
    this._summarizeSkippedFeatures();
    this._adjustFeatureGeneticCode(json);
    this._qualifiersSetup();
    if (this._complexFeatures.length > 0) {
      this.logger.info('- Complex Features Found: ', { padded: this._complexFeatures.length });
    }
    // json.name = json.sequence?.contigs[0]?.name || "Untitled";
    json.name = seqRecords[0]?.definition || seqRecords[0]?.name || seqRecords[0]?.seqID || "Untitled";
    json = this._removeUnusedLegends(json);
    // Add track for features (if there are any)
    json.tracks = this._buildTracks(json, this.inputType);
    this._buildSummary(json);
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

  _buildSummary(json) {
    const contigs = json.sequence?.contigs || [];
    const contigCount = contigs.length || 0;
    const featureCount = json.features?.length || 0;
    const trackCount = json.tracks?.length || 0;
    const legendCount = json.legend?.items?.length || 0;
    const seqLength = contigs.map((contig) => contig.length).reduce((a, b) => a + b, 0);
    let skippedFeatures = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
    skippedFeatures += this._skippedComplexFeatures.length;
    skippedFeatures += this._skippedLocationlessFeatures.length;
    // this.logger.break('--------------------------------------------\n')
    this.logger.divider();
    this.logger.info('CGView JSON Summary:');
    this.logger.info('- Map Name: ', { padded: json.name });
    this.logger.info('- Contig Count: ', { padded: contigCount });
    this.logger.info('- Total Length (bp): ', { padded: seqLength.toLocaleString() });
    this.logger.info('- Track Count: ', { padded: trackCount });
    this.logger.info('- Legend Count: ', { padded: legendCount });
    this.logger.info('- Features Included: ', { padded: featureCount });
    this.logger.info('- Features Skipped: ', { padded: skippedFeatures });
    this.logStatusLine();
    this.logger.divider();
  }

  _summarizeSkippedFeatures() {
    // Skipped Types
    const skippedFeatures = this._skippedFeaturesByType;
    const skippedFeatureCount = Object.values(this._skippedFeaturesByType).reduce((a, b) => a + b, 0);
    if (Object.keys(skippedFeatures).length > 0) {
      this.logger.info(`- Skipped features (${skippedFeatureCount}) by type:`);
      for (const [key, value] of Object.entries(skippedFeatures)) {
        this.logger.info(`  - ${key}: `, { padded: value });
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
    // const names = seqRecords.map((seqRecord) => seqRecord.name);
    const names = seqRecords.map((seqRecord) => seqRecord.seqID || seqRecord.name);
    const adjustedNameResults = CGViewBuilder.adjustContigNames(names);
    console.log("AdjustedNameResults", adjustedNameResults);
    const adjustedNames = adjustedNameResults.names;
    const reasons = adjustedNameResults.reasons;
    this.logger.info('- Checking contig names...');
    const changedNameIndexes = Object.keys(reasons);

    // Change SeqRecord names
    // We do this even if there are no reasons
    // because this will set names to seqID instead of name (if seqID exists)
    seqRecords.forEach((seqRecord, i) => {
      seqRecord.name = adjustedNames[i];
    });

    if (changedNameIndexes.length > 0) {
      // Change SeqRecord names
      // seqRecords.forEach((seqRecord, i) => {
      //   seqRecord.name = adjustedNames[i];
      // });
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
  // We will only keep the genetic code for a feature if is different from the common case.
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
    // - I've removed * and - from the list as they may cause issues too ("-" failed for Crispr)
    // let replacedNames = names.map((name) => name.replace(/[^a-zA-Z0-9\*\_\-]+/g, '_'));
    let replacedNames = names.map((name) => name.replace(/[^a-zA-Z0-9\_]+/g, '_'));
    names.forEach((name, i) => {
      console.log(name, replacedNames[i]);
      if (name !== replacedNames[i]) {
        reasons[i] = {index: i, origName: name, newName: replacedNames[i], reason: ["REPLACE"]};
      }
    });
    // Blank names
    // NOTE: Blank names should not have been changed by above (they would have been replaced with '_')
    // - So we don't need to push to reasons, we can just set the reason here
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
    this._featureTypesSetup();
    seqJson.forEach((seqRecord) => {
      contigs.push({name: seqRecord.name, length: seqRecord.sequence.length, seq: seqRecord.sequence});
      const contigFeatures = this._extractFeatures(seqRecord, seqRecord.name, seqRecord.inputType);
      features.push(...contigFeatures);
    });
    json.sequence = {contigs};
    json.features = features;
    return json;
  }

  _featureTypesSetup() {
    const inExclude = this._setupInExcludeItems('Feature types', this.includeFeatures, this.excludeFeatures);
    this.featuresToInclude = inExclude.itemsToInclude;
    this.featuresToExclude = inExclude.itemsToExclude;
  }

  _qualifiersSetup() {
    const inExclude = this._setupInExcludeItems('Qualifier', this.includeQualifiers, this.excludeQualifiers);
    this.includeQualifiers = inExclude.itemsToInclude;
    this.excludeQualifiers = inExclude.itemsToExclude;
  }

  // name: string to dislplay in log messages
  // includeItems: true, false, or array of strings
  // excludeItems: array of strings
  _setupInExcludeItems(name, includeItems, excludeItems) {
    let itemsToInclude = [];
    let itemsToExclude = [];
    let logData = {inexclude: 'EMPTY', items: 'EMPTY'};
    if (includeItems === true) {
      itemsToInclude = true;
      if (Array.isArray(excludeItems)) {
        itemsToExclude = excludeItems;
        if (itemsToExclude.length > 0) {
          // this.logger.info(`- ${name} to exclude: ${itemsToExclude.join(', ')}`);
          logData = {inexclude: 'exclude', items: itemsToExclude.join(', ')};
        } else {
          // this.logger.info(`- ${name} to include: All`);
          logData = {inexclude: 'include', items: 'All'};
        }
      } else {
          // this.logger.info(`- ${name} to include: All`);
          logData = {inexclude: 'include', items: 'All'};
      }
    } else if (Array.isArray(includeItems)) {
      itemsToInclude = includeItems;
      if (itemsToInclude.length > 0) {
        // this.logger.info(`- ${name} to include: ${itemsToInclude.join(', ')}`);
        logData = {inexclude: 'include', items: itemsToInclude.join(', ')};
      } else {
        // this.logger.info(`- ${name} to include: None`);
        logData = {inexclude: 'include', items: 'None'};
      }
    } else {
      // false, or aything but true or an array
      itemsToInclude = [];
      // this.logger.info(`- ${name} to include: None`);
      logData = {inexclude: 'include', items: 'None'};
    }
    this.logger.info(`- ${name} to ${logData.inexclude}: `, {padded: logData.items });
    return {itemsToInclude, itemsToExclude};
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
      if (this.featuresToExclude.includes(f.type)) {
        this._skippedFeaturesByType[f.type] = this._skippedFeaturesByType[f.type] ? this._skippedFeaturesByType[f.type] + 1 : 1;
        continue;
      }
      if (Array.isArray(this.featuresToInclude) && !this.featuresToInclude.includes(f.type)) {
        this._skippedFeaturesByType[f.type] = this._skippedFeaturesByType[f.type] ? this._skippedFeaturesByType[f.type] + 1 : 1;
        continue;
      }
      // if (f.locations.length > 1) {
      //   this._skippedComplexFeatures.push(f);
      //   continue;
      // }
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
      if (f.locations.length > 1) {
        feature.locations = f.locations;
        this._complexFeatures.push(f);
        // continue;
      }
      // codonStart (from codon_start)
      if (f.qualifiers?.codon_start && parseInt(f.qualifiers.codon_start) !== 1) {
        feature.codonStart = parseInt(f.qualifiers.codon_start);
      }
      // geneticCode (from transl_table)
      if (feature.type === 'CDS') {
        const geneticCode =  f.qualifiers?.transl_table && parseInt(f.qualifiers.transl_table);
        // The default genetic code for GenBank/EMBL is 1
        feature.geneticCode = geneticCode || 1;
      }
      const qualifiers = CGViewBuilder.extractQualifiers(f.qualifiers, this.includeQualifiers, this.excludeQualifiers);
      if (qualifiers) {
        feature.qualifiers = qualifiers;
      }

      // Add feature to list
      features.push(feature);
    }    return features;
  }

  static extractQualifiers(qualifiersIn, includeQualifiers, excludeQualifiers) {
    let qualifiersOut = {};

    if (includeQualifiers === true && qualifiersIn) {
      if (Array.isArray(excludeQualifiers) && excludeQualifiers.length > 0) {
        const qualifiersInCopy = {...qualifiersIn};
          excludeQualifiers.forEach((q) => {
            delete qualifiersInCopy[q];
          });
        qualifiersOut = qualifiersInCopy;
      } else {
        qualifiersOut = qualifiersIn;
      }
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

  static fromSequenceText(text, options={}) {
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


class SequenceFile extends Status {

  /**
   * Static method to convert a sequence file directly to CGView JSON
   * @param {String} inputText - text from GenBank, EMBL, Fasta, or Raw
   * @param {Object} options - options provided to the SequenceFile
   * @returns 
   */
  static toCGViewJSON(inputText, options={}) {
    const logger = new Logger({logToConsole: false});
    const seqFile = new SequenceFile(inputText, {logger: logger, ...options});
    return seqFile.toCGViewJSON();
  }

  /**
   * Create a new SequenceFile object
   * @param {String} inputText - string from GenBank, EMBL, Fasta, or Raw [Required]
   * @param {*} options - 
   * - addFeatureSequences: boolean [Default: false]. This can increase run time ~3x.
   * - nameKeys: The order of preference for the name of a feature
   *   - array of strings [Default: ['gene', 'locus_tag', 'product', 'note', 'db_xref']]
   * - logger: logger object
   * - maxLogCount: number (undefined means no limit) [Default: undefined]
   */
  constructor(inputText, options={}) {
    // super(options, 'PARSING SEQUENCE FILE');
    super(options);
    this.logHeader('PARSING SEQUENCE FILE');
    const convertedText = convertLineEndingsToLF(inputText);
    this.nameKeys = options.nameKeys || ['gene', 'locus_tag', 'product', 'note', 'db_xref'];

    this._records = [];

    if (!convertedText || convertedText === '') {
      this._fail('Parsing Failed: No input text provided.', 'empty');
    } else if (isBinary(convertedText)) {
      this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', 'binary');
    } else {
      this._records = this.parseWrapper(convertedText, options);
      if (options.addFeatureSequences) {
        this._addFeatureSequence(this._records);
      }
      this._determineSequenceTypes(this._records);
      this._determineOverallInputAndSequenceType(this._records);
      this.logger.info('- done parsing sequence file');
      this.validateRecordsWrapper(this._records);
      this.parseSummary();
    }
    this.logger.break();
  }

  /////////////////////////////////////////////////////////////////////////////
  // Properties
  /////////////////////////////////////////////////////////////////////////////

  /**
   * @member {String} - Get the input type (e.g. genbank, embl, fasta, raw, mulitple)
   * - 'multiple' means that the file contains multiple different types of sequence records
   */
  get inputType() {
    return this._inputType;
  }

  /**
   * @member {String} - Get the sequence type (e.g. dna, protein, unknown, multiple)
   */
  get sequenceType() {
    return this._sequenceType;
  }


  /////////////////////////////////////////////////////////////////////////////
  // EXPORTERS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Converts the seqeunce records to CGView JSON using CGViewBuilder
   * @param {Object} options - passed to CGViewBuilder
   * @returns {Object} - CGView JSON
   */
  toCGViewJSON(options={}) {
    if (this.passed) {
      options.logger = options.logger || this.logger;
      const builder = new CGViewBuilder(this, options);
      return builder.toJSON();
    } else {
      this.logger.error('*** Cannot convert to CGView JSON because parsing failed ***');
    }
  }

  /**
   * Returns an array of parsed sequence records
   */
  get records() {
    return this._records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns a summary object with the following:
   * - inputType, sequenceType, sequenceCount, featureCount, totalLength, status
   *
   * The summary is generated by parseSummary()
   */
  get summary() {
    return this._summary;
  }

  /**
   * Add a summary to the logs and creates the summary object
   */
  parseSummary() {
    const records = this.records;
    const features = records.map((record) => record.features).flat();
    const seqLength = records.map((record) => record.length).reduce((a, b) => a + b, 0);

    this.logger.divider();
    this.logger.info('Parsing Summary:');
    this.logger.info('- Input file type: ', { padded: this.inputType });
    this.logger.info('- Sequence Type: ', { padded: this.sequenceType });
    this.logger.info('- Sequence Count: ', { padded: records.length });
    this.logger.info('- Feature Count: ', { padded: features.length });
    this.logger.info('- Total Length (bp): ', { padded: seqLength.toLocaleString() });
    this.logStatusLine();
    this.logger.divider();

    this._summary = {
      inputType: this.inputType,
      sequenceType: this.sequenceType,
      sequenceCount: records.length,
      featureCount: features.length,
      totalLength: seqLength,
      status: this.status,
      // success: this.success
    };
  }

  /////////////////////////////////////////////////////////////////////////////
  // PARSE AND VALIDATION WRAPPERS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Wraps the _parse method to catch any errors that occur during parsing
   * @param {String} fileText - text to parse
   * @param {Object} options - options for parsing
   * @returns {Array} - an array of records, one for each sequence
   */
  parseWrapper(fileText, options={}) {
    let records = [];
    try {
      records = this._parse(fileText, options);
    } catch (error) {
      this._fail('- Failed: An error occurred while parsing the file.', {errorCode: 'parsing'});
      this._fail(`- ERROR: ${error.message}`);
    }
    return records;
  }

  /**
   * Wraps the validateRecords method to catch any errors that occur during validation
   * @param {Array} records - array of records to validate
   */
  validateRecordsWrapper(records) {
    try {
      this._validateRecords(records);
    } catch (error) {
      this._fail('- Failed: An error occurred while validating the records.', {errorCode: 'validating'});
      this._fail(`- ERROR: ${error.message}`);
    }
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
    this.logger.info("- name extraction keys: " + this.nameKeys.join(', '));
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

  // Get a sequence accession and version from a GenBank or EMBL record
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

    // if (this.success) {
    // TODO: added warning here if needed
    if (this.passed) {
      this.logger.info('- validations passed', {icon: 'success'});
    } else {
      this.logger.error('- validations failed', {icon: 'fail'});
    }
  }

}

var SequenceFile$1 = SequenceFile;

class GFF3FeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return 'gff3';
  }

  get displayFileFormat() {
      return 'GFF3';
  }

  get lineCount() {
    return this._lineCount;
  }

  get nameKeys() {
    return this.options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];
  }

  /////////////////////////////////////////////////////////////////////////////
  // FeatureFile Methods (Delegate Owner)
  /////////////////////////////////////////////////////////////////////////////
  _info(message, options={}) {
    this.file._info(message, options);
  }

  _warn(message, options={}) {
    this.file._warn(message, options);
  }

  _fail(message, options={}) {
    this.file._fail(message, options);
  }
  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }
  /////////////////////////////////////////////////////////////////////////////



  // Returns true if the line matches the GFF3 format
  // - line: the first non-empty/non-comment line of the file
  static lineMatches(line) {
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length !== 9) {
      return false;
    } else if (isNaN(fields[3]) || isNaN(fields[4])) {
      return false;
    }
    return true;

  }

  // Parse the GFF3 file
  parse(fileText, options={}) {
    const records = [];
    const lines = fileText.split('\n');
    let line;
    for (line of lines) {
      if (line.startsWith('##')) ; else if (line.startsWith('#')) ; else if (line.trim() === '') ; else {
        // This is a feature line
        const record = this._parseLine(line);
        if (record) {
          records.push(record);
        }
      }
    }
    this._info(`- Note: Records with the same 'ID' will be joined into a single record.`);
    // this.logger.info(`- Parsed Feature Lines: ${records.length.toLocaleString().padStart(7)}`);
    this._info('- Parsed Feature Lines: ', { padded: records.length });
    const joinedRecords = this._joinRecords(records);
    // this.logger.info(`- Total Features: ${joinedRecords.length.toLocaleString().padStart(13)}`);
    this._info('- Total Features: ', { padded: joinedRecords.length });

    return joinedRecords;
  }

  // TODO
  // - replace values with undefined if they are "."
  // - lines with the same ID should be combined into a single record
  // - cgv feature name could come from Name or ID
  // - deal with features that wrap around the contig
  //   - requires Is_circular attribute for region
  //   - stop will be larger than seq length to indicate wrapping
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 9) {
      this.addValidationIssue('lineError', `  - Line does not have 9 fields: ${line}`);
      return null;
    }
    const record = {
      contig: fields[0],
      source: fields[1],
      type: this._parseType(fields[2]),
      start: parseInt(fields[3]),
      stop: parseInt(fields[4]),
      score: fields[5],
      strand: fields[6],
      phase: fields[7],
      attributes: this._parseAttributes(fields[8]),
      qualifiers: {},
      valid: true,
    };
    const qualifiers = this._extractQualifiers(record);
    if (Object.keys(qualifiers).length > 0) {
      record.qualifiers = qualifiers;
    }
    record.name = this._extractName(record, this.nameKeys);
    return record;
  }

  _parseType(type) {
    const soTerm = SO_TERMS[type];
    return soTerm || type;
  }

  // Attributes with predefined meaning: ID, Name, Alias, Parent, Note, Dbxref, Is_circular, Target, Gap, Derives_from, Ontology_term
  _parseAttributes(attributeString) {
    const attributes = {};
    const fields = attributeString.split(';');
    let field;
    for (field of fields) {
      const [key, value] = field.split('=');
      attributes[key] = value.trim();
    }
    return attributes;
  }

  _extractQualifiers(record) {
    const attributes = record.attributes || {};
    const qualifiers = {};
    const keys = Object.keys(attributes);
    let key;
    for (key of keys) {
      if (QUALIFIERS.includes(key)) {
        qualifiers[key] = attributes[key];
        // qualifiers.push({ key, value: attributes[key] });
      } else if (key === 'Dbxref') {
        qualifiers['db_xref'] = attributes[key];
      } else if (key === 'Note') {
        this._addQualifierNote(qualifiers, attributes[key]);
      } else if (key === 'codons') {
        this._addQualifierNote(qualifiers, `codon recognized: ${attributes[key]}`);
      }
    }
    return qualifiers;
  }

  _addQualifierNote(qualifiers, note) {
    // qualifiers = record.qualifiers;
    if (!qualifiers.note) {
      qualifiers.note = note;
    } else {
      qualifiers.note += `; ${note}`;
    }
  }

  _extractName(record, nameKeys) {
    const attributes = record.attributes || {};
    let key;
    for (key of nameKeys) {
      if (attributes[key]) {
        return attributes[key];
      }
    }
    return null;
  }

  // Records are joined if they have the same ID
  // TODO: if CDS have the same parent gene, they should be joined
  _joinRecords(records) {
    const joinedRecords = [];
    const recordMap = {};
    let record;
    for (record of records) {
      if (record.attributes.ID) {
        const id = record.attributes.ID;
        if (recordMap[id]) {
          recordMap[id].push(record);
        } else {
          recordMap[id] = [record];
        }
      } else {
        joinedRecords.push(record);
      }
    }
    const ids = Object.keys(recordMap);
    for (let id of ids) {
      const records = recordMap[id];
      if (records.length === 1) {
        joinedRecords.push(records[0]);
      } else {
        const joinedRecord = this._joinRecordGroup(records);
        joinedRecords.push(joinedRecord);
      }
    }
    return joinedRecords;
  }

  _joinRecordGroup(records) {
    if (records.length === 1) { return records[0]; }
    // Sort records by start position
    records.sort((a, b) => a.start - b.start);

    // Start with first record as the base
    const joinedRecord = {...records[0]};

    // Join locations
    const locations = [];
    for (let record of records) {
      locations.push([record.start, record.stop]);
    }
    joinedRecord.locations = locations;
    joinedRecord.stop = locations[locations.length - 1][1];

    // Merge qualifiers and attributes
    for (let record of records) {
      joinedRecord.qualifiers = {...joinedRecord.qualifiers, ...record.qualifiers};
      joinedRecord.attributes = {...joinedRecord.attributes, ...record.attributes};
    }

    return joinedRecord;
  }

  validateRecords(records) {
    // GFF3 specific validations
  }

}

class GTFFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return 'gtf';
  }

  get displayFileFormat() {
      return 'GTF';
  }

  get lineCount() {
    return this._lineCount;
  }

  get nameKeys() {
    return this.options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];
  }

  /////////////////////////////////////////////////////////////////////////////
  // FeatureFile Methods (Delegate Owner)
  /////////////////////////////////////////////////////////////////////////////
  _info(message, options={}) {
    this.file._info(message, options);
  }

  _warn(message, options={}) {
    this.file._warn(message, options);
  }

  _fail(message, options={}) {
    this.file._fail(message, options);
  }
  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }
  /////////////////////////////////////////////////////////////////////////////


  // Returns true if the line matches the GTF format
  // - line: the first non-empty/non-comment line of the file
  static lineMatches(line) {
    const adjustedLine = line.replace(/\s+#[^"]+$/, '');
    const fields = adjustedLine.split('\t').map((field) => field.trim());
    const attributes = fields[8]?.split('; ') || [];
    if (fields.length !== 9) {
      return false;
    } else if (isNaN(fields[3]) || isNaN(fields[4])) {
      return false;
    } else if (attributes.length < 2) {
      // requried to have at least 2 attributes
      return false;
    } else if (!attributes[0].startsWith('gene_id')) {
      return false;
    }
    return true;
  }

  parse(fileText, options={}) {
    const records = [];
    const lines = fileText.split('\n');
    let line;
    for (line of lines) {
      if (line.startsWith('##')) ; else if (line.startsWith('#')) ; else if (line.trim() === '') ; else {
        // This is a feature line
        const record = this._parseLine(line);
        if (record) {
          records.push(record);
        }
      }
    }
    this._info(`- Note: Records (CDS, start/stop_codon) with the same 'transcript_id' will be joined into a single CDS record.`);
    // this.logger.info(`- Parsed Feature Lines: ${records.length.toLocaleString().padStart(7)}`);
    this._info('- Parsed Feature Lines: ', { padded: records.length });
    const joinedRecords = this._joinRecords(records);
    // const joinedRecords = records;
    // this.logger.info(`- Total Features: ${joinedRecords.length.toLocaleString().padStart(13)}`);
    this._info('- Total Features: ', { padded: joinedRecords.length });

    return joinedRecords;
  }

  // TODO
  // - replace values with undefined if they are "."
  // - lines with the same ID should be combined into a single record
  // - may need to remove comments at the end of lines '#'
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 9) {
      this.addValidationIssue('lineError', `  - Line does not have 9 fields: ${line}`);
      // this._fail(`- Line does not have 9 fields: ${line}`);
      return null;
    }
    const record = {
      contig: fields[0],
      source: fields[1],
      type: this._parseType(fields[2]),
      start: parseInt(fields[3]),
      stop: parseInt(fields[4]),
      score: fields[5],
      strand: fields[6],
      phase: fields[7],
      attributes: this._parseGTFAttributes(fields[8]),
      qualifiers: {},
      valid: true,
    };
    const qualifiers = this._extractQualifiers(record);
    if (Object.keys(qualifiers).length > 0) {
      record.qualifiers = qualifiers;
    }
    record.name = this._extractName(record, this.nameKeys);
    return record;
  }

  _parseType(type) {
    const soTerm = SO_TERMS[type];
    return soTerm || type;
  }

  // Attributes with predefined meaning: gene_id, transcript_ID
  _parseGTFAttributes(attributeString) {
    const attributes = {};
    const fields = attributeString.split('; ');
    // HERE: use regex to split key values. value may be in quotes
    for (let field of fields) {
      let match = field.match(/\s*(\S+)\s+"([^"]+)"/);
      if (match) {
        const key = match[1];
        const value = match[2];
        if (attributes[key]) {
          if (Array.isArray(attributes[key])) {
            attributes[key].push(value);
          } else {
            attributes[key] = [attributes[key], value];
          }
        } else {
          attributes[key] = value;
        }
      }
    }
    return attributes;
  }

  _extractQualifiers(record) {
    const attributes = record.attributes || {};
    const qualifiers = {};
    const keys = Object.keys(attributes);
    let key;
    for (key of keys) {
      if (QUALIFIERS.includes(key)) {
        qualifiers[key] = attributes[key];
        // qualifiers.push({ key, value: attributes[key] });
      } else if (key === 'Dbxref') {
        qualifiers['db_xref'] = attributes[key];
      } else if (key === 'Note') {
        this._addQualifierNote(qualifiers, attributes[key]);
      } else if (key === 'codons') {
        this._addQualifierNote(qualifiers, `codon recognized: ${attributes[key]}`);
      }
    }
    return qualifiers;
  }

  _addQualifierNote(qualifiers, note) {
    // qualifiers = record.qualifiers;
    if (!qualifiers.note) {
      qualifiers.note = note;
    } else {
      qualifiers.note += `; ${note}`;
    }
  }

  _extractName(record, nameKeys) {
    const attributes = record.attributes || {};
    let key;
    for (key of nameKeys) {
      if (attributes[key]) {
        return attributes[key];
      }
    }
    return null;
  }

  // Records are joined if they have the same ID
  // Only join CDS/start_codon/stop_codon records if they have the same transcript_id
  // NOTE:
  // - The "start_codon" feature is up to 3bp long in total and is included in the coordinates for the "CDS" features.
  // - The "stop_codon" feature similarly is up to 3bp long and is excluded from the coordinates for the "3UTR" features, if used.
  // - Start/Stop codons can be split across distict features (multiple lines)
  _joinRecords(records) {
    const joinedRecords = [];
    const recordMap = {};
    const groupTypes = ['CDS', 'start_codon', 'stop_codon'];
    let record;
    for (record of records) {
      const transcriptID = record.attributes.transcript_id;
      if (transcriptID && groupTypes.includes(record.type)) {
        if (recordMap[transcriptID]) {
          recordMap[transcriptID].push(record);
        } else {
          recordMap[transcriptID] = [record];
        }
      } else {
        joinedRecords.push(record);
      }
    }
    const ids = Object.keys(recordMap);
    for (let id of ids) {
      const records = recordMap[id];
      if (records.length === 1) {
        joinedRecords.push(records[0]);
      } else {
        const joinedRecord = this._joinRecordGroup(records);
        joinedRecords.push(joinedRecord);
      }
    }
    return joinedRecords;
  }

  // Groups should only contain CDS, start_codon, and stop_codon records
  // Skip start_codon records
  // Add stop_codon records
  _joinRecordGroup(records) {
    if (records.length === 1) { return records[0]; }
    // Sort records by start position
    records.sort((a, b) => a.start - b.start);

    // Remove start_codon records (they should already be included in the CDS records)
    // TODO: add warning if start_codon is not included in CDS
    records = records.filter((record) => record.type !== 'start_codon');

    // Start with first record as the base
    const joinedRecord = {...records[0]};

    if (joinedRecord.type !== 'CDS') {
      if (records.some((record) => record.type === 'CDS')) {
        joinedRecord.type = 'CDS';
      } else {
        this._warn(`- No CDS records for this group: ${records  }`);
      }
    }

    // Join locations
    const locations = [];
    for (let record of records) {
      locations.push([record.start, record.stop]);
    }
    joinedRecord.locations = locations;
    joinedRecord.stop = locations[locations.length - 1][1];

    // Merge qualifiers and attributes
    for (let record of records) {
      joinedRecord.qualifiers = {...joinedRecord.qualifiers, ...record.qualifiers};
      joinedRecord.attributes = {...joinedRecord.attributes, ...record.attributes};
    }

    return joinedRecord;
  }

  validateRecords(records) {
    // GTF specific validations
  }

}

// NOTES:
// - Only works with tab separated files (NOT space separated)
// - Bed is a 0-based format. The chromStart field is 0-based and the chromEnd field is 1-based.

class BEDFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
  }

  get VALIDATION_ISSUE_CODES() {
    return ['thickStartNotMatchingStart', 'thickEndNotMatchingEnd'];
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return 'bed';
  }

  get displayFileFormat() {
      return 'BED';
  }

  get lineCount() {
    return this._lineCount;
  }

  // Returns an object with keys for the error codes and values for the error messages
  // - Issure Codes:
  //   - thickStartNotMatchingStart
  //   - thickEndNotMatchingStop
  //   - missingStart
  //   - missingStop
  get validationIssues() {
    return this.file.validationIssues || {};
  }


  /////////////////////////////////////////////////////////////////////////////
  // FeatureFile Methods (Delegate Owner)
  /////////////////////////////////////////////////////////////////////////////
  _info(message, options={}) {
    this.file._info(message, options);
  }

  _warn(message, options={}) {
    this.file._warn(message, options);
  }

  _fail(message, options={}) {
    this.file._fail(message, options);
  }
  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns true if the line matches the BED format.
   * Note: fields 2, 3, 5, 7, 8, 10 when present should be numbers
   * @param {String} line - data line from the file (first non-empty/non-comment line)
   * @returns {Boolean} - true if the line matches the BED format
   */
  static lineMatches(line) {
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 3) {
      return false;
    } else if (fields.length === 10 || fields.length === 11) {
      // BED10 and BED11 are not permitted
      return false;
    } else if (isNaN(fields[1]) || isNaN(fields[2])) {
      return false;
    } else if (fields.length >= 5 && isNaN(fields[4])) {
      return false;
    } else if (fields.length >= 7 && isNaN(fields[6])) {
      return false;
    } else if (fields.length >= 8 && isNaN(fields[7])) {
      return false;
    } else if (fields.length >= 10 && isNaN(fields[9])) {
      return false;
    }

    return true;
  }

  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }

  parse(fileText, options={}) {
    const records = [];
    const lines = fileText.split('\n');
    let line;
    for (line of lines) {
      if (line.startsWith('#')) ; else if (line.trim() === '') ; else {
        // This is a feature line
        const record = this._parseLine(line);
        if (record) {
          records.push(record);
        }
      }
    }
    this.logger.info(`- Parsed ${records.length} records`);
    return records;
  }

  // TODO
  // - Provide warnging for thickStart/thickEnd
  // - Should we check the number of fields and confirm they are all the same?
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 3) {
      this.addValidationIssue('lineError', `  - Line does not have at least 3 fields: ${line}`);
      // this._fail(`- Line does not have at least 3 fields: ${line}`);
      return null;
    }
    // Bsic fields
    const record = {
      contig: fields[0],
      // Convert start to 1-based
      start: parseInt(fields[1]) + 1,
      stop: parseInt(fields[2]),
      name: fields[3] || 'Uknown',
      valid: true,
    };

    // if (isNaN(record.start)) {
    //     this.addValidationIssue('missingStart');
    //     record.valid = false;
    // }
    // if (isNaN(record.stop)) {
    //     this.addValidationIssue('missingStop');
    //     record.valid = false;
    // }

    // Score
    const score = parseFloat(fields[4]);
    if (!isNaN(score)) {
      record.score = score;
    }
    // Strand
    if (fields[5]) {
      record.strand = fields[5];
    }
    // ThickStart and ThickEnd
    if (fields[6]) {
      const thickStart = parseInt(fields[6]);
      // thickStart is 0-based so we add 1 here
      if ((thickStart + 1) !== record.start) {
        this.addValidationIssue('thickStartNotMatchingStart', `- thickStart is not the same as start: ${line}`);
        // record.valid = false;
      }
    }
    if (fields[7]) {
      const thickEnd = parseInt(fields[7]);
      if (thickEnd !== record.stop) {
        this.addValidationIssue('thickEndNotMatchingEnd', `- thickEnd is not the same as stop: ${line}`);
        // record.valid = false;
      }
    }
    // Blocks (requires fields 10, 11, 12)
    if (fields[11]) {
      const blockCount = parseInt(fields[9]);
      if (blockCount > 1) {
        // blockSizes and blockStarts may have dangling commas
        const blockSizes = fields[10].replace(/,$/, '').split(',').map((size) => parseInt(size));
        // blockStarts are 0-based so we add 1 here
        const blockStarts = fields[11].replace(/,$/, '').split(',').map((start) => parseInt(start) + 1);
        if (blockCount !== blockSizes.length || blockCount !== blockStarts.length) {
          // ERROR CODE
          this.logger.warn(`- Block count does not match block sizes and starts: ${line}`);
          console.log(blockCount, blockSizes, blockStarts);
        } else if (blockStarts[0] !== 1) {
          // ERROR CODE
          this.logger.warn(`- Block start does not match start: ${line}`);
        } else if ((blockStarts[blockStarts.length - 1] + blockSizes[blockStarts.length - 1] + record.start - 2) !== record.stop) {
          // ERROR CODE
          this.logger.warn(`- Block end does not match stop: ${line}`);
        } else {
          // Add blocks to locations
          record.locations = [];
          for (let i = 0; i < blockCount; i++) {
            record.locations.push([
              record.start + blockStarts[i] - 1,
              record.start + blockStarts[i] + blockSizes[i] - 2
            ]);
          }
        }
      }
    }

    return record;
  }

  validateRecords(records) {
    // BED Specific Validation
    const validationIssues = this.validationIssues;
    // ThickStart and ThickEnd Warnings
    const thickStartErrors = validationIssues['thickStartNotMatchingStart'] || [];
    if (thickStartErrors.length) {
      this._warn(`- Features where thickStart != start: ${thickStartErrors.length}`);
    }
    const thickEndErrors = validationIssues['thickEndNotMatchingEnd'] || [];
    if (thickEndErrors.length) {
      this._warn(`- Features where thickEnd != stop: ${thickStartErrors.length}`);
    }
    if (thickStartErrors.length || thickEndErrors.length) {
      this._warn(`- NOTE: thickStart and thickEnd are ignored by this parser`);
    }
  }

}

// NOTES:
// - CSV is a 1-based format. The start field is 1-based and the stop field is 1-based.
// - Can be CSV or TSV
// - header line can be optional but then you need to state what each column is with columnMap
// - maxColumns: maximum number of columns to read (default is 30)
// - columnMap: internal column names (keys) to column names in the file (or indexes)
//   - column keys: contig, start, stop, name, score, strand, type, legend, codonStart
//   - possible future keys:
//     - tags, meta, visible, favorite, geneticCode, attributes, qualifiers,
//     - locations, centerOffsetAdjustment, proportionOfThickness
//   - when using numbers to represent column indices, they are 0-based (MAYBE CHANGE THIS AFTER)
//     - and they must be numbers NOT strings (e.g. use 1, not "1")
//   - column names are case-insensitive
//   - keys are case-sensitive
//   - default values are the internal column keys
//   - if no header, then columnMap values must be integers
//   - if a columnMap is provided, it must include all columns to import
//     - missing columns will be ignored

class CSVFeatureFile {

  constructor(file, options={}) {
      this._file = file;
      this._separator = [',', '\t'].includes(options.separator) ? options.separator : ',';
      this._options = options;
      this.logger = options.logger || new Logger();
      this._lineCount = 0;
      this._noHeader = (options.noHeader === undefined) ? false : options.noHeader;
      // this.onlyColumns = options.onlyColumns || [];
      this._columnMap = options.columnMap || {};
      this._maxColumns = options.maxColumns || CSVFeatureFile.defaultMaxColumns;
  }

  static get defaultColumnMap() {
    return {
      contig: 'contig',
      start: 'start',
      stop: 'stop',
      name: 'name',
      score: 'score',
      strand: 'strand',
      type: 'type',
      legend: 'legend',
      codonStart: 'codonStart',
    };
  }

  static get defaultMaxColumns() {
    return 30;
  }

  static get columnKeys() {
    return Object.keys(CSVFeatureFile.defaultColumnMap);
  }

  get columnIndexToKeyMap() {
    return this._columnIndexToKeyMap;
  }

  set columnIndexToKeyMap(value) {
    this._columnIndexToKeyMap = value;
  }

  get file() {
      return this._file;
  }

  get options() {
      return this._options;
  }

  get fileFormat() {
      return (this.separator === ',') ? 'csv' : 'tsv';
  }

  get displayFileFormat() {
      return (this.separator === ',') ? 'CSV' : 'TSV';
  }

  get lineCount() {
    return this._lineCount;
  }

  get separator() {
    return this._separator;
  }

  get columnMap() {
    return this._columnMap;
  }

  get hasHeader() {
    return !this._noHeader;
  }
  get noHeader() {
    return this._noHeader;
  }

  get maxColumns() {
    return this._maxColumns;
  }


  /////////////////////////////////////////////////////////////////////////////
  // FeatureFile Methods (Delegate Owner)
  /////////////////////////////////////////////////////////////////////////////
  _info(message, options={}) {
    this.file._info(message, options);
  }

  _warn(message, options={}) {
    this.file._warn(message, options);
  }

  _fail(message, options={}) {
    this.file._fail(message, options);
  }
  addValidationIssue(issueCode, message) {
    this.file.addValidationIssue(issueCode, message);
  }
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns a map of column indexes to internal column keys.
   * Every column will be represented in the map.
   * Currently, the index is 0-based but this may change to 1-based.
   */
  createColumnIndexToKeyMapFromHeader(line) {
    const defaultColumnMap = CSVFeatureFile.defaultColumnMap;
    const columnMap = this.columnMap;
    const columnIndexToKeyMap = {};

    let displayColumnMap = 'None';
    if (Object.keys(columnMap).length > 0) {
      displayColumnMap =  JSON.stringify(columnMap);
      displayColumnMap = displayColumnMap.replace(/{"/g, '{').replace(/,"/g, ',').replace(/":/g, ':');
      displayColumnMap = displayColumnMap.replace(/ignored:\d+,?/, '');
    }
    this._info(`- Provided Column Map: ${displayColumnMap}`);

    // Split the line into fields and get the column count
    let fields = line.split(this.separator).map((field) => field.trim().toLowerCase());
    this.columnCount = fields.length;
    if (fields.length > this.maxColumns) {
      // Get first maxColumns columns
      const maxFields = fields.slice(0, this.maxColumns);
      const extraCount = fields.length - this.maxColumns;
      this._info(`- First Line: ${[...maxFields, `...${extraCount} more`].join(this.separator)}`);
      this._warn(`- Column Count: ${fields.length}`);
      this._warn(`- Only looking at first ${this.maxColumns} columns`);
      fields = maxFields;
    } else {
      this._info(`- First Line: ${line}`);
      this._info(`- Column Count: ${fields.length}`);
    }

    // if (this.onlyColumns.length) {
    //   this._info(`- Only Columns: ${this.onlyColumns.join(', ')}`);
    // }

    // Return empty object if line was empty
    // Note: This actually shouldn't ever happen because we check for empty lines when parsing
    if (fields.length === 1 && fields[0] === '') {
      this._fail(`- Empty frst line`);
      return {};
    }

    // Check that all keys are valid
    const validKeys = CSVFeatureFile.columnKeys;
    validKeys.push('ignored');
    const columnKeys = Object.keys(columnMap);
    for (const key of columnKeys) {
      if (!validKeys.includes(key)) {
        this._fail(`- Invalid column key: ${key}`);
      }
    }
    this._info(`- Header: ${this.hasHeader ? 'Yes' : 'No'}`);


    let invertedColumnMap = {};
    // Check if all the values are integers
    if (this.noHeader) {
      // HEADER: NO
      // Check that the columnMap values are all integers
      if (!Object.values(columnMap).every((value) => Number.isInteger(value))) {
        this._fail(`- ColumnMap values must be integers when there is no header`);
      }
      invertedColumnMap = invertObject(columnMap);
    } else {
      // HEADER: YES
      // Merge the default column map with the provided column map
      // const newColumnMap = {...defaultColumnMap, ...columnMap};
      const newColumnMap = Object.keys(columnMap).length ? columnMap : defaultColumnMap;
      invertedColumnMap = invertObject(newColumnMap, true);
    }

    // Create the column index to key map
    this._info("- Column Key Mapping:");
    this._info(`    #       Key${this.hasHeader ? '   Column Header' : ''}`);
    for (const [index, origColumn] of fields.entries()) {
      if (invertedColumnMap[index]) {
        columnIndexToKeyMap[index] = invertedColumnMap[index];
      } else if (invertedColumnMap[origColumn]) {
        columnIndexToKeyMap[index] = invertedColumnMap[origColumn];
      } else {
        columnIndexToKeyMap[index] = 'ignored';
      }
      // if (this.onlyColumns.length && columnIndexToKeyMap[index] != 'ignored') {
      //   if (!this.onlyColumns.includes(columnIndexToKeyMap[index])) {
      //     columnIndexToKeyMap[index] = 'ignored';
      //   }
      // }
      this._info(`  - ${index}: ${columnIndexToKeyMap[index].padStart(8)}${this.hasHeader ? ` - ${origColumn}` : ''}`);
    }

    // Check for required columns
    const requiredColumnKeys = ['start', 'stop'];
    const keysPresent = Object.values(columnIndexToKeyMap);
    for (const key of requiredColumnKeys) {
      if (!keysPresent.includes(key)) {
        this._fail(`- Required Column Missing: ${key}`);
      }
    }

    // Check that provided column names are in the header
    // And that provided column indexes are within the range of the header
    const providedColumnValues = Object.values(columnMap);
    for (const nameOrIndex of providedColumnValues) {
      if (typeof nameOrIndex === 'number') {
        if (nameOrIndex >= fields.length) {
          this._fail(`- Column index out of range (${invertedColumnMap[nameOrIndex]}): ${nameOrIndex}`);
        }
      } else if (typeof nameOrIndex === 'string') {
        const name = nameOrIndex.toLowerCase();
        if (!fields.includes(name)) {
          this._fail(`- Column name not found in header  (${invertedColumnMap[nameOrIndex]}): ${nameOrIndex}`);
        }
      }
    }

    return columnIndexToKeyMap;
  }

  /**
   * Returns the data from the column with the given index
   * @param {Number} index - column index (1-based)
   * @param {Number} itemCount - number of items (rows of data) in the column to be returned.
   *  If undefined, all items will be returned.
   * @returns {Array} - array of data for the column
   */
  static columnData(text, separator, count) {
    const lines = text.split('\n');
    const data = [];
    let rowCount = 0;
    for (let line of lines) {
      if (rowCount === count) {
        break;
      }
      if (line.startsWith('#') || line.trim() === '') ; else {
        rowCount++;
        const fields = line.split(separator).map((field) => field.trim());
        for (let i = 0; i < fields.length; i++) {
          if (!data[i]) {
            data[i] = [];
          }
          data[i].push(fields[i]);
        }
      }
    }
    return data;
  }

  // Detect the separator based on the first 10 lines of the file
  // Returns the separator (',' or '\t') or undefined if the separator could not be detected
  // - count how many ',' and how many '\t' are on each line
  // - then check if the counts are consistent. If they are, then assign to commaCount or tabCount
  // - Take the separator with the highest count
  // - If they are undefined (i.e. counts are not consistent), then return an error
  static detectSeparator(fileText) {
    const maxLines = 10;
    const testLines = getLines(fileText, { maxLines });

    let commaCount, tabCount;
    for (const line of testLines) {
      const lineCommaCount = (line.match(/,/g) || []).length;
      const lineTabCount = (line.match(/\t/g) || []).length;
      if (commaCount === undefined) {
        commaCount = lineCommaCount;
      } else if (commaCount !== lineCommaCount) {
        commaCount = -1;
      }
      if (tabCount === undefined) {
        tabCount = lineTabCount;
      } else if (tabCount !== lineTabCount) {
        tabCount = -1;
      }
    }

    if ([0, -1].includes(commaCount) && [0, -1].includes(tabCount)) ; else if (commaCount === -1) {
      return '\t';
    } else if (tabCount === -1) {
      return ',';
    } else {
      return (commaCount > tabCount) ? ',' : '\t';
    }
  }

  parse(fileText, options={}) {
    const records = [];
    let foundHeader = false;
    const lines = fileText.split('\n');
    for (let line of lines) {
      if (line.startsWith('#')) ; else if (line.trim() === '') ; else {
        if (!foundHeader) {
          // This is the header line or first line of data
          foundHeader = true;
          // Parse the header line
          this.columnIndexToKeyMap = this.createColumnIndexToKeyMapFromHeader(line);
          // Check status
          if (this.file.status === 'failed') {
            return [];
          }
          if (this.noHeader) {
            // This is a data line
            const record = this._parseLine(line);
            if (record) {
              records.push(record);
            }
          }
        } else {
          // This is a data line
          const record = this._parseLine(line);
          if (record) {
            records.push(record);
          }
        }
      }
    }
    this._info(`- Parsed ${records.length} records`);
    return records;
  }

  // TODO
  // - Should we check the number of fields and confirm they are all the same?
  _parseLine(line) {
    this._lineCount++;
    const fields = line.split(this.separator).map((field) => field.trim());
    if (fields.length < 2) {
      this.addValidationIssue('lineError', `  - Line does not have at least 2 fields: ${line}`);
      // this._fail(`- Line does not have at least 2 fields: ${line}`);
      return null;
    }

    // Adds the field to the record if it exists in fields and columnMap
    const record = {};
    this.addFieldToRecord(record, 'name', fields);
    this.addFieldToRecord(record, 'contig', fields);
    this.addFieldToRecord(record, 'start', fields, 'integer');
    this.addFieldToRecord(record, 'stop', fields, 'integer');
    this.addFieldToRecord(record, 'strand', fields, 'strand');
    this.addFieldToRecord(record, 'type', fields);
    this.addFieldToRecord(record, 'score', fields, 'float');
    this.addFieldToRecord(record, 'legend', fields);
    this.addFieldToRecord(record, 'codonStart', fields, 'integer');
    record.valid = true;

    return record;
  }

  addFieldToRecord(record, field, fields, parseAs='string') {
    if (!['string', 'integer', 'float', 'strand'].includes(parseAs)) {
      throw new Error(`Invalid parseAs value: ${parseAs}`);
    }

    // const colMap = this.columnIndexMap;
    const colMap = invertObject(this.columnIndexToKeyMap);

    if (colMap[field] !== undefined) {
      const index = colMap[field];
      if (fields[index] !== undefined) {
        if (parseAs === 'integer') {
          record[field] = parseInt(fields[index]);
        } else if (parseAs === 'float') {
          record[field] = parseFloat(fields[index]);
        } else if (parseAs === 'strand') {
          // Strand will be parsed to '+', '-' or '.'
          let strand = '+'; // default
          let value = fields[index];
          if (value === '-' || value === '-1' || value === -1) {
            strand = '-';
          } else if (value === '.') {
            strand = '.';
          }
          record[field] = strand;
        } else {
          record[field] = fields[index];
        }
      }
    }
  }

  validateRecords(records) {
    // CSV specific validations
  }

}

// This will be the main interface for parsing Feature Files. 
// For each feature file type (e.g. GFF3, GTF, BED, CSV, TSV, etc.),
// we  have delagates that will parse the file and return an array of
// of joined features.
// The returned features are not exactly CGView feature yet, but they are
// in a format that can be easily converted to CGView features with FeatureBuilder.
// This raw format contains all the attributes from GFF3 and GTF files.
// Any attributes that are qualifiers, will also be available
// in the 'qualifiers' object.


/**
 * FeatureFile class reads a feature file (GFF3, BED, CSV, TSV, GTF) and returns an array of records
 * One for each feature. Some records (e.g. CDS) may be joined together if they have the same ID.
 *
 * FILE DELEGATES (based on fileFormat)
 * Each file format has it's own delegate that is responsible for
 * processing, validating and describing a file. Each delegate must
 * have the following methods:
 * - parse(text, options): returns an array of records
 *   - options: { logger, maxLogCount }
 * - fileFormat (getter): e.g. 'gff3', 'bed', 'csv', 'tsv', 'gtf'
 * - displayFileFormat (getter): e.g. 'GFF3', 'BED', 'CSV', 'TSV', 'GTF'
 * - nameKeys (getter): array of strings
 *
 * NOTE:
 * - tsv and csv are both parsed by the CSVFeatureFile delegate
 *
 * REQUIRED:
 * - inputText: string from GFF3, BED, CSV, TSV, or GTF file
 *
 * OPTIONS:
 * - GENERAL (All Formats)
 *   - format: The file format being parsed (e.g. 'auto', 'gff3', 'bed', 'csv', 'tsv', 'gtf') [Default: 'auto'].
 *   - logger: logger object
 *   - maxLogCount: number (undefined means no limit) [Default: undefined]
 * - GFF3/GTF
 *   - nameKeys: The order of preference for the name of a feature
 *     - Currently only used for GFF3 and GTF files
 *     - array of strings [Default: ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID']]
 *     - NOTE: 'Name' and 'ID' are from GFF3 attributes, the others are from the qualifiers.
 *     - FIXME: this may change based on the format
 * - CSV/TSV
 *   - separator: the separator used in the file (e.g. ',' or '\t') [Default: ',']
 *   - noHeader: boolean [Default: false]
 *   - [REMOVED] onlyColumns: array of strings indicating which columns to extract. [Default: [] (all columns)]
 *   - columnMap: object mapping column names to new names or column number (if no header). [Default: {}]
 *     - e.g. { start: 'chromStart', stop: 'chromEnd' }
 *     - columnKeys: contig, start, stop, strand, name, type, score, legend, codonStart
 *     - Future Keys: tags, qualifiers, meta
 *     - only the columns provided will be extracted
 */
class FeatureFile extends Status {

  /**
   * List of supported file formats
   */
  static FORMATS = ['auto', 'gff3', 'bed', 'csv', 'tsv', 'gtf'];

  /**
   * Map of file formats to their respective delegates
   */
  static FILE_FORMAT_DELEGATES = {
    'gff3': GFF3FeatureFile,
    'gtf': GTFFeatureFile,
    'bed': BEDFeatureFile,
    'csv': CSVFeatureFile,
    'tsv': CSVFeatureFile,
  };

  /**
   * Parses a feature file and returns an array of records
   * @param {String} inputText - text from a feature file (GFF3, BED, CSV, TSV, GTF)
   * @param {Object} options - See class description
   */
  constructor(inputText, options={}) {
    // super(options, 'PARSING FEATURE FILE');
    super(options);
    this.logHeader('PARSING FEATURE FILE');
    const convertedText = convertLineEndingsToLF(inputText);
    this.inputText = convertedText; // used by csv to get column data
    let providedFormat = options.format || 'auto';

    this._records = [];
    this._validationIssues = {};

    this.nameKeys = options.nameKeys || ['Name', 'Alias', 'gene', 'locus_tag', 'product', 'note', 'db_xref', 'ID'];

    if (!convertedText || convertedText === '') {
      this._fail('Parsing Failed: No input text provided.', {errorCode: 'empty'});
    } else if (isBinary(convertedText)) {
      this._fail('Parsing Failed: Input contains non-text characters. Is this binary data?', {errorCode: 'binary'});
    } else {
      // File Format
      this._info("Checking File Format...");
      this._info('- Format Provided: ', { padded: providedFormat });
      this.detectedFormat = this.detectFormat(convertedText);
      this._info('- Format Detected: ', { padded: this.detectedFormat });
      this.inputFormat = this.chooseFormat(providedFormat, this.detectedFormat);
      // Do not continue if the format is unknown
      if (!this.passed) { return; }

      // Names
      if (['gtf', 'gff3'].includes(this.inputFormat)) {
        this._info("- Name extraction keys (GFF3/GTF): " + this.nameKeys.join(', '));
      }
      // Parse
      this._records = this.parseWrapper(convertedText, options);
      this.validateRecordsWrapper(this._records, options);
      this.parseSummary();
    }
    this.logger.break();
  }

  /////////////////////////////////////////////////////////////////////////////
  // VALIDATION ISSUES
  /////////////////////////////////////////////////////////////////////////////

  // File specific issue codes can be set in the delegate: VALIDATION_ISSUE_CODES
  // - missingStart: record is missing a start value
  // - missingStop: record is missing a stop value
  // - lineError: line does not match the expected format
  static get COMMON_VALIDATION_ISSUE_CODES() {
    return ['missingStart', 'missingStop', 'lineError'];
  }

  get validationIssues() {
    return this._validationIssues || {};
  }

  validationIssueCount(issueCode) {
    return this.validationIssues[issueCode]?.length || 0;
  }

  addValidationIssue(issueCode, message) {
    const delegateIssueCodes = this.delegate?.VALIDATION_ISSUE_CODES || [];
    const allowedCodes = [...FeatureFile.COMMON_VALIDATION_ISSUE_CODES, ...delegateIssueCodes];
    if (!allowedCodes.includes(issueCode)) {
      this._fail("ERROR: Invalid validiation issue code: " + issueCode);
      return;
    }
    const validationIssues = this.validationIssues;
    if (validationIssues[issueCode]) {
      validationIssues[issueCode].push(message);
    } else {
      validationIssues[issueCode] = [message];
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // FILE FORMAT
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The file format being parsed: 'auto', 'gff3', 'bed', 'csv', 'tsv', 'gtf', 'unknown'
   */
  get inputFormat() {
    return this.delegate?.fileFormat;
  }

  set inputFormat(format) {
    const fileFormats = Object.keys(FeatureFile.formatDelegateMap);
    if (fileFormats.includes(format)) {
      if ([ 'csv', 'tsv' ].includes(format)) {
        this.options.separator = (format === 'csv') ? ',' : '\t';
      }
      this._delegate = new FeatureFile.formatDelegateMap[format](this, this.options);
    } else {
      this._fail(`File format '${format}' must be one of the following: ${fileFormats.join(', ')}`);
    }
  }

  /**
   * Determine the file format based on the text content
   *
   * @param {String} fileText - text contents of the file
   * @return {String} - the format detected (e.g. gff3, gtf, bed, csv, tsv)
   */
  detectFormat(fileText) {
    let detectedFormat;
    // filter lines to remove blank lines and lines with starting with '#'
    const lines = fileText.split('\n').filter((line) => line.trim() !== '' && !line.startsWith('#'));
    const firstLine = lines[0];
    if (fileText.match(/^##gff-version 3/)) {
      detectedFormat = 'gff3';
    } else if (GTFFeatureFile.lineMatches(firstLine)) {
      detectedFormat = 'gtf';
    } else if (BEDFeatureFile.lineMatches(firstLine)) {
      detectedFormat = 'bed';
    } else {
      const separator = CSVFeatureFile.detectSeparator(fileText);
      if (separator === ',') {
        detectedFormat = 'csv';
      } else if (separator === '\t') {
        detectedFormat = 'tsv';
      } else {
        detectedFormat = 'unknown';
      }
    }

    return detectedFormat;
  }

  /**
   * Choose the format to use based on the provided format and the detected format
   * - if a format other than 'auto' is provided, that format will be returned
   *   - however, if the format doesn't match the file, a warning will be logged
   *   - if the provided format is unknown, 'auto' will be used and a warning will be logged
   * @param {String} providedFormat - format given by the user
   * @param {String} detectedFormat - format detected with detectFormat
   * @returns {String} - the chosen format (e.g. gff3, gtf, bed, csv, tsv)
   */
  chooseFormat(providedFormat, detectedFormat) {
    if (FeatureFile.FORMATS.includes(providedFormat) && (providedFormat !== 'auto')) {
      if (providedFormat !== detectedFormat) {
        this._warn(`- Using Provided format '${providedFormat}'; Does not match detected format '${detectedFormat}'`);
      }
      return providedFormat;
    } else {
      // Either they provided an invalide format or 'auto'
      if (detectedFormat === 'unknown') {
        this._fail(`- File Format Unknown: AutoDection Failed. Try explicitly setting the format.`, {errorCode: 'unknown_format'});
      } else if (providedFormat !== 'auto') {
        // Invalid format provided
        this._warn(`- Unknown format '${providedFormat}' -> Using '${detectedFormat}'`);
      }
      return detectedFormat;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTERS
  /////////////////////////////////////////////////////////////////////////////

  // TODO (When we need it)
  toCGViewFeaturesJSON(options={}) {
    // if (this.success) {
    //   options.logger = options.logger || this.logger
    //   const builder = new FeatureBuilder(this, options);
    //   return builder.toJSON();
    // } else {
    //   this.logger.error('*** Cannot convert to CGView Features JSON because parsing failed ***');
    // }
  }

  /**
   * Returns an array of parsed feature records
   */
  get records() {
    return this._records;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Returns a summary object with the following:
   * - inputFormat, featureCount, status
   *
   * The summary is generated by parseSummary()
   */
  get summary() {
    return this._summary;
  }

  /**
   * Add a summary to the logs and creates the summary object
   */
  parseSummary() {
    const records = this.records;

    const format = this.displayFileFormat || this.inputFormat.toUpperCase();

    this.logger.divider();
    this._info('Parsing Summary:');
    this._info(`- Input File Format:`, { padded: format });
    this._info(`- Data Lines:`, { padded: this.lineCount });
    this._info(`- Feature Count:`, { padded: records.length });
    const failedCount = records.filter((record) => !record.valid).length;
    if (failedCount > 0) {
      this._fail(`- Features Failed:`, { padded: failedCount });
    }
    this.logStatusLine();
    this.logger.divider();

    this._summary = {
      inputFormat: this.inputFormat,
      featureCount: records.length,
      status: this.status,
      // success: this.success
    };
  }

  /////////////////////////////////////////////////////////////////////////////
  // DELEGATES
  /////////////////////////////////////////////////////////////////////////////

  /**
   * The delegate for the file format
   */
  get delegate() {
    return this._delegate;
  }

  /**
   * Map of file formats to their respective delegates
   */
  static get formatDelegateMap() {
    return FeatureFile.FILE_FORMAT_DELEGATES;
  }

  /**
   * Returns the file format (e.g. 'gff3', 'bed', 'csv', 'tsv', 'gtf')
   */
  get fileFormat() {
    return this.delegate?.fileFormat || 'unknown';
  }

  /**
   * Returns the display name of the file format (e.g. 'GFF3', 'BED', 'CSV', 'TSV', 'GTF')
   */
  get displayFileFormat() {
    return this.delegate?.displayFileFormat || 'Unknown';
  }

  /**
   * The number of feature lines in the file
   * - This is not the number of records
   * - Some records may be joined together from several lines
   */
  get lineCount() {
    return this.delegate.lineCount;
  }

  /**
   * Parse the file based on the file format (delegate)
   * @param {String} fileText - text to parse
   * @param {Object} options - options for parsing
   * @returns {Array} - an array of records, one for each feature
   */
  parse(fileText, options) {
    return this.delegate.parse(fileText, options);
  }

  /**
   * Validate the records based on the file format (delegate)
   * @param {Array} records - array of records to validate
   * @param {Object} options - options for validation
   */
  validateRecords(records, options) {
      this.delegate.validateRecords(records, options);
  }

  /////////////////////////////////////////////////////////////////////////////
  // PARSE AND VALIDATION WRAPPERS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Wraps the parse method to catch any errors that occur during parsing
   * @param {String} fileText - text to parse
   * @param {Object} options - options for parsing
   * @returns {Array} - an array of records, one for each feature
   */
  parseWrapper(fileText, options={}) {
    let records = [];
    this._info(`Parsing ${this.displayFileFormat} Feature File...`);
    try {
      records = this.parse(fileText, options);

      // Only proceed if passed
      if (!this.passed) {
        return [];
      }

      const recordsWithLocationsCount = records.filter((record) => Array.isArray(record.locations)).length;
      this._info('- Features with >1 location: ', { padded: recordsWithLocationsCount });
      this._info('- Done parsing feature file');
    } catch (error) {
      this._fail('- Failed: An error occurred while parsing the file.', {errorCode: 'parsing'});
      this._fail(`- ERROR: ${error.message}`);
    }
    return records;
  }

  /**
   * Wraps the validateRecords method to catch any errors that occur during validation
   * @param {Array} records - array of records to validate
   * @param {Object} options - options for validation
   */
  validateRecordsWrapper(records, options={}) {
    if (!this.passed) { return; }

    // Line Errors
    const lineErrors = this.validationIssues['lineError'] || [];
    if (lineErrors.length) {
      this._fail('- Line Errors: ', { padded: lineErrors.length });
      this._fail(lineErrors);
    }

    if (!this.passed) { return; }

    this.logger.info(`Validating Records ...`);
    try {
      this.validateRecords(records, options);

      // General Validations
      // - start < stop?
      // - records marked valid

      // No Records
      // console.log(records)
      if (records.length === 0) {
        this._fail('- Failed: No records found in the file.');
      }


      // Common Validations
      // - required keys: start, stops
      for (let record of records) {
        if (!Number.isInteger(record.start)) {
          record.valid = false;
          this.addValidationIssue('missingStart');
        };
        if (!Number.isInteger(record.stop)) {
          record.valid = false;
          this.addValidationIssue('missingStop');
        }
      }

      // Check Issues
      const validationIssues = this.validationIssues;

      // Missing Starts and Stops
      const missingStartErrors = validationIssues['missingStart'] || [];
      if (missingStartErrors.length) {
        this._fail('- Records missing Starts: ', { padded: missingStartErrors.length });
      }
      const missingStopErrors = validationIssues['missingStop'] || [];
      if (missingStopErrors.length) {
        this._fail('- Records missing Stops: ', { padded: missingStopErrors.length });
      }

      if (this.passed) {
        this._info('- Validations Passed', {icon: 'success'});
      } else {
        this._fail('- Validations Failed');
      }
    } catch (error) {
      this._fail('- Failed: An error occurred while validating the records.', {errorCode: 'validating'});
      this._fail(`- ERROR: ${error.message}`);
    }
  }

}

// INPUT:
// - FeatureFile or string of feature file (e.g. GFF3, GTF, BED, CSV) that can be converted to FeatureFile
// OPTIONS (Feature and Qualifier options NIY):
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

class FeatureBuilder extends Status {

  constructor(input, options = {}) {
    // super(options, 'BUILDING FEATURES');
    super(options);
    this.logHeader('BUILDING FEATURES');

    // NOT IMPLEMENTED YET
    // this.includeFeatures = (options.includeFeatures === undefined) ? true : options.includeFeatures;
    // this.excludeFeatures = options.excludeFeatures || ['gene', 'source', 'exon'];
    // this.includeQualifiers = options.includeQualifiers || false;
    // this.excludeQualifiers = options.excludeQualifiers || [];

    this.featureFile = this._parseInput(input);
    this.inputDisplayFormat = this.featureFile.displayFileFormat;
    if (this.featureFile.passed) {
      this._json = this._build(this.featureFile.records);
    } else {
      this._fail('*** Cannot convert to CGView Feature JSON because feature file parsing failed ***');
    }
  }

  toJSON() {
    return this._json;
  }

  _parseInput(input) {
    // console.log("Parse input")
    if (typeof input === "string") {
      return new FeatureFile(input, {logger: this.logger});
    } else if (input instanceof FeatureFile) {
      return input;
    } else {
      this._fail("Invalid input: must be a string (from GFF3, GTF, BED, CSV) or FeatureFile object");
    }
  }

  _build(records) {
    const features = [];
    this._skippedFeaturesByType = {};
    this._complexFeatures = [];
    this._skippedLocationlessFeatures = [];
    // this.logger.info(`Date: ${new Date().toUTCString()}`);
    this.logger.info('FeatureBuilder: ', { padded: this.version });
    this.logger.info(`Converting to CGView Feature JSON...`);
    this.logger.info('- Input File Format: ', { padded: (this.inputDisplayFormat || 'Unknown') });
    this.logger.info('- Input Feature Count: ', { padded: records.length });
    // Check for records
    if (!records || records.length < 1) {
      this._fail("Conversion Failed: No feature records provided");
      return;
    }

    // this._summarizeSkippedFeatures()
    // this._adjustFeatureGeneticCode(json)
    // this._qualifiersSetup();
    // if (this._complexFeatures.length > 0) {
    //   this.logger.info(`- Complex Features Found: ${this._complexFeatures.length.toLocaleString()}`);
    // }

    for (const record of records) {
      const feature = this._buildFeature(record);
      if (feature) {
        features.push(feature);
      }
    }
    this._adjustFeatureContigNames(features);
    this._buildSummary(features);
    return features;
  }

  _buildFeature(record) {
    const feature = {};

    if (record.name) { feature.name = record.name; }
    feature.contig = record.contig;
    feature.start = record.start;
    feature.stop = record.stop;
    feature.strand = ["-1", "-", -1].includes(record.strand) ? -1 : 1;
    feature.type = record.type;

    if (!isNaN(Number(record.score))) {
      feature.score = Number(record.score);
    }
    if (record.source) {
      feature.source = record.source;
    }
    // TODO: CODON
    // if (record.frame) {
    //   feature.frame = record.frame;
    // }
    if (record.qualifiers) {
      feature.qualifiers = record.qualifiers;
    }
    if (record.locations) {
      feature.locations = record.locations;
    }
    return feature;
  }

  _buildSummary(features) {
    this.logger.divider();
    this.logger.info('CGView Feature JSON Summary:');
    this.logger.info(`- Feature Count: `, { padded: features.length });
    // this.logger.info(`- Features Included: `, { padded: features.length });
    // this.logger.info(`- Features Skipped: `, { padded: features.length });
    this.logStatusLine();
    this.logger.divider();
  }

  // Adjust contig names:
  // - replace nonstandard characters with underscores
  // - length of contig names should be less than 37 characters
  _adjustFeatureContigNames(features) {
    this.logger.info('- Checking feature contig names...');
    const contigNames = features.map((feature) => feature.contig);
    const uniqueContigNames = [...new Set(contigNames)];
    if (uniqueContigNames.length === 1 && uniqueContigNames[0] === undefined) {
      this.logger.info('- No contig names found');
      return;
    }
    const adjustedContigNameResults = CGViewBuilder.adjustContigNames(uniqueContigNames);
    const contigNameMap = {};
    adjustedContigNameResults.reasons.forEach((reason) => {
      contigNameMap[reason.origName] = reason.newName;
    });

    const messages = [];
    let featuresChangedCount = 0;
    if (adjustedContigNameResults.reasons.length > 0) {
      // Update Feature contigs
      for (const feature of features) {
        if (contigNameMap[feature.contig]) {
          feature.contig = contigNameMap[feature.contig];
          featuresChangedCount++;
        }
      }
      // Log details
      this.logger.warn(`The following contig names (${adjustedContigNameResults.reasons.length}) were adjusted:`);
      // Note: Not looking for duplicates (so removed from Reasons)
      this.logger.warn(`Reasons: LONG (>34), REPLACE (nonstandard characters), BLANK (empty)`);
      for (const reason of adjustedContigNameResults.reasons) {
        messages.push(`- ${reason.origName} -> ${reason.newName} (${reason.reason.join(', ')})`);
      }
      this._warn(messages);
      this._warn(`- Features with adjusted contig names: ${featuresChangedCount}`);
    }
  }


}

const CGParse = {};
CGParse.version = CGPARSE_VERSION;
CGParse.Logger = Logger;
CGParse.helpers = helpers;
CGParse.SequenceFile = SequenceFile$1;
CGParse.CGViewBuilder = CGViewBuilder;
CGParse.FeatureFile = FeatureFile;
CGParse.FeatureBuilder = FeatureBuilder;
CGParse.CSVFeatureFile = CSVFeatureFile;

// Teselagen (For development only; Useful for comparison):
// This should be removed for production
// import { genbankToJson as genbankToTeselagen} from "@teselagen/bio-parsers";
// CGViewParse.genbankToTeselagen = genbankToTeselagen;
// import { anyToJson as anyToTeselagen} from "@teselagen/bio-parsers";
// CGVParse.anyToTeselagen = anyToTeselagen;

export { CGParse as default };
