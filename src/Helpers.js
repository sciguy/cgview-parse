export function removeWhiteSpace(string) {
  return string.replace(/\s+/g, "");
}

export function removeDigits(string) {
  return string.replace(/\d+/g, "");
}

export function removeNewlines(string) {
  return string.replace(/[\n\r]+/g, "");
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

export function isASCII(text) {
  return /^[\x00-\x7F]*$/.test(text);
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

