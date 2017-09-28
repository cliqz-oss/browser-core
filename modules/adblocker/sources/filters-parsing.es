/* eslint-disable no-bitwise */
/* eslint-disable key-spacing */
/* eslint-disable no-multi-spaces */

import logger from './logger';
import { tokenize
       , tokenizeCSS
       , fastHash
       , fastStartsWith
       , fastStartsWithFrom
       , packInt32
       , unpackInt32 } from './utils';


// Notes regarding performance:
//
// * At the moment, V8 will deoptimize functions in which a compound is made.
// eg: myVar += 1
// The performance would be better with: myVar = myVar + 1
//
// * We tried to make everything monomorphic (a variable always holds values of
// the same type, a function always takes arguments of the same type, etc.),
// which is important to let the JIT optimize and specialize the code.
//
// * 17% of the time is spent in parseNetworkFilter.
//
// * 22% of the time is spent in String.startsWith
// * 18% of the time is spent in String.split
// * 15% of the time is spent in String.indexOf
// * 11% of the time is spent in String.toLowerCase
// * 5% of the time is spent in string equality


/* **************************************************************************
 *  Bitwise helpers
 * **************************************************************************/


function getBit(n, mask) {
  return !!(n & mask);
}


function setBit(n, mask) {
  return n | mask;
}


function clearBit(n, mask) {
  return n & ~mask;
}


/**
 * Masks used to store options of cosmetic filters in a bitmask.
 */
const COSMETICS_MASK = {
  unhide:               1 << 0,
  scriptInject:         1 << 1,
  scriptBlock:          1 << 2,
};


/**
 * Masks used to store options of network filters in a bitmask.
 */
const NETWORK_FILTER_MASK = {
  // Content Policy Type
  fromImage:            1 << 0,
  fromMedia:            1 << 1,
  fromObject:           1 << 2,
  fromObjectSubrequest: 1 << 3,
  fromOther:            1 << 4,
  fromPing:             1 << 5,
  fromScript:           1 << 6,
  fromStylesheet:       1 << 7,
  fromSubdocument:      1 << 8,
  fromWebsocket:        1 << 9,
  fromXmlHttpRequest:   1 << 10,
  isImportant:          1 << 11,
  matchCase:            1 << 12,

  // Kind of patterns
  thirdParty:           1 << 13,
  firstParty:           1 << 14,
  isHostname:           1 << 15,
  isPlain:              1 << 16,
  isRegex:              1 << 17,
  isLeftAnchor:         1 << 18,
  isRightAnchor:        1 << 19,
  isHostnameAnchor:     1 << 20,
  isException:          1 << 21,
};


/**
 * Mask used when a network filter can be applied on any content type.
 */
const FROM_ANY = (
    NETWORK_FILTER_MASK.fromImage
  | NETWORK_FILTER_MASK.fromMedia
  | NETWORK_FILTER_MASK.fromObject
  | NETWORK_FILTER_MASK.fromObjectSubrequest
  | NETWORK_FILTER_MASK.fromOther
  | NETWORK_FILTER_MASK.fromPing
  | NETWORK_FILTER_MASK.fromScript
  | NETWORK_FILTER_MASK.fromStylesheet
  | NETWORK_FILTER_MASK.fromSubdocument
  | NETWORK_FILTER_MASK.fromWebsocket
  | NETWORK_FILTER_MASK.fromXmlHttpRequest
);


/**
 * Map content type value to mask the corresponding mask.
 * ref: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIContentPolicy
 */
// TODO: Handle `font` = 14 (only one filter with this cpt option)
const CPT_TO_MASK = {
  1:  NETWORK_FILTER_MASK.fromOther,
  2:  NETWORK_FILTER_MASK.fromScript,
  3:  NETWORK_FILTER_MASK.fromImage,
  4:  NETWORK_FILTER_MASK.fromStylesheet,
  5:  NETWORK_FILTER_MASK.fromObject,
  7:  NETWORK_FILTER_MASK.fromSubdocument,
  10: NETWORK_FILTER_MASK.fromPing,
  11: NETWORK_FILTER_MASK.fromXmlHttpRequest,
  12: NETWORK_FILTER_MASK.fromObjectSubrequest,
  15: NETWORK_FILTER_MASK.fromMedia,
  16: NETWORK_FILTER_MASK.fromWebsocket,
  21: NETWORK_FILTER_MASK.fromImage, // TYPE_IMAGESET
};


/* **************************************************************************
 *  Cosmetic filters parsing
 * **************************************************************************/


const SEPARATOR = /[/^*]/;


export class CosmeticFilter {
  constructor(mask, selector, hostnames, id) {
    this.id = id;
    this.mask = mask;
    this.selector = selector;
    this.hostnames = hostnames;

    // Lazily set when needed
    this.scriptArguments = null;
    this.scriptReplaced = false;
    this.hostnamesArray = null;
    this.rawLine = null;
  }

  isCosmeticFilter() { return true; }
  isNetworkFilter() { return false; }

  /**
   * Given an object returned by the `serialize` method, re-create an instance
   * of the CosmeticFilter class, using the same values.
   */
  static deserialize(serialized) {
    const [selector, hostnames] = serialized.substr(4).split('|');
    const mask = unpackInt32(serialized);
    const id = serialized.substr(2, 2);

    return new CosmeticFilter(
      mask,
      selector,
      hostnames,
      id,
    );
  }

  /**
   * Creates a more compact representation of this filter, as an object.
   */
  serialize() {
    /* eslint-disable prefer-template */
    return (
      packInt32(this.mask)
      + this.id
      + this.selector
      + '|' + this.hostnames
    );
  }

  /**
   * Create a more human-readable version of this filter. It is mainly used for
   * debugging purpose, as it will expand the values stored in the bit mask.
   */
  pprint() {
    return {
      id: this.id,
      selector: this.selector,
      hostnames: this.hostnames,
      unhide: this.isUnhide(),
      scriptInject: this.isScriptInject(),
      scriptBlock: this.isScriptBlock(),
    };
  }

  getTokensSelector() {
    if (this.isScriptInject() || this.isScriptBlock()) {
      return [];
    }

    // Only keep the part after the last '>'
    const sepIndex = this.selector.lastIndexOf('>');
    if (sepIndex !== -1) {
      return tokenizeCSS(this.selector.substr(sepIndex));
    }

    return tokenizeCSS(this.selector);
  }

  getSelector() {
    return this.selector;
  }

  hasHostnames() {
    return !!this.hostnames;
  }

  getHostnames() {
    if (this.hostnamesArray === null) {
      // Sort them from longer hostname to shorter.
      // This is to make sure that we will always start by the most specific
      // when matching.
      this.hostnamesArray = this.hostnames.split(',').sort((h1, h2) => {
        if (h1.length > h2.length) {
          return -1;
        } else if (h1.length < h2.length) {
          return 1;
        }

        return 0;
      });
    }

    return this.hostnamesArray;
  }

  isUnhide() {
    return getBit(this.mask, COSMETICS_MASK.unhide);
  }

  isScriptInject() {
    return getBit(this.mask, COSMETICS_MASK.scriptInject);
  }

  isScriptBlock() {
    return getBit(this.mask, COSMETICS_MASK.scriptBlock);
  }
}


/**
 * Given a line that we know contains a cosmetic filter, create a CosmeticFiler
 * instance out of it. This function should be *very* efficient, as it will be
 * used to parse tens of thousands of lines.
 */
function parseCosmeticFilter(line, sharpIndex) {
  const id = packInt32(fastHash(line));

  // Mask to store attributes
  // Each flag (unhide, scriptInject, etc.) takes only 1 bit
  // at a specific offset defined in COSMETICS_MASK.
  // cf: COSMETICS_MASK for the offset of each property
  let mask = 0;
  let selector = '';
  // Coma-separated list of hostnames
  let hostnames = '';

  // Start parsing the line
  const afterSharpIndex = sharpIndex + 1;
  let suffixStartIndex = afterSharpIndex + 1;

  // hostname1,hostname2#@#.selector
  //                    ^^ ^
  //                    || |
  //                    || suffixStartIndex
  //                    |afterSharpIndex
  //                    sharpIndex

  // Check if unhide
  if (line[afterSharpIndex] === '@') {
    mask = setBit(mask, COSMETICS_MASK.unhide);
    suffixStartIndex += 1;
  }

  // Parse hostnames
  if (sharpIndex > 0) {
    hostnames = line.substring(0, sharpIndex);
  }

  // Parse selector
  // TODO - avoid the double call to substring
  selector = line.substr(suffixStartIndex);

  // Deal with script:inject and script:contains
  if (fastStartsWith(selector, 'script:')) {
    //      script:inject(.......)
    //                    ^      ^
    //   script:contains(/......./)
    //                    ^      ^
    //    script:contains(selector[, args])
    //           ^        ^               ^^
    //           |        |          |    ||
    //           |        |          |    |selector.length
    //           |        |          |    scriptSelectorIndexEnd
    //           |        |          |scriptArguments
    //           |        scriptSelectorIndexStart
    //           scriptMethodIndex
    const scriptMethodIndex = 'script:'.length;
    let scriptSelectorIndexStart = scriptMethodIndex;
    let scriptSelectorIndexEnd = selector.length - 1;

    if (fastStartsWithFrom(selector, 'inject(', scriptMethodIndex)) {
      mask = setBit(mask, COSMETICS_MASK.scriptInject);
      scriptSelectorIndexStart += 'inject('.length;
    } else if (fastStartsWithFrom(selector, 'contains(', scriptMethodIndex)) {
      mask = setBit(mask, COSMETICS_MASK.scriptBlock);
      scriptSelectorIndexStart += 'contains('.length;

      // If it's a regex
      if (selector[scriptSelectorIndexStart] === '/'
          && selector[scriptSelectorIndexEnd - 1] === '/') {
        scriptSelectorIndexStart += 1;
        scriptSelectorIndexEnd -= 1;
      }
    }

    selector = selector.substring(scriptSelectorIndexStart, scriptSelectorIndexEnd);
  }

  // Exceptions
  if (selector === null ||
      selector.length === 0 ||
      selector.endsWith('}') ||
      selector.indexOf('##') !== -1 ||
      (getBit(mask, COSMETICS_MASK.unhide) && hostnames.length === 0)) {
    return null;
  }

  return new CosmeticFilter(mask, selector, hostnames, id);
}


/* **************************************************************************
 *  Network filters parsing
 * **************************************************************************/


/**
 * Compiles a filter pattern to a regex. This is only performed *lazily* for
 * filters containing at least a * or ^ symbol. Because Regexes are expansive,
 * we try to convert some patterns to plain filters.
 */
function compileRegex(filterStr, isRightAnchor, isLeftAnchor, matchCase) {
  let filter = filterStr;

  // Escape special regex characters: |.$+?{}()[]\
  filter = filter.replace(/([|.$+?{}()[\]\\])/g, '\\$1');

  // * can match anything
  filter = filter.replace(/\*/g, '.*');
  // ^ can match any separator or the end of the pattern
  filter = filter.replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');

  // Should match end of url
  if (isRightAnchor) {
    filter = `${filter}$`;
  }

  if (isLeftAnchor) {
    filter = `^${filter}`;
  }

  try {
    if (matchCase) {
      return new RegExp(filter);
    }
    return new RegExp(filter, 'i');
  } catch (ex) {
    logger.error(`failed to compile regex ${filter} with error ${ex} ${ex.stack}`);
    // Regex will always fail
    return { test() { return false; } };
  }
}


// TODO:
// 1. Options not supported yet:
//  - popup
//  - popunder
//  - generichide
//  - genericblock
export class NetworkFilter {
  constructor(mask, filter, optDomains, optNotDomains, redirect, hostname, id) {
    this.id = id;

    // Makes sure each field has a proper default value
    this.mask = mask                   || 0;
    this.filter = filter               || '';
    this.optDomains = optDomains       || '';
    this.optNotDomains = optNotDomains || '';
    this.redirect = redirect           || '';
    this.hostname = hostname           || '';

    // Lazy attributes
    this.regex = null;
    this.optDomainsSet = null;
    this.optNotDomainsSet = null;
    this.tokens = null;
    this.rawLine = null; // Set only in debug mode
  }

  isCosmeticFilter() { return false; }
  isNetworkFilter() { return true; }

  /**
   * Create a NetworkFilter instance from the compact representation given by
   * the serialize() method. It also takes care of giving a default value of the
   * right type to each optional field.
   */
  static deserialize(serialized) {
    const [
      filter,
      hostname,
      optDomains,
      optNotDomains,
      redirect
    ] = serialized.substr(4).split('`');
    const mask = unpackInt32(serialized);
    const id = serialized.substr(2, 2);

    return new NetworkFilter(
      mask,
      filter,
      optDomains,
      optNotDomains,
      redirect,
      hostname,
      id,
    );
  }

  /**
   * Creates a more compact representation of the network filter. All attributes
   * with no value (eg: redirect) are defaulted to undefined and will be omitted
   * from the serialized version of the filter.
   */
  serialize() {
    /* eslint-disable prefer-template */
    return (
      packInt32(this.mask)
      + this.id
      + this.filter
      + '`' + this.hostname
      + '`' + this.optDomains
      + '`' + this.optNotDomains
      + '`' + this.redirect
    );
  }

  /**
   * Creates a human-readable representation of the this.
   */
  pprint() {
    let filter = '';

    if (this.isException()) { filter += '@@'; }
    if (this.isHostnameAnchor()) { filter += '||'; }
    if (this.isLeftAnchor()) { filter += '|'; }

    if (!this.isRegex()) {
      if (this.hasHostname()) {
        filter += this.getHostname();
        filter += '^';
      }
      filter += this.getFilter();
    } else {
      // Visualize the compiled regex
      filter += this.getRegex().source;
    }

    // Options
    const options = [];

    if (!this.fromAny()) {
      if (this.fromImage()) { options.push('image'); }
      if (this.fromMedia()) { options.push('media'); }
      if (this.fromObject()) { options.push('object'); }
      if (this.fromObjectSubrequest()) { options.push('object-subrequest'); }
      if (this.fromOther()) { options.push('other'); }
      if (this.fromPing()) { options.push('ping'); }
      if (this.fromScript()) { options.push('script'); }
      if (this.fromStylesheet()) { options.push('stylesheet'); }
      if (this.fromSubdocument()) { options.push('subdocument'); }
      if (this.fromWebsocket()) { options.push('websocket'); }
      if (this.fromXmlHttpRequest()) { options.push('xmlhttprequest'); }
    }

    if (this.isImportant()) { options.push('important'); }
    if (this.redirect) { options.push(`redirect=${this.redirect}`); }
    if (this.firstParty() !== this.thirdParty()) {
      if (this.firstParty()) { options.push('first-party'); }
      if (this.thirdParty()) { options.push('third-party'); }
    }

    if (this.hasOptDomains() || this.hasOptNotDomains()) {
      const domains = [];
      this.getOptDomains().forEach(d => domains.push(d));
      this.getOptNotDomains().forEach(nd => domains.push(`~${nd}`));
      options.push(`domain=${domains.join('|')}`);
    }

    if (options.length > 0) {
      filter += `$${options.join(',')}`;
    }

    if (this.isRightAnchor()) { filter += '|'; }

    return filter;
  }

  getTokens() {
    return tokenize(this.getFilter()).concat(tokenize(this.getHostname()));
  }

  hasOptDomains() { return !!this.optDomains; }

  getOptNotDomains() {
    if (this.optNotDomainsSet === null) {
      if (this.optNotDomains) {
        this.optNotDomainsSet = new Set(this.optNotDomains.split('|'));
      } else {
        this.optNotDomainsSet = new Set();
      }
    }

    return this.optNotDomainsSet;
  }

  hasOptNotDomains() { return !!this.optNotDomains; }

  getOptDomains() {
    if (this.optDomainsSet === null) {
      if (this.optDomains) {
        this.optDomainsSet = new Set(this.optDomains.split('|'));
      } else {
        this.optDomainsSet = new Set();
      }
    }

    return this.optDomainsSet;
  }

  getMask() {
    return this.mask;
  }

  isRedirect() {
    return !!this.redirect;
  }

  getRedirect() {
    return this.redirect;
  }

  hasHostname() {
    return !!this.hostname;
  }

  getHostname() {
    return this.hostname;
  }

  getFilter() {
    return this.filter;
  }

  /**
   * Special method, should only be used by the filter optimizer
   */
  setRegex(re) {
    this.regex = re;
    this.mask = setBit(this.mask, NETWORK_FILTER_MASK.isRegex);
    this.mask = clearBit(this.mask, NETWORK_FILTER_MASK.isPlain);
  }

  getRegex() {
    if (this.regex === null) {
      this.regex = compileRegex(
        this.filter,
        this.isRightAnchor(),
        this.isLeftAnchor(),
        this.matchCase(),
      );
    }

    return this.regex;
  }

  /**
   * Check if this filter should apply to a request with this content type.
   */
  isCptAllowed(cpt) {
    const mask = CPT_TO_MASK[cpt];
    if (mask !== undefined) {
      return getBit(this.mask, mask);
    }

    return false;
  }

  isException() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isException);
  }

  isHostnameAnchor() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isHostnameAnchor);
  }

  isRightAnchor() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isRightAnchor);
  }

  isLeftAnchor() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isLeftAnchor);
  }

  matchCase() {
    return getBit(this.mask, NETWORK_FILTER_MASK.matchCase);
  }

  isImportant() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isImportant);
  }

  isRegex() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isRegex);
  }

  isPlain() {
    return !getBit(this.mask, NETWORK_FILTER_MASK.isRegex);
  }

  isHostname() {
    return getBit(this.mask, NETWORK_FILTER_MASK.isHostname);
  }

  fromAny() {
    return (this.mask & FROM_ANY) === FROM_ANY;
  }

  thirdParty() {
    return getBit(this.mask, NETWORK_FILTER_MASK.thirdParty);
  }

  firstParty() {
    return getBit(this.mask, NETWORK_FILTER_MASK.firstParty);
  }

  fromImage() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromImage);
  }

  fromMedia() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromMedia);
  }

  fromObject() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromObject);
  }

  fromObjectSubrequest() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromObjectSubrequest);
  }

  fromOther() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromOther);
  }

  fromPing() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromPing);
  }

  fromScript() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromScript);
  }

  fromStylesheet() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromStylesheet);
  }

  fromSubdocument() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromSubdocument);
  }

  fromWebsocket() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromWebsocket);
  }

  fromXmlHttpRequest() {
    return getBit(this.mask, NETWORK_FILTER_MASK.fromXmlHttpRequest);
  }
}


// ---------------------------------------------------------------------------
// Filter parsing
// ---------------------------------------------------------------------------


function setNetworkMask(mask, m, value) {
  if (value) {
    return setBit(mask, m);
  }

  return clearBit(mask, m);
}


/**
 * Check if the sub-string contained between the indices start and end is a
 * regex filter (it contains a '*' or '^' char). Here we are limited by the
 * capability of javascript to check the presence of a pattern between two
 * indices (same for Regex...).
 * // TODO - we could use sticky regex here
 */
function checkIsRegex(filter, start, end) {
  const starIndex = filter.indexOf('*', start);
  const separatorIndex = filter.indexOf('^', start);
  return ((starIndex !== -1 && starIndex < end) ||
          (separatorIndex !== -1 && separatorIndex < end));
}


/**
 * Parse a line containing a network filter into a NetworkFilter object.
 * This must be *very* efficient.
 */
function parseNetworkFilter(rawLine) {
  let line = rawLine;
  // Compute id of the filter
  const id = packInt32(fastHash(line));

  // Transform |http:// to |http:
  // Transform |https:// to |https:
  // Transform |ws:// to |http:
  // Transform |wss:// to |https:
  if (fastStartsWith(line, '|http://')) {
    line = line.replace('|http://', '|http:');
  } else if (fastStartsWith(line, '|https://')) {
    line = line.replace('|https://', '|https:');
  } else if (fastStartsWith(line, '|ws://')) {
    line = line.replace('|ws://', '|http:');
  } else if (fastStartsWith(line, '|wss://')) {
    line = line.replace('|wss://', '|https:');
  }


  // Represent options as a bitmask
  let mask = NETWORK_FILTER_MASK.thirdParty | NETWORK_FILTER_MASK.firstParty;

  // Get rid of those and just return `null` when possible
  let filter = null;
  let optDomains = '';
  let optNotDomains = '';
  let redirect = null;
  let hostname = null;

  // Check if this filter had at least one option constraining the acceptable
  // content policy type. If this remains false, then the filter will have the
  // value of FROM_ANY and will be applied on any request.
  let hasCptOption = false;

  // Start parsing
  let filterIndexStart = 0;
  let filterIndexEnd = line.length;

  // @@filter == Exception
  if (fastStartsWith(line, '@@')) {
    filterIndexStart += 2;
    mask = setBit(mask, NETWORK_FILTER_MASK.isException);
  }

  // filter$options == Options
  // ^     ^
  // |     |
  // |     optionsIndex
  // filterIndexStart
  const optionsIndex = line.indexOf('$', filterIndexStart);
  if (optionsIndex !== -1) {
    // Parse options and set flags
    filterIndexEnd = optionsIndex;

    // --------------------------------------------------------------------- //
    // parseOptions
    // TODO: This could be implemented without string copy,
    // using indices, like in main parsing functions.
    const rawOptions = line.substr(optionsIndex + 1);
    const options = rawOptions.split(',');
    for (let i = 0; i < options.length; i += 1) {
      const rawOption = options[i];
      let negation = false;
      let option = rawOption;

      // Check for negation: ~option
      if (fastStartsWith(option, '~')) {
        negation = true;
        option = option.substr(1);
      } else {
        negation = false;
      }

      // Check for options: option=value1|value2
      let optionValues = [];
      if (option.indexOf('=') !== -1) {
        const optionAndValues = option.split('=', 2);
        option = optionAndValues[0];
        optionValues = optionAndValues[1].split('|');
      }

      switch (option) {
        case 'domain': {
          const optDomainsArray = [];
          const optNotDomainsArray = [];

          for (let j = 0; j < optionValues.length; j += 1) {
            const value = optionValues[j];
            if (value) {
              if (fastStartsWith(value, '~')) {
                optNotDomainsArray.push(value.substr(1));
              } else {
                optDomainsArray.push(value);
              }
            }
          }

          if (optDomainsArray.length > 0) {
            optDomains = optDomainsArray.join('|');
          }

          if (optNotDomainsArray.length > 0) {
            optNotDomains = optNotDomainsArray.join('|');
          }

          break;
        }
        case 'image':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromImage, !negation);
          break;
        case 'media':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromMedia, !negation);
          break;
        case 'object':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromObject, !negation);
          break;
        case 'object-subrequest':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromObjectSubrequest, !negation);
          break;
        case 'other':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromOther, !negation);
          break;
        case 'ping':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromPing, !negation);
          break;
        case 'script':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromScript, !negation);
          break;
        case 'stylesheet':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromStylesheet, !negation);
          break;
        case 'subdocument':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromSubdocument, !negation);
          break;
        case 'xmlhttprequest':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromXmlHttpRequest, !negation);
          break;
        case 'websocket':
          hasCptOption = true;
          mask = setNetworkMask(mask, NETWORK_FILTER_MASK.fromWebsocket, !negation);
          break;
        case 'important':
          // Note: `negation` should always be `false` here.
          if (negation) {
            return null;
          }

          mask = setBit(mask, NETWORK_FILTER_MASK.isImportant);
          break;
        case 'match-case':
          // Note: `negation` should always be `false` here.
          if (negation) {
            return null;
          }

          mask = setBit(mask, NETWORK_FILTER_MASK.matchCase);
          break;
        case 'third-party':
          if (negation) {
            // ~third-party means we should clear the flag
            mask = clearBit(mask, NETWORK_FILTER_MASK.thirdParty);
          } else {
            // third-party means ~first-party
            mask = clearBit(mask, NETWORK_FILTER_MASK.firstParty);
          }
          break;
        case 'first-party':
          if (negation) {
            // ~first-party means we should clear the flag
            mask = clearBit(mask, NETWORK_FILTER_MASK.firstParty);
          } else {
            // first-party means ~third-party
            mask = clearBit(mask, NETWORK_FILTER_MASK.thirdParty);
          }
          break;
        case 'collapse':
          break;
        case 'redirect':
          // Negation of redirection doesn't make sense
          if (negation) {
            return null;
          }

          // Ignore this filter if no redirection resource is specified
          if (optionValues.length === 0) {
            return null;
          }

          redirect = optionValues[0];
          break;
        default:
          // Disable this filter if we don't support all the options
          return null;
      }
    }
    // End of option parsing
    // --------------------------------------------------------------------- //
  }

  // Apply mask to the internal state.
  if (hasCptOption === false) {
    mask = setBit(mask, FROM_ANY);
  }

  // Identify kind of pattern

  // Deal with hostname pattern
  if (fastStartsWith(line, '127.0.0.1')) {
    hostname = line.substr(line.lastIndexOf(' ') + 1);
    filter = '';
    mask = clearBit(mask, NETWORK_FILTER_MASK.isRegex);
    mask = setBit(mask, NETWORK_FILTER_MASK.isHostname);
    mask = setBit(mask, NETWORK_FILTER_MASK.isHostnameAnchor);
  } else {
    // TODO - can we have an out-of-bound here? (source: V8 profiler)
    if (line.charAt(filterIndexEnd - 1) === '|') {
      mask = setBit(mask, NETWORK_FILTER_MASK.isRightAnchor);
      filterIndexEnd -= 1;
    }

    if (fastStartsWithFrom(line, '||', filterIndexStart)) {
      mask = setBit(mask, NETWORK_FILTER_MASK.isHostnameAnchor);
      filterIndexStart += 2;
    } else if (line.charAt(filterIndexStart) === '|') {
      mask = setBit(mask, NETWORK_FILTER_MASK.isLeftAnchor);
      filterIndexStart += 1;
    }

    // If pattern ends with "*", strip it as it often can be
    // transformed into a "plain pattern" this way.
    // TODO: add a test
    if (line.charAt(filterIndexEnd - 1) === '*' &&
        (filterIndexEnd - filterIndexStart) > 1) {
      filterIndexEnd -= 1;
    }

    // Is regex?
    const isRegex = checkIsRegex(line, filterIndexStart, filterIndexEnd);
    mask = setNetworkMask(mask, NETWORK_FILTER_MASK.isRegex, isRegex);

    const isHostnameAnchor = getBit(mask, NETWORK_FILTER_MASK.isHostnameAnchor);

    // Extract hostname to match it more easily
    // NOTE: This is the most common case of filters
    if (!isRegex && isHostnameAnchor) {
      // Look for next /
      const slashIndex = line.indexOf('/', filterIndexStart);
      if (slashIndex !== -1) {
        hostname = line.substring(filterIndexStart, slashIndex);
        filterIndexStart = slashIndex;
      } else {
        hostname = line.substring(filterIndexStart, filterIndexEnd);
        filter = '';
      }
    } else if (isRegex && isHostnameAnchor) {
      // Split at the first '/', '*' or '^' character to get the hostname
      // and then the pattern.
      // TODO - this could be made more efficient if we could match between two
      // indices. Once again, we have to do more work than is really needed.
      const firstSeparator = line.search(SEPARATOR);

      if (firstSeparator !== -1) {
        hostname = line.substring(filterIndexStart, firstSeparator);
        filterIndexStart = firstSeparator;
        if ((filterIndexEnd - filterIndexStart) === 1 &&
            line.charAt(filterIndexStart) === '^') {
          filter = '';
          mask = clearBit(mask, NETWORK_FILTER_MASK.isRegex);
        } else {
          mask = setNetworkMask(
            mask,
            NETWORK_FILTER_MASK.isRegex,
            checkIsRegex(line, filterIndexStart, filterIndexEnd));
        }
      }
    }
  }

  // Strip www from hostname if present
  if (getBit(mask, NETWORK_FILTER_MASK.isHostnameAnchor) && fastStartsWith(hostname, 'www.')) {
    hostname = hostname.slice(4);
  }

  if (filter === null) {
    filter = line.substring(filterIndexStart, filterIndexEnd).toLowerCase();
  }

  if (hostname !== null) {
    hostname = hostname.toLowerCase();
  }

  return new NetworkFilter(
    mask,
    filter,
    optDomains,
    optNotDomains,
    redirect,
    hostname,
    id
  );
}


const SPACE = /\s/;


/**
 * Takes a string, and try to parse a filter out of it. This can be either:
 *  - NetworkFilter
 *  - CosmeticFilter
 *  - something else (comment, etc.), in which case it returns null.
 */
export function parseFilter(line, loadNetworkFilters, loadCosmeticFilters) {
  // Ignore comments
  if (line.length === 1
      || line.charAt(0) === '!'
      || (line.charAt(0) === '#' && SPACE.test(line.charAt(1)))
      || fastStartsWith(line, '[Adblock')) {
    return null;
  }

  // Ignore Adguard cosmetics
  // `$$`
  if (line.indexOf('$$') !== -1) {
    return null;
  }

  // Check if filter is cosmetics
  const sharpIndex = line.indexOf('#');
  if (sharpIndex > -1) {
    const afterSharpIndex = sharpIndex + 1;

    // Ignore Adguard cosmetics
    // `#$#` `#@$#`
    // `#%#` `#@%#`
    if (fastStartsWithFrom(line, /* #@$# */ '@$#', afterSharpIndex)
        || fastStartsWithFrom(line, /* #@%# */ '@%#', afterSharpIndex)
        || fastStartsWithFrom(line, /* #%# */ '%#', afterSharpIndex)
        || fastStartsWithFrom(line, /* #$# */ '$#', afterSharpIndex)) {
      return null;
    } else if (fastStartsWithFrom(line, /* ## */'#', afterSharpIndex)
        || fastStartsWithFrom(line, /* #@# */ '@#', afterSharpIndex)) {
      if (!loadCosmeticFilters) {
        return null;
      }

      // Parse supported cosmetic filter
      // `##` `#@#`
      return parseCosmeticFilter(line, sharpIndex);
    }
  }

  if (!loadNetworkFilters) {
    return null;
  }

  // Everything else is a network filter
  return parseNetworkFilter(line);
}


export function parseList(data, { loadNetworkFilters, loadCosmeticFilters, debug }) {
  const networkFilters = [];
  const cosmeticFilters = [];
  const lines = data.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (line.length > 0) {
      const filter = parseFilter(line, loadNetworkFilters, loadCosmeticFilters);

      if (filter !== null) {
        // In debug mode, keep the original line
        if (debug) {
          filter.rawLine = line;
        }

        if (filter.isNetworkFilter()) {
          networkFilters.push(filter);
        } else if (filter.isCosmeticFilter()) {
          cosmeticFilters.push(filter);
        }
      }
    }
  }

  return {
    networkFilters,
    cosmeticFilters,
  };
}


export function parseJSResource(data) {
  let state = 'end';
  let tmpContent = '';
  let type = null;
  let name = '';
  const parsed = new Map();
  const lines = data.split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (fastStartsWith(trimmed, '#')) {
      state = 'comment';
    } else if (!trimmed) {
      state = 'end';
    } else if (state !== 'content' && !type && trimmed.split(' ').length === 2) {
      state = 'title';
    } else {
      state = 'content';
    }
    switch (state) {
      case 'end':
        if (tmpContent) {
          if (!parsed.get(type)) {
            parsed.set(type, new Map());
          }
          parsed.get(type).set(name, tmpContent);
          tmpContent = '';
          type = null;
        }
        break;
      case 'comment':
        break;
      case 'title':
        [name, type] = trimmed.split(' ');
        break;
      case 'content':
        tmpContent += `${trimmed}\n`;
        break;
      default:
    }
  });
  if (tmpContent) {
    if (!parsed.get(type)) {
      parsed.set(type, new Map());
    }
    parsed.get(type).set(name, tmpContent);
  }
  return parsed;
}
