import { log } from 'adblocker/utils';


// Uniq ID generator
let uidGen = 0;
function getUID() {
  return uidGen++;
}


const SEPARATOR = /[/^*]/;


export function serializeFilter(filter) {
  const serialized = Object.assign(Object.create(null), filter);
  try {
    if (filter.optDomains) {
      serialized.optDomains = [...serialized.optDomains.values()];
    }
    if (serialized.optNotDomains) {
      serialized.optNotDomains = [...serialized.optNotDomains.values()];
    }
    if (serialized.regex) {
      serialized.regex = serialized.regex.toString();
    }
  } catch (e) { log(`EXCEPTION SERIALIZING ${e} ${e.stack}`); }
  return serialized;
}


export function deserializeFilter(serialized) {
  const filter = serialized;
  try {
    if (filter.optDomains instanceof Array) {
      filter.optDomains = new Set(filter.optDomains);
    }
    if (filter.optNotDomains instanceof Array) {
      filter.optNotDomains = new Set(filter.optNotDomains);
    }
    if (filter.regex) {
      const m = filter.regex.match(/\/(.*)\/(.*)?/);
      filter.regex = new RegExp(m[1], m[2] || '');
    }
    // Assign a new id to the filter
    filter.id = getUID();
  } catch (e) { log(`EXCEPTION DESERIALIZE ${e} ${e.stack}`); }
  return filter;
}


class AdCosmetics {
  constructor(line, sharpIndex) {
    this.id = getUID();

    this.rawLine = line;
    this.supported = true;
    this.unhide = false;
    this.isCosmeticFilter = true;
    this.scriptInject = false;
    this.scriptReplaced = false;
    this.scriptBlock = false;

    this.hostnames = [];
    this.selector = null;

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
      this.unhide = true;
      suffixStartIndex++;
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
      //    script:contains(selector)
      //           ^        ^       ^^
      //           |        |       ||
      //           |        |       |this.selector.length
      //           |        |       scriptSelectorIndexEnd
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
          scriptSelectorIndexStart++;
          scriptSelectorIndexEnd--;
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
// 2. Lot of hostname anchors are of the form hostname[...]*[...]
//    we could split it into prefix + plain pattern
// 3. Replace some of the attributes by a bitmask
class AdFilter {
  constructor(line) {
    // Assign an id to the filter
    this.id = getUID();

    this.rawLine = line;
    this.filterStr = null;
    this.supported = true;
    this.isException = false;
    this.hostname = null;
    this.isNetworkFilter = true;
    this.isComment = false;

    this.regex = null;

    // Options
    // null  == not specified
    // true  == value true
    // false == negation (~)
    this.optDomains = null;
    this.optNotDomains = null;

    this.isImportant = false;
    this.matchCase = false;

    this.thirdParty = null;
    this.firstParty = null;
    this.redirect = null;

    // Options on origin policy
    this.fromAny = true;
    this.fromImage = null;
    this.fromMedia = null;
    this.fromObject = null;
    this.fromObjectSubrequest = null;
    this.fromOther = null;
    this.fromPing = null;
    this.fromScript = null;
    this.fromStylesheet = null;
    this.fromSubdocument = null;
    this.fromWebsocket = null;
    this.fromXmlHttpRequest = null;

    // Kind of pattern
    this.isHostname = false;
    this.isPlain = false;
    this.isRegex = false;
    this.isLeftAnchor = false;
    this.isRightAnchor = false;
    this.isHostnameAnchor = false;

    let filterIndexStart = 0;
    let filterIndexEnd = line.length;

    // @@filter == Exception
    this.isException = line.startsWith('@@');
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
        this.filterStr = '';
        this.isHostname = true;
        this.isPlain = true;
        this.isRegex = false;
        this.isHostnameAnchor = true;
      } else {
        if (line.charAt(filterIndexEnd - 1) === '|') {
          this.isRightAnchor = true;
          filterIndexEnd--;
        }

        if (line.startsWith('||', filterIndexStart)) {
          this.isHostnameAnchor = true;
          filterIndexStart += 2;
        } else if (line.charAt(filterIndexStart) === '|') {
          this.isLeftAnchor = true;
          filterIndexStart++;
        }

        // If pattern ends with "*", strip it as it often can be
        // transformed into a "plain pattern" this way.
        // TODO: add a test
        if (line.charAt(filterIndexEnd - 1) === '*' &&
            (filterIndexEnd - filterIndexStart) > 1) {
          filterIndexEnd--;
        }

        // Is regex?
        this.isRegex = isRegex(line, filterIndexStart, filterIndexEnd);
        this.isPlain = !this.isRegex;

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
            this.filterStr = '';
          }
        } else if (this.isRegex && this.isHostnameAnchor) {
          // Split at the first '/', '*' or '^' character to get the hostname
          // and then the pattern.
          const firstSeparator = line.search(SEPARATOR);

          if (firstSeparator !== -1) {
            this.hostname = line.substring(filterIndexStart, firstSeparator);
            filterIndexStart = firstSeparator;
            this.isRegex = isRegex(line, filterIndexStart, filterIndexEnd);
            this.isPlain = !this.isRegex;

            if ((filterIndexEnd - filterIndexStart) === 1 &&
                line.charAt(filterIndexStart) === '^') {
              this.filterStr = '';
              this.isPlain = true;
              this.isRegex = false;
            }
          }
        }
      }

      if (this.filterStr === null) {
        this.filterStr = line.substring(filterIndexStart, filterIndexEnd);
      }

      // Compile Regex
      if (this.isRegex) {
        this.regex = this.compileRegex(this.filterStr);
        // this.rawRegex = this.regex.toString();
      } else { // if (!this.matchCase) {
        // NOTE: No filter seems to be using the `match-case` option,
        // hence, it's more efficient to just convert everything to
        // lower case before matching.
        if (this.filterStr) {
          this.filterStr = this.filterStr.toLowerCase();
        }
        if (this.hostname) {
          this.hostname = this.hostname.toLowerCase();
        }
      }
    }
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
      log(`failed to compile regex ${filter} with error ${ex}`);
      // Ignore this filter
      this.supported = false;
      return null;
    }
  }

  parseOptions(rawOptions) {
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
        case 'domain':
          this.optDomains = new Set();
          this.optNotDomains = new Set();

          optionValues.forEach((value) => {
            if (value) {
              if (value.startsWith('~')) {
                this.optNotDomains.add(value.substring(1));
              } else {
                this.optDomains.add(value);
              }
            }
          });

          if (this.optDomains.size === 0) {
            this.optDomains = null;
          }
          if (this.optNotDomains.size === 0) {
            this.optNotDomains = null;
          }

          break;
        case 'image':
          this.fromImage = !negation;
          break;
        case 'media':
          this.fromMedia = !negation;
          break;
        case 'object':
          this.fromObject = !negation;
          break;
        case 'object-subrequest':
          this.fromObjectSubrequest = !negation;
          break;
        case 'other':
          this.fromOther = !negation;
          break;
        case 'ping':
          this.fromPing = !negation;
          break;
        case 'script':
          this.fromScript = !negation;
          break;
        case 'stylesheet':
          this.fromStylesheet = !negation;
          break;
        case 'subdocument':
          this.fromSubdocument = !negation;
          break;
        case 'xmlhttprequest':
          this.fromXmlHttpRequest = !negation;
          break;
        case 'important':
          // Note: `negation` should always be `false` here.
          this.isImportant = true;
          break;
        case 'match-case':
          // Note: `negation` should always be `false` here.
          this.matchCase = true;
          break;
        case 'third-party':
          this.thirdParty = !negation;
          break;
        case 'first-party':
          this.firstParty = !negation;
          break;
        case 'websocket':
          this.fromWebsocket = !negation;
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
          log(`NOT SUPPORTED OPTION ${option}`);
      }
    });

    // Check if any of the fromX flag is set
    this.fromAny = (
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
      return new AdCosmetics(line, sharpIndex);
    }
  }

  // Everything else is a network filter
  return new AdFilter(line);
}


export default function parseList(list) {
  try {
    const networkFilters = [];
    const cosmeticFilters = [];

    list.forEach((line) => {
      if (line) {
        const filter = parseFilter(line.trim());
        if (filter.supported && !filter.isComment) {
          log(`compiled ${line} into ${JSON.stringify(filter)}`);
          if (filter.isNetworkFilter) {
            networkFilters.push(filter);
          } else {
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
    log(`ERROR WHILE PARSING ${typeof list} ${ex}`);
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
