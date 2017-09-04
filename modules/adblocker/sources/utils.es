
export function packInt32(int) {
  /* eslint-disable no-bitwise */
  return String.fromCharCode(int & 65535) + String.fromCharCode(int >>> 16);
}


export function unpackInt32(str) {
  /* eslint-disable no-bitwise */
  return (str.charCodeAt(0) | (str.charCodeAt(1) << 16));
}


/**
 * Fast string hashing (*not cryptographic* and *not secure*), used to get ids
 * of filters. This should return only positive numbers.
 *
 * From: https://stackoverflow.com/a/41753979
 */
export function fastHash(str) {
  /* eslint-disable no-bitwise */

  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  // For higher values, we cannot pack/unpack
  return (hash >>> 0) % 2147483648;
}


// https://jsperf.com/string-startswith/21
export function fastStartsWith(haystack, needle) {
  if (haystack.length < needle.length) { return false; }

  const ceil = needle.length;
  for (let i = 0; i < ceil; i += 1) {
    if (haystack[i] !== needle[i]) return false;
  }

  return true;
}


export function fastStartsWithFrom(haystack, needle, start) {
  if ((haystack.length - start) < needle.length) { return false; }

  const ceil = start + needle.length;
  for (let i = start; i < ceil; i += 1) {
    if (haystack[i] !== needle[i - start]) return false;
  }

  return true;
}


// const COSMETIC_SPLIT_RE = /[#.\w_-]{2,}/g;
// export function tokenizeCSS(selector) {
//   return selector.match(COSMETIC_SPLIT_RE) || [];
// }


// const TOKENIZE_RE = /[a-zA-Z0-9](?![*])/g;
// export function tokenize(pattern) {
//   return pattern.match(TOKENIZE_RE) || [];
// }


// Efficient manuel lexer
function isDigit(ch) {
  // 48 == '0'
  // 57 == '9'
  return ch >= 48 & ch <= 57;
}


function isAlpha(ch) {
  /* eslint-disable no-param-reassign */
  // Force to upper-case
  ch &= ~32;
  // 65 == 'A'
  // 90 == 'Z'
  return ch >= 65 && ch <= 90;
}


function isAllowed(ch) {
  return isDigit(ch) || isAlpha(ch);
}


function isAllowedCSS(ch) {
  return (
    isDigit(ch) ||
    isAlpha(ch) ||
    ch === 95 || // '_' (underscore)
    ch === 45 || // '-' (dash)
    ch === 46 || // '.' (dot)
    ch === 35    // '#' (sharp)
  );
}


function fastTokenizer(pattern, isAllowedCode, allowRegexSurround = false) {
  const tokens = [];
  let hash = 5381;
  let inside = false;

  for (let i = 0, len = pattern.length; i < len; i += 1) {
    const ch = pattern.charCodeAt(i);
    if (isAllowedCode(ch)) {
      hash = (hash * 33) ^ ch;
      inside = true;
    } else if (inside) {
      inside = false;
      // Should not be followed by '*'
      if (allowRegexSurround || ch !== 42) {
        tokens.push(packInt32((hash >>> 0) % 2147483648));
      }
      hash = 5381;
    }
  }

  if (inside) {
    tokens.push(packInt32((hash >>> 0) % 2147483648));
  }

  return tokens;
}


export function tokenize(pattern) {
  return fastTokenizer(pattern, isAllowed);
}


export function tokenizeCSS(pattern) {
  return fastTokenizer(pattern, isAllowedCSS, true);
}
