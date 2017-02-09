import log from 'adblocker/utils';
import { platformName } from 'core/platform';


// Uniq ID generator
let uidGen = 0;
function getUID() {
  return uidGen++;
}


const COSMETICS_MASK = {
  unhide: 0,
  scriptInject: 1,
  scriptReplaced: 2,
  scriptBlock: 3,
};


const NETWORK_FILTER_MASK = {
  thirdParty: 0,
  firstParty: 1,
  fromAny: 2,
  fromImage: 3,
  fromMedia: 4,
  fromObject: 5,
  fromObjectSubrequest: 6,
  fromOther: 7,
  fromPing: 8,
  fromScript: 9,
  fromStylesheet: 10,
  fromSubdocument: 11,
  fromWebsocket: 12,
  fromXmlHttpRequest: 13,
  isImportant: 14,
  matchCase: 15,

  // Kind of pattern
  isHostname: 16,
  isPlain: 17,
  isRegex: 18,
  isLeftAnchor: 19,
  isRightAnchor: 20,
  isHostnameAnchor: 21,
  isException: 22,
};


const SEPARATOR = /[/^*]/;


function getBit(n, offset) {
  return (n >> offset) & 1;
}


function setBit(n, offset) {
  return n | (1 << offset);
}


function clearBit(n, offset) {
  return n & ~(1 << offset);
}


function isBitSet(n, i) {
  return getBit(n, i) === 1;
}


function isBitNotSet(n, i) {
  return getBit(n, i) === 0;
}


export function serializeFilter(filter) {
  const serialized = Object.assign(Object.create(null), filter);

  // Remove useless attributes
  serialized.id = undefined;
  if (serialized._r !== undefined) {
    serialized._r = undefined;
  }
  if (serialized._nds !== undefined) {
    serialized._nds = undefined;
  }
  if (serialized._ds !== undefined) {
    serialized._ds = undefined;
  }

  return serialized;
}


export function deserializeFilter(serialized) {
  let filter;
  if (serialized._m !== undefined) {
    filter = new CosmeticFilter();
  } else {
    filter = new NetworkFilter();
  }

  // Copy remaining keys from serialized to filter
  Object.assign(filter, serialized);

  // Assign a new id to the filter
  filter.id = getUID();

  return filter;
}


class CosmeticFilter {
  constructor(line, sharpIndex) {
    // The following fields are used as internal representation for the
    // filter, but should not be used directly. Please use getters to
    // access public property.
    // this._s  == selector
    // this._h  == hostnames

    // Mask to store attributes
    // Each flag (unhide, scriptInject, etc.) takes only 1 bit
    // at a specific offset defined in COSMETICS_MASK.
    // cf: COSMETICS_MASK for the offset of each property
    this._m = 0;
    this.setMask(COSMETICS_MASK.unhide, false);
    this.setMask(COSMETICS_MASK.scriptInject, false);
    this.setMask(COSMETICS_MASK.scriptReplaced, false);
    this.setMask(COSMETICS_MASK.scriptBlock, false);

    // Parse filter if given as argument
    if (line !== undefined) {
      this.id = getUID();
      this.supported = true;
      this.isCosmeticFilter = true;

      this.parse(line, sharpIndex);
    }
  }

  set selector(value) {
    this._s = value;
  }

  get selector() {
    return this._s || '';
  }

  set hostnames(value) {
    this._h = value;
  }

  get hostnames() {
    return this._h || [];
  }

  set unhide(value) {
    this.setMask(COSMETICS_MASK.unhide, value);
  }

  get unhide() {
    return this.queryMask(COSMETICS_MASK.unhide);
  }

  set scriptInject(value) {
    this.setMask(COSMETICS_MASK.scriptInject, value);
  }

  get scriptInject() {
    return this.queryMask(COSMETICS_MASK.scriptInject);
  }

  set scriptReplaced(value) {
    this.setMask(COSMETICS_MASK.scriptReplaced, value);
  }

  get scriptReplaced() {
    return this.queryMask(COSMETICS_MASK.scriptReplaced);
  }

  set scriptBlock(value) {
    this.setMask(COSMETICS_MASK.scriptBlock, value);
  }

  get scriptBlock() {
    return this.queryMask(COSMETICS_MASK.scriptBlock);
  }

  queryMask(offset) {
    return getBit(this._m, offset) === 1;
  }

  setMask(offset, value) {
    if (value) {
      this._m = setBit(this._m, offset);
    } else {
      this._m = clearBit(this._m, offset);
    }
  }

  parse(line, sharpIndex) {
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
      this.setMask(COSMETICS_MASK.unhide, true);
      suffixStartIndex += 1;
    }

    // Parse hostnames
    if (sharpIndex > 0) {
      this.hostnames = line.substring(0, sharpIndex).split(',');
    }

    // Parse selector
    this.selector = line.substring(suffixStartIndex);

    // Deal with script:inject and script:contains
    if (this.selector.startsWith('script:')) {
      // this.selector
      //      script:inject(.......)
      //                    ^      ^
      //   script:contains(/......./)
      //                    ^      ^
      //    script:contains(selector[, args])
      //           ^        ^               ^^
      //           |        |          |    ||
      //           |        |          |    |this.selector.length
      //           |        |          |    scriptSelectorIndexEnd
      //           |        |          |scriptArguments
      //           |        scriptSelectorIndexStart
      //           scriptMethodIndex
      const scriptMethodIndex = 'script:'.length;
      let scriptSelectorIndexStart = scriptMethodIndex;
      let scriptSelectorIndexEnd = this.selector.length - 1;

      if (this.selector.startsWith('inject(', scriptMethodIndex)) {
        this.scriptInject = true;
        scriptSelectorIndexStart += 'inject('.length;
      } else if (this.selector.startsWith('contains(', scriptMethodIndex)) {
        this.scriptBlock = true;
        scriptSelectorIndexStart += 'contains('.length;

        // If it's a regex
        if (this.selector[scriptSelectorIndexStart] === '/'
            && this.selector[scriptSelectorIndexEnd - 1] === '/') {
          scriptSelectorIndexStart += 1;
          scriptSelectorIndexEnd -= 1;
        }
      }

      this.selector = this.selector.substring(scriptSelectorIndexStart, scriptSelectorIndexEnd);
    }

    // Exceptions
    if (this.selector === null ||
        this.selector.length === 0 ||
        this.selector.endsWith('}') ||
        this.selector.includes('##') ||
        (this.unhide && this.hostnames.length === 0)) {
      this.supported = false;
    }
  }
}


function isRegex(filter, start, end) {
  const starIndex = filter.indexOf('*', start);
  const separatorIndex = filter.indexOf('^', start);
  return ((starIndex !== -1 && starIndex < end) ||
          (separatorIndex !== -1 && separatorIndex < end));
}


// TODO:
// 1. Options not supported yet:
//  - popup
//  - popunder
//  - generichide
//  - genericblock
class NetworkFilter {
  constructor(line) {
    // The following fields can be added later but are `undefined` by default
    // They should be accessed via the corresponding get/set methods
    // this._f     == filterStr
    // this._r     == regex
    // this._d     == optDomains
    // this._nd    == optNotDomains

    // Represent options as bitmasks
    // check if value is null
    this._m1 = 0;
    // check if value is true/false
    this._m2 = 0;

    this.setMask(NETWORK_FILTER_MASK.fromAny);

    if (line !== undefined) {
      // Assign an id to the filter
      this.id = getUID();

      this.supported = true;
      this.isNetworkFilter = true;
      this.isComment = false;

      this.parse(line);
    }
  }

  parse(line) {
    let filterIndexStart = 0;
    let filterIndexEnd = line.length;

    // @@filter == Exception
    this.setMask(NETWORK_FILTER_MASK.isException, line.startsWith('@@'));
    if (this.isException) {
      filterIndexStart += 2;
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
      this.parseOptions(line.substring(optionsIndex + 1));
    }

    if (this.supported) {
      // Identify kind of pattern

      // Deal with hostname pattern
      if (line.startsWith('127.0.0.1')) {
        this.hostname = line.substring(line.lastIndexOf(' '));
        this._f = '';
        this.setMask(NETWORK_FILTER_MASK.isHostname);
        this.setMask(NETWORK_FILTER_MASK.isPlain);
        this.setMask(NETWORK_FILTER_MASK.isRegex, 0);
        this.setMask(NETWORK_FILTER_MASK.isHostnameAnchor);
      } else {
        if (line.charAt(filterIndexEnd - 1) === '|') {
          this.setMask(NETWORK_FILTER_MASK.isRightAnchor);
          filterIndexEnd -= 1;
        }

        if (line.startsWith('||', filterIndexStart)) {
          this.setMask(NETWORK_FILTER_MASK.isHostnameAnchor);
          filterIndexStart += 2;
        } else if (line.charAt(filterIndexStart) === '|') {
          this.setMask(NETWORK_FILTER_MASK.isLeftAnchor);
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
        this.setMask(NETWORK_FILTER_MASK.isRegex, isRegex(line, filterIndexStart, filterIndexEnd));
        this.setMask(NETWORK_FILTER_MASK.isPlain, !this.isRegex);

        // Extract hostname to match it more easily
        // NOTE: This is the most common case of filters
        if (this.isPlain && this.isHostnameAnchor) {
          // Look for next /
          const slashIndex = line.indexOf('/', filterIndexStart);
          if (slashIndex !== -1) {
            this.hostname = line.substring(filterIndexStart, slashIndex);
            filterIndexStart = slashIndex;
          } else {
            this.hostname = line.substring(filterIndexStart, filterIndexEnd);
            this._f = '';
          }
        } else if (this.isRegex && this.isHostnameAnchor) {
          // Split at the first '/', '*' or '^' character to get the hostname
          // and then the pattern.
          const firstSeparator = line.search(SEPARATOR);

          if (firstSeparator !== -1) {
            this.hostname = line.substring(filterIndexStart, firstSeparator);
            filterIndexStart = firstSeparator;
            this.setMask(NETWORK_FILTER_MASK.isRegex, isRegex(line, filterIndexStart, filterIndexEnd));
            this.setMask(NETWORK_FILTER_MASK.isPlain, !this.isRegex);

            if ((filterIndexEnd - filterIndexStart) === 1 &&
                line.charAt(filterIndexStart) === '^') {
              this._f = '';
              this.setMask(NETWORK_FILTER_MASK.isPlain);
              this.setMask(NETWORK_FILTER_MASK.isRegex, 0);
            }
          }
        }
      }

      // Strip www from hostname if present
      if (this.isHostnameAnchor && this.hostname.startsWith('www.')) {
        this.hostname = this.hostname.slice(4);
      }

      if (this._f === undefined) {
        this._f = line.substring(filterIndexStart, filterIndexEnd) || undefined;
      }

      // Compile Regex
      if (this.isRegex) {
        // If this is a regex, the `compileRegex` will be lazily called when first needed
        // using the lazy getter `get regex()` of this class.
      } else {
        if (this.hostname) {
          this.hostname = this.hostname.toLowerCase();
        }
        if (this._f) {
          this._f = this._f.toLowerCase();
        }
      }
    }

    // Remove it if it's empty
    if (!this._f) {
      this._f = undefined;
    }
  }

  queryMask(cptCode) {
    if (isBitNotSet(this._m1, cptCode)) {
      return null;
    }
    return isBitSet(this._m2, cptCode);
  }

  setMask(cptCode, value = 1) {
    this._m1 = setBit(this._m1, cptCode);
    if (value) {
      this._m2 = setBit(this._m2, cptCode);
    } else {
      this._m2 = clearBit(this._m2, cptCode);
    }
  }

  get optNotDomains() {
    if (this._nds === undefined) {
      if (!this._nd) {
        this._nds = new Set();
      } else if (typeof this._nd === 'string') {
        this._nds = new Set(this._nd.split('|'));
      }
    }

    return this._nds;
  }

  get optDomains() {
    if (this._ds === undefined) {
      if (!this._d) {
        this._ds = new Set();
      } else if (typeof this._d === 'string') {
        this._ds = new Set(this._d.split('|'));
      }
    }

    return this._ds;
  }

  get regex() {
    if (this._r === undefined) {
      this._r = this.compileRegex(this._f);
    }

    return this._r;
  }

  set hostname(value) {
    this._h = value;
  }

  get hostname() {
    return this._h;
  }

  set filterStr(value) {
    this._f = value;
  }

  get filterStr() {
    return this._f || '';
  }

  get isException() {
    return this.queryMask(NETWORK_FILTER_MASK.isException) === true;
  }

  get isHostnameAnchor() {
    return this.queryMask(NETWORK_FILTER_MASK.isHostnameAnchor) === true;
  }

  get isRightAnchor() {
    return this.queryMask(NETWORK_FILTER_MASK.isRightAnchor) === true;
  }

  get isLeftAnchor() {
    return this.queryMask(NETWORK_FILTER_MASK.isLeftAnchor) === true;
  }

  get matchCase() {
    return this.queryMask(NETWORK_FILTER_MASK.matchCase) === true;
  }

  get isImportant() {
    return this.queryMask(NETWORK_FILTER_MASK.isImportant) === true;
  }

  get isRegex() {
    return this.queryMask(NETWORK_FILTER_MASK.isRegex) === true;
  }

  get isPlain() {
    return this.queryMask(NETWORK_FILTER_MASK.isPlain) === true;
  }

  get isHostname() {
    return this.queryMask(NETWORK_FILTER_MASK.isHostname) === true;
  }

  get fromAny() {
    return this.queryMask(NETWORK_FILTER_MASK.fromAny) === true;
  }

  get thirdParty() {
    return this.queryMask(NETWORK_FILTER_MASK.thirdParty);
  }

  get firstParty() {
    return this.queryMask(NETWORK_FILTER_MASK.firstParty);
  }

  get fromImage() {
    return this.queryMask(NETWORK_FILTER_MASK.fromImage);
  }

  get fromMedia() {
    return this.queryMask(NETWORK_FILTER_MASK.fromMedia);
  }

  get fromObject() {
    return this.queryMask(NETWORK_FILTER_MASK.fromObject);
  }

  get fromObjectSubrequest() {
    return this.queryMask(NETWORK_FILTER_MASK.fromObjectSubrequest);
  }

  get fromOther() {
    return this.queryMask(NETWORK_FILTER_MASK.fromOther);
  }

  get fromPing() {
    return this.queryMask(NETWORK_FILTER_MASK.fromPing);
  }

  get fromScript() {
    return this.queryMask(NETWORK_FILTER_MASK.fromScript);
  }

  get fromStylesheet() {
    return this.queryMask(NETWORK_FILTER_MASK.fromStylesheet);
  }

  get fromSubdocument() {
    return this.queryMask(NETWORK_FILTER_MASK.fromSubdocument);
  }

  get fromWebsocket() {
    return this.queryMask(NETWORK_FILTER_MASK.fromWebsocket);
  }

  get fromXmlHttpRequest() {
    return this.queryMask(NETWORK_FILTER_MASK.fromXmlHttpRequest);
  }

  compileRegex(filterStr) {
    let filter = filterStr;

    // Escape special regex characters: |.$+?{}()[]\
    filter = filter.replace(/([|.$+?{}()[\]\\])/g, '\\$1');

    // * can match anything
    filter = filter.replace(/\*/g, '.*');
    // ^ can match any separator or the end of the pattern
    filter = filter.replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');

    // Should match end of url
    if (this.isRightAnchor) {
      filter = `${filter}$`;
    }

    if (this.isHostnameAnchor || this.isLeftAnchor) {
      filter = `^${filter}`;
    }

    try {
      if (this.matchCase) {
        return new RegExp(filter);
      }
      return new RegExp(filter, 'i');
    } catch (ex) {
      log(`failed to compile regex ${filter} with error ${ex} ${ex.stack}`);
      // Regex will always fail
      return { test() { return false; } };
    }
  }

  parseOptions(rawOptions) {
    // TODO: This could be implemented without string copy,
    // using indices, like in main parsing functions.
    rawOptions.split(',').forEach((rawOption) => {
      let negation = false;
      let option = rawOption;

      // Check for negation: ~option
      if (option.startsWith('~')) {
        negation = true;
        option = option.substring(1);
      } else {
        negation = false;
      }

      // Check for options: option=value1|value2
      let optionValues = [];
      if (option.includes('=')) {
        const optionAndValues = option.split('=', 2);
        option = optionAndValues[0];
        optionValues = optionAndValues[1].split('|');
      }

      switch (option) {
        case 'domain': {
          const optDomains = [];
          const optNotDomains = [];

          optionValues.forEach((value) => {
            if (value) {
              if (value.startsWith('~')) {
                optNotDomains.push(value.substring(1));
              } else {
                optDomains.push(value);
              }
            }
          });

          if (optDomains.length > 0) {
            this._d = optDomains.join('|');
          }
          if (optNotDomains.length > 0) {
            this._nd = optNotDomains.join('|');
          }

          break;
        }
        case 'image':
          this.setMask(NETWORK_FILTER_MASK.fromImage, !negation);
          break;
        case 'media':
          this.setMask(NETWORK_FILTER_MASK.fromMedia, !negation);
          break;
        case 'object':
          this.setMask(NETWORK_FILTER_MASK.fromObject, !negation);
          break;
        case 'object-subrequest':
          this.setMask(NETWORK_FILTER_MASK.fromObjectSubrequest, !negation);
          break;
        case 'other':
          this.setMask(NETWORK_FILTER_MASK.fromOther, !negation);
          break;
        case 'ping':
          this.setMask(NETWORK_FILTER_MASK.fromPing, !negation);
          break;
        case 'script':
          this.setMask(NETWORK_FILTER_MASK.fromScript, !negation);
          break;
        case 'stylesheet':
          this.setMask(NETWORK_FILTER_MASK.fromStylesheet, !negation);
          break;
        case 'subdocument':
          this.setMask(NETWORK_FILTER_MASK.fromSubdocument, !negation);
          break;
        case 'xmlhttprequest':
          this.setMask(NETWORK_FILTER_MASK.fromXmlHttpRequest, !negation);
          break;
        case 'important':
          // Note: `negation` should always be `false` here.
          this.setMask(NETWORK_FILTER_MASK.isImportant, 1);
          break;
        case 'match-case':
          // Note: `negation` should always be `false` here.
          // TODO: Include in bitmask
          this.setMask(NETWORK_FILTER_MASK.matchCase, 1);
          break;
        case 'third-party':
          this.setMask(NETWORK_FILTER_MASK.thirdParty, !negation);
          break;
        case 'first-party':
          this.setMask(NETWORK_FILTER_MASK.firstParty, !negation);
          break;
        case 'websocket':
          this.setMask(NETWORK_FILTER_MASK.fromWebsocket, !negation);
          break;
        case 'collapse':
          break;
        case 'redirect':
          // Negation of redirection doesn't make sense
          this.supported = !negation;
          // Ignore this filter if no redirection resource is specified
          if (optionValues.length === 0) {
            this.supported = false;
          } else {
            this.redirect = optionValues[0];
          }
          break;
        // Disable this filter if any other option is encountered
        default:
          // Disable this filter if we don't support all the options
          this.supported = false;
      }
    });

    // Check if any of the fromX flag is set
    const fromAny = (
      this.fromImage === null &&
      this.fromMedia === null &&
      this.fromObject === null &&
      this.fromObjectSubrequest === null &&
      this.fromOther === null &&
      this.fromPing === null &&
      this.fromScript === null &&
      this.fromStylesheet === null &&
      this.fromSubdocument === null &&
      this.fromWebsocket === null &&
      this.fromXmlHttpRequest === null);
    this.setMask(NETWORK_FILTER_MASK.fromAny, fromAny);
  }
}


const SPACE = /\s/;
export function parseFilter(line) {
  // Ignore comments
  if (line.length === 1
      || line.charAt(0) === '!'
      || (line.charAt(0) === '#' && SPACE.test(line.charAt(1)))
      || line.startsWith('[Adblock')) {
    return { supported: false, isComment: true };
  }

  // Ignore Adguard cosmetics
  // `$$`
  if (line.includes('$$')) {
    return { supported: false };
  }

  // Check if filter is cosmetics
  const sharpIndex = line.indexOf('#');
  if (sharpIndex > -1) {
    const afterSharpIndex = sharpIndex + 1;

    // Ignore Adguard cosmetics
    // `#$#` `#@$#`
    // `#%#` `#@%#`
    if (line.startsWith(/* #@$# */ '@$#', afterSharpIndex)
        || line.startsWith(/* #@%# */ '@%#', afterSharpIndex)
        || line.startsWith(/* #%# */ '%#', afterSharpIndex)
        || line.startsWith(/* #$# */ '$#', afterSharpIndex)) {
      return { supported: false };
    } else if (line.startsWith(/* ## */'#', afterSharpIndex)
        || line.startsWith(/* #@# */ '@#', afterSharpIndex)) {
      // Parse supported cosmetic filter
      // `##` `#@#`
      if (platformName === 'mobile') {
        // We don't support cosmetics filters on mobile, so no need
        // to parse them, store them, etc.
        // This will reduce both: loading time, memory footprint, and size of
        // the serialized index on disk.
        return { supported: false };
      }

      return new CosmeticFilter(line, sharpIndex);
    }
  }

  // Everything else is a network filter
  return new NetworkFilter(line);
}


export default function parseList(list, debug = false) {
  try {
    const networkFilters = [];
    const cosmeticFilters = [];

    list.forEach((line) => {
      if (line) {
        const filter = parseFilter(line.trim());
        if (filter.supported && !filter.isComment) {
          if (filter.isNetworkFilter) {
            // Delete temporary attributes
            if (!debug) {
              filter.supported = undefined;
              filter.isNetworkFilter = undefined;
              filter.isComment = undefined;
            } else {
              filter.rawLine = line;
            }

            networkFilters.push(filter);
          } else {
            // Delete temporary attributes
            if (!debug) {
              filter.supported = undefined;
              filter.isCosmeticFilter = undefined;
            } else {
              filter.rawLine = line;
            }

            cosmeticFilters.push(filter);
          }
        }
      }
    });

    return {
      networkFilters,
      cosmeticFilters,
    };
  } catch (ex) {
    log(`ERROR WHILE PARSING ${typeof list} ${ex} ${ex.stack}`);
    return null;
  }
}


export function parseJSResource(lines) {
  let state = 'end';
  let tmpContent = '';
  let type = null;
  let name = '';
  const parsed = new Map();
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#')) {
      state = 'comment';
    } else if (!line.trim()) {
      state = 'end';
    } else if (state !== 'content' && !type && line.split(' ').length === 2) {
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
        [name, type] = line.split(' ');
        break;
      case 'content':
        tmpContent += `${line}\n`;
        break;
      default:
    }
  }
  if (tmpContent) {
    if (!parsed.get(type)) {
      parsed.set(type, new Map());
    }
    parsed.get(type).set(name, tmpContent);
  }
  return parsed;
}
