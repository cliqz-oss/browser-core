import { log } from 'adblocker/utils';


// Some content policy types used in filters
const TYPE_OTHER = 1;
const TYPE_SCRIPT = 2;
const TYPE_IMAGE = 3;
const TYPE_STYLESHEET = 4;
const TYPE_OBJECT = 5;
const TYPE_SUBDOCUMENT = 7;
const TYPE_PING = 10;
const TYPE_XMLHTTPREQUEST = 11;
const TYPE_OBJECT_SUBREQUEST = 12;
const TYPE_MEDIA = 15;


// Uniq ID generator
let uidGen = 0;


// TODO: Options not supported yet:
// redirect
// popup
// popunder
// generichide
// genericblock

// TODO: Lot of hostname anchors are of the form hostname[...]*[...]
//       we could split it into prefix + plain pattern
// TODO: Make sure we support difference between adblock and ublock when filter is a valid hostname
// TODO: Replace some of the attributes by a bitmask
class AdFilter {
  constructor(line) {
    // Assign an id to the filter
    this.id = uidGen++;

    this.rawLine = line.trim();
    this.filterStr = this.rawLine;
    this.supported = true;
    this.isException = false;
    this.rawOptions = null;
    this.hostname = null;

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
    this.fromXmlHttpRequest = null;

    // Kind of pattern
    this.isHostname = false;
    this.isPlain = false;
    this.isRegex = false;
    this.isLeftAnchor = false;
    this.isRightAnchor = false;
    this.isHostnameAnchor = false;

    // Deal with comments
    this.isComment = (this.filterStr.startsWith('!') ||
                      this.filterStr.startsWith('#') ||
                      this.filterStr.startsWith('[Adblock]'));

    // Trim comments at the end of the line
    // eg: "... # Comment"
    this.filterStr = this.filterStr.replace(/[\s]#.*$/, '');

    if (!this.isComment) {
      // domains##selector || domains###selector || domains#@#selector
      if (this.filterStr.includes('##') || this.filterStr.includes('#@#')) {
        this.supported = false;
      } else {
        // @@filter == Exception
        this.isException = this.filterStr.startsWith('@@');
        if (this.isException) {
          this.filterStr = this.filterStr.substring(2);
        }

        // filter$options == Options
        if (this.filterStr.includes('$')) {
          const filterAndOptions = this.filterStr.split('$');
          this.filterStr = filterAndOptions[0];
          this.rawOptions = filterAndOptions[1];
          // Parse options and set flags
          this.parseOptions(this.rawOptions);
        }

        if (this.supported) {
          // Identify kind of pattern

          // Deal with hostname pattern
          if (this.filterStr.startsWith('127.0.0.1')) {
            this.hostname = this.filterStr.split(' ').pop();
            this.filterStr = '';
            this.isHostname = true;
            this.isPlain = true;
            this.isRegex = false;
            this.isHostnameAnchor = true;
          } else {
            // TODO: Check if it's possible to be both right and left anchor
            if (this.filterStr.endsWith('|')) {
              this.isRightAnchor = true;
              this.filterStr = this.filterStr.substring(0, this.filterStr.length - 1);
            }

            if (this.filterStr.startsWith('||')) {
              this.isHostnameAnchor = true;
              this.filterStr = this.filterStr.substring(2);
            } else if (this.filterStr.startsWith('|')) {
              this.isLeftAnchor = true;
              this.filterStr = this.filterStr.substring(1);
            }

            // If pattern ends with "*", strip it as it often can be
            // transformed into a "plain pattern" this way.
            if (this.filterStr.endsWith('*') && this.filterStr.length > 1) {
              this.filterStr = this.filterStr.substring(0, this.filterStr.length - 1);
            }

            // Is regex?
            if (this.filterStr.includes('*') || this.filterStr.includes('^')) {
              this.isRegex = true;
            } else {
              this.isPlain = true;
            }

            // Extract hostname to match it more easily
            // NOTE: This is the most common case of filters
            if (this.isPlain && this.isHostnameAnchor) {
              // Look for next /
              const slashIndex = this.filterStr.indexOf('/');
              if (slashIndex !== -1) {
                this.hostname = this.filterStr.substring(0, slashIndex);
                this.filterStr = this.filterStr.substring(slashIndex);
              } else {
                this.hostname = this.filterStr;
                this.filterStr = '';
              }
            } else if (this.isRegex && this.isHostnameAnchor) {
              try {
                // Split at the first '/' or '^' character to get the hostname
                // and then the pattern.
                const firstSep = this.filterStr.search(/[/^]/);
                if (firstSep !== -1) {
                  const hostname = this.filterStr.substring(0, firstSep);
                  const pattern = this.filterStr.substring(firstSep);
                  if (!hostname.includes('*')) {
                    this.hostname = hostname;
                    this.isRegex = (pattern.includes('^') ||
                      pattern.includes('*'));
                    this.isPlain = !this.isRegex;

                    // If it's a regex, we keep the pattern full (and not splitted in
                    // hostname + pattern), as it will be easier to match the whole
                    // regex at once.
                    // NOTE: The `hostname` attribute can still be used to optimize
                    // filter dispatch in buckets and/or reverse index.
                    if (this.isPlain) {
                      this.filterStr = pattern;
                    }

                    log(`SPLIT ${JSON.stringify({
                      raw: this.rawLine,
                      hostname: this.hostname,
                      filterStr: this.filterStr,
                      isRegex: this.isRegex,
                    })}`);
                  }
                }
              } catch (ex) {
                log(`ERROR !! ${ex}`);
              }
            }
          }

          // Compile Regex
          if (this.isRegex) {
            this.rawRegex = this.filterStr;
            this.regex = this.compileRegex(this.filterStr);
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

    if (this.isHostnameAnchor) {
      // Based on http://tools.ietf.org/html/rfc3986#appendix-B
      filter = `^(?:[^:/?#]+:)?(?://(?:[^/?#]*\.)?)?${filter}`;
    } else if (this.isLeftAnchor) {
      filter = `^${filter}`;
    }

    try {
      // Compile regex
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
    rawOptions.split(',').forEach(rawOption => {
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

          optionValues.forEach(value => {
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

          // this.optDomains = [...this.optDomains.values()];
          // this.optNotDomains = [...this.optNotDomains.values()];
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
        // TODO: Check if it recudes the number of popups displayed
        // Ignore the following options but use the filters anyway
        case 'popunder':
        case 'popup':
        case 'collapse':
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
      this.fromXmlHttpRequest === null);
  }

  match(httpContext) {
    const url = httpContext.url;

    // Source
    const sHost = httpContext.sourceHostname;
    const sHostGD = httpContext.sourceGD;

    // Url endpoint
    const host = httpContext.hostname;
    const hostGD = httpContext.hostGD;

    if (this.supported) {
      // Check option $third-party
      // source domain and requested domain must be different
      if ((this.firstParty === false || this.thirdParty === true) && sHostGD === hostGD) {
        return false;
      }

      // $~third-party
      // source domain and requested domain must be the same
      if ((this.firstParty === true || this.thirdParty === false) && sHostGD !== hostGD) {
        return false;
      }

      // URL must be among these domains to match
      if (this.optDomains !== null &&
         !(this.optDomains.has(sHostGD) ||
           this.optDomains.has(sHost))) {
        return false;
      }

      // URL must not be among these domains to match
      if (this.optNotDomains !== null &&
          (this.optNotDomains.has(sHostGD) ||
           this.optNotDomains.has(sHost))) {
        return false;
      }

      // Check content policy type only if at least one content policy has
      // been specified in the options.
      if (!this.fromAny) {
        const options = [
          [this.fromSubdocument, TYPE_SUBDOCUMENT],
          [this.fromImage, TYPE_IMAGE],
          [this.fromMedia, TYPE_MEDIA],
          [this.fromObject, TYPE_OBJECT],
          [this.fromObjectSubrequest, TYPE_OBJECT_SUBREQUEST],
          [this.fromOther, TYPE_OTHER],
          [this.fromPing, TYPE_PING],
          [this.fromScript, TYPE_SCRIPT],
          [this.fromStylesheet, TYPE_STYLESHEET],
          [this.fromXmlHttpRequest, TYPE_XMLHTTPREQUEST],
        ];

        // If content policy type `option` is specified in this filter,
        // then the policy type of the request must match.
        // - If more than one policy type is valid, we must find at least one
        // - If we found a blacklisted policy type we can return `false`
        let foundValidCP = null;
        for (let i = 0; i < options.length; i++) {
          const [option, policyType] = options[i];

          // Found a fromX matching the origin policy of the request
          if (option === true) {
            if (httpContext.cpt === policyType) {
              foundValidCP = true;
              break;
            } else {
              foundValidCP = false;
            }
          }

          // This rule can't be used with this policy type
          if (option === false && httpContext.cpt === policyType) {
            return false;
          }
        }

        // Couldn't find any policy origin matching the request
        if (foundValidCP === false) {
          return false;
        }
      }

      // Try to match url with pattern
      if (this.isRegex) {
        return this.regex.test(url);
      } else if (this.isHostnameAnchor) {
        if (host.startsWith(this.hostname) || hostGD.startsWith(this.hostname)) {
          return url.includes(this.filterStr, this.hostname.length);
        }
      } else if (this.isLeftAnchor) {
        return url.startsWith(this.filterStr);
      } else if (this.isRightAnchor) {
        return url.endsWith(this.filterStr);
      } else {
        return url.includes(this.filterStr);
      }
    }

    return false;
  }
}


export default function parseList(list) {
  try {
    const filters = [];
    list.split(/\r\n|\r|\n/g).forEach(line => {
      if (line) {
        const filter = new AdFilter(line);
        if (filter.supported && !filter.isComment) {
          log(`compiled ${line} into ${JSON.stringify(filter)}`);
          filters.push(filter);
        }
      }
    });
    return filters;
  } catch (ex) {
    log(`ERROR WHILE PARSING ${typeof list} ${ex}`);
    return null;
  }
}
