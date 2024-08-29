import { version } from '../../package.json';
// ----------------------------------------------------------------------------
// CGPARSE HELPERS
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

export const CGPARSE_VERSION = version;

// All GenBank/EMBL Feature Types
export const FEATURE_TYPES = ["assembly_gap", "C_region", "CDS", "centromere", "D-loop", "D_segment", "exon", "gap", "gene", "iDNA", "intron", "J_segment", "mat_peptide", "misc_binding", "misc_difference", "misc_feature", "misc_recomb", "misc_RNA", "misc_structure", "mobile_element", "modified_base", "mRNA", "ncRNA", "N_region", "old_sequence", "operon", "oriT", "polyA_site", "precursor_RNA", "prim_transcript", "primer_bind", "propeptide", "protein_bind", "regulatory", "repeat_region", "rep_origin", "rRNA", "S_region", "sig_peptide", "source", "stem_loop", "STS", "telomere", "tmRNA", "transit_peptide", "tRNA", "unsure", "V_region", "V_segment", "variation", "3'UTR", "5'UTR"];

// All GenBank/EMBL Qualifiers
export const QUALIFIERS = [ "allele", "altitude", "anticodon", "artificial_location", "bio_material", "bound_moiety", "cell_line", "cell_type", "chromosome", "circular_RNA", "citation", "clone", "clone_lib", "codon_start", "collected_by", "collection_date", "compare", "country", "cultivar", "culture_collection", "db_xref", "dev_stage", "direction", "EC_number", "ecotype", "environmental_sample", "estimated_length", "exception", "experiment", "focus", "frequency", "function", "gap_type", "gene", "gene_synonym", "germline", "haplogroup", "haplotype", "host", "identified_by", "inference", "isolate", "isolation_source", "lab_host", "lat_lon", "linkage_evidence", "locus_tag", "macronuclear", "map", "mating_type", "metagenome_source", "mobile_element_type", "mod_base", "mol_type", "ncRNA_class", "note", "number", "old_locus_tag", "operon", "organelle", "organism", "partial", "PCR_conditions", "PCR_primers", "phenotype", "plasmid", "pop_variant", "product", "protein_id", "proviral", "pseudo", "pseudogene", "rearranged", "ination_class", "tory_class", "replace", "ribosomal_slippage", "rpt_family", "rpt_type", "rpt_unit_range", "rpt_unit_seq", "satellite", "segment", "serotype", "serovar", "sex", "specimen_voucher", "standard_name", "strain", "sub_clone", "submitter_seqid", "sub_species", "sub_strain", "tag_peptide", "tissue_lib", "tissue_type", "transgenic", "translation", "transl_except", "transl_table", "trans_splicing", "type_material", "variety"];

// Sequence Ontology Terms (add more as needed)
export const SO_TERMS = {
  "SO:0000704": "gene",
  "SO:0000234": "mRNA",
  "SO:0000147": "exon",
  "SO:0000316": "CDS",
  "SO:0000188": "intron",
  "SO:0000610": "polyA_sequence",
  "SO:0000553": "polyA_site",
  "SO:0000204": "five_prime_UTR",
  "SO:0000205": "three_prime_UTR",
}

// ----------------------------------------------------------------------------
// FORMATTING
// ----------------------------------------------------------------------------

export function removeWhiteSpace(string) {
  return string.replace(/\s+/g, "");
}

export function removeDigits(string) {
  return string.replace(/\d+/g, "");
}

export function removeNewlines(string) {
  return string.replace(/[\n\r]+/g, "");
}

export function convertLineEndingsToLF(text) {
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
export function uniqueName(name, allNames) {
  if (allNames.includes(name)) {
    return uniqueId(`${name}-`, 2, allNames);
  } else {
    return name;
  }
};

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
export function uniqueId(idBase, start, currentIds) {
  let id;
  do {
    id = idBase + start;
    start++;
  } while (currentIds.indexOf(id) > -1);
  return id;
};

// ChatGPT special
// Uses Heuristic to determine binary vs text
export function isBinary(text) {
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
export function getLines(text, options={}) {
  const lines = text.split(/\r\n|\r|\n/);
  // Filter out comments and empty lines
  const filteredLines = lines.filter(line => !line.startsWith('#') && line.trim() !== '');
  // return the first maxLines or all lines
  return options.maxLines ? filteredLines.slice(0, options.maxLines) : filteredLines;
}

// ----------------------------------------------------------------------------
// SEQUENCE METHODS
// ----------------------------------------------------------------------------

// Basic testing shows that Method #2 is faster
// Using E.Coli PA2 as a test case:
// Times are for full parsing of the file
// Method #1: ~500ms
// Method #2: ~420ms
export function reverse(string) {
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
export function complement(dna) {
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
  export function determineSeqMolType(sequence) {
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
  export function findNonIUPACCharacters(seq, type) {
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
export function countCharactersInSequence(sequence, characters) {
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

