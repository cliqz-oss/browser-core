import { parse } from '../core/tlds';
import md5 from '../core/helpers/md5';
import punycode from '../platform/lib/punycode';

const CODE_HASH = 35;
const CODE_AMPERSAND = 38;
const CODE_FORWARD_SLASH = 47;
const CODE_COLON = 58;
const CODE_SEMICOLON = 59;
const CODE_EQUALS = 61;
const CODE_QUESTION_MARK = 63;
const CODE_AT = 64;
const CODE_SQUARE_BRACKET_OPEN = 91;
const CODE_SQUARE_BRACKET_CLOSE = 93;

const BREAK_HOST_ON = [
  CODE_FORWARD_SLASH,
  CODE_HASH,
  CODE_QUESTION_MARK,
];

const KNOWN_PROTOCOLS = new Set([
  'http', 'https', 'ftp', 'file', 'about', 'mailto', 'chrome', 'moz-extension', 'chrome-extension',
  'view-source', 'data', 'dat', 'resource'
]);

function isValidProtocolChar(code) {
  return (code >= 65 && code <= 90) // A-Z
   || (code >= 97 && code <= 122) // a-z
   || (code >= 48 && code <= 57) // 0-9
   || code === 45 // -
   || code === 43; // +
}

function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

export function isKnownProtocol(protocol) {
  return KNOWN_PROTOCOLS.has(protocol.toLowerCase());
}

class URLSearchParams {
  constructor() {
    this.params = [];
  }

  append(key, value) {
    this.params.push([key, value]);
  }

  * entries() {
    for (let i = 0; i < this.params.length; i += 1) {
      yield this.params[i].map(decodeURIComponentSafe);
    }
  }
}

/**
 * A Fast implementation of url parsing, mostly API-compatible with the standard URL class while
 * being on average 2-3 times faster. Evaluation of URL components is lazy, so this implementation
 * should be fast for all use-cases.
 *
 * Known differences to standard URL:
 *  * Parameters returned via `URL.searchParams.entries()` are decoded only with
 *    `decodeURIComponent`. This differs to standards parsing in some subtle ways.
 *  * You can iterate a URL parameters array directly via `URL.searchParams.params`. This is around
 *    20% faster than using an iterator.
 *  * Parameter strings are parsed, and accessible via `URL.parameters`.
 *  * Domain parsing with tldts is built in. The `URL.domain` attribute returns output from tldts'
 *    `parseHost` method.
 *  * Hostname validation is not done on initial parse. The `isValidHost()` method is provided for
 *    this purpose.
 *  * Some extra helper methods.
 *
 * See also for common API: https://developer.mozilla.org/en-US/docs/Web/API/URL
 */
export default class URL {
  constructor(url) {
    if (!url) {
      throw new TypeError(`${url} is not a valid URL`);
    }
    this.protocol = null;
    this.hostname = null;
    this.host = null;
    this.port = '';
    this.pathname = null;
    this.username = '';
    this.password = '';
    this._search = '';
    this._hash = '';
    this._psStartIndex = 0;
    this._qsStartIndex = 0;
    this._qsParsed = false;
    this._parameters = new URLSearchParams();
    this._query = new URLSearchParams();

    let index = 0;
    // end is within bound of url
    let end = url.length - 1;
    // cut whitespace from the beginning and end of url
    while (url.charCodeAt(index) <= 0x20) {
      index += 1;
    }
    while (url.charCodeAt(end) <= 0x20) {
      end -= 1;
    }
    this.href = url.slice(index, end + 1);

    end = this.href.length - 1;
    let hasUpper = false;
    // Parse protocol
    for (; index <= end; index += 1) {
      const code = this.href.charCodeAt(index);
      if (code === CODE_COLON) {
        this.protocol = this.href.slice(0, index + 1);
        if (hasUpper) {
          this.protocol = this.protocol.toLowerCase();
          this.href = `${this.protocol}${this.href.slice(index + 1)}`;
        }
        break;
      } else if (!isValidProtocolChar(code)) {
        // non alphabet character in protocol - not a valid protocol
        throw new TypeError('Invalid URL protocol');
      } else if (code >= 65 && code <= 90) {
        hasUpper = true;
      }
    }

    if (index >= end) {
      throw new TypeError('No protocol');
    }

    // skip '/' after ':'
    this.slashes = '';
    for (index += 1; index < end; index += 1) {
      if (this.href.charCodeAt(index) !== CODE_FORWARD_SLASH) {
        break;
      } else {
        this.slashes += '/';
      }
    }
    if (this.slashes.length >= 2) {
      // Two slashes: Authority is included
      index = this._extractHostname(index, end);
    } else {
      // No authority
      this.host = '';
      this.hostname = '';
      this.origin = 'null';
    }

    if (index >= end) {
      // add trailing slash if missing
      if (this.href.charCodeAt(end) !== CODE_FORWARD_SLASH) {
        this.href += '/';
      }
      this.pathname = '/';
    } else {
      const pathStart = index;
      for (; index <= end; index += 1) {
        const code = this.href.charCodeAt(index);
        if (code === CODE_SEMICOLON && !this._psStartIndex) {
          this._psStartIndex = index;
        } else if (code === CODE_QUESTION_MARK || code === CODE_HASH) {
          this._qsStartIndex = index;
          break;
        }
      }
      this.pathname = this.href.slice(pathStart, this._qsStartIndex !== 0 ? this._qsStartIndex : end + 1) || '/';
    }
  }

  /**
   * Get parsed domainInfo from the hostname.
   * @returns parsed domain, from tldts `parse` method.
   */
  get domainInfo() {
    if (!this._parsedHost) {
      this._parsedHost = parse(this.hostname);
    }
    return this._parsedHost;
  }

  /**
   * Returns true iff the hostname of this url is an IP address. False otherwise.
   */
  get hostIsIp() {
    return this.domainInfo.isIp;
  }

  /**
   * Returns the hostname of the URL after parsing by tldts. This includes some error correction.
   */
  get domain() {
    return this.domainInfo.hostname;
  }

  /**
   * Get eTLD+1 of the hostname.
   */
  get generalDomain() {
    return this.domainInfo.domain || this.hostname;
  }

  /**
   * Truncated md5 hash of general domain.
   */
  get generalDomainHash() {
    return md5(this.generalDomain).slice(0, 16);
  }

  /**
   * The query string component of the URL, including the preceding `?` character.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/search
   */
  get search() {
    if (!this._search) {
      this._extractParams();
    }
    return this._search;
  }

  /**
   * Parsed query string parameters, as a `URLSearchParams` object.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/searchParams
   */
  get searchParams() {
    if (!this._qsParsed) {
      this._extractSearchParams();
    }
    return this._query;
  }

  /**
   * Parsed parameter string from the url. These are `;` separated key/values appearing in the URL
   * path, before the query string.
   */
  get parameters() {
    if (!this._qsParsed) {
      this._extractSearchParams();
    }
    return this._parameters;
  }

  /**
   * Check if the URL has a parameter string
   * @returns true iff `;` occurs in the URL path before a `?`.
   */
  hasParameterString() {
    return this._psStartIndex > 0;
  }

  /**
   * URL hash or fragment component.
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/hash
   */
  get hash() {
    if (!this._search && !this._hash) {
      this._extractParams();
    }
    return this._hash;
  }

  /**
   * Returns the url (post parsing).
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/toString
   */
  toString() {
    return this.href;
  }

  /**
   * JSONified URL (== toString)
   * See also: https://developer.mozilla.org/en-US/docs/Web/API/URL/toJSON
   */
  toJSON() {
    return this.href;
  }

  /**
   * Parsed domain with `www.` removed.
   */
  get cleanHost() {
    let cleanHost = this.domain;
    if (cleanHost.toLowerCase().indexOf('www.') === 0) {
      cleanHost = cleanHost.slice(4);
    }
    return cleanHost;
  }

  /**
   * Legacy attribute for `pathname`.
   */
  get path() {
    return this.pathname || '/';
  }

  /**
   * Check if the protocol of the URL matches a known set of protocols.
   * @returns true iff protocol is known.
   */
  isKnownProtocol() {
    return isKnownProtocol(this.protocol.slice(-1));
  }

  /**
   * Scheme = protocol without a trailing ':'.
   */
  get scheme() {
    return this.protocol.slice(0, -1);
  }

  /**
   * Legacy 'name' from getDetailsFromUrl:
   *  * If host is an IP address, returns "IP"
   *  * If host does not match a public TLD, returns the URL hostname
   *  * Else, returns the eTLD+1 with suffix removed.
   */
  get generalDomainMinusTLD() {
    if (this.hostIsIp) {
      return 'IP';
    }
    // when domainInfo.domain is null, the hostname does not match a known public suffix (e.g. a
    // local network hostname).
    if (!this.domainInfo.domain) {
      return this.domain;
    }
    return this.generalDomain.substring(0,
      this.generalDomain.length - this.domainInfo.publicSuffix.length - 1);
  }

  /**
   * Check if the hostname of the URL is valid, i.e.
   *  * it is an IP address, or
   *  * it is a valid hostname with a known public suffix.
   * @returns true if host is valid, otherwise false.
   */
  isValidHost() {
    // if tldts was able to parse it, it's valid
    return this.hostIsIp || this.generalDomain !== null;
  }

  /**
   * URL with `https?://www.` and trailing slash on the path removed.
   * For non `http` and `https` URLs, the protocol is included.
   */
  get friendlyUrl() {
    let friendlyUrl = `${this.cleanHost}${this.pathname}${this.search}`;
    if (this.protocol && ['http:', 'https:'].indexOf(this.protocol) === -1) {
      friendlyUrl = `${this.protocol}${this.slashes}${friendlyUrl}`;
    }
    if (friendlyUrl.slice(-1) === '/') {
      return friendlyUrl.slice(0, friendlyUrl.length - 1);
    }
    return friendlyUrl;
  }

  /**
   * Checks if this URL's hostname is non-ascii, and if so returns a new URL with the hostname
   * punycoded. Otherwise returns itself.
   */
  getPunycodeEncoded() {
    const punycodedHost = punycode.toASCII(this.hostname);
    if (punycodedHost !== this.hostname) {
      return new URL(`${this.protocol}${this.slashes}${punycodedHost}${this.pathname}${this.search}${this.hash}`);
    }
    return this;
  }

  /**
   * Converts URL object to URL string. Unlike `this.toString` method it takes into account
   * any changes made to url properties like `protocol`, `hostname`, etc.
   */
  stringify() {
    return `${this.protocol}${this.slashes}${this.hostname}${this.pathname}${this.search}${this.hash}`;
  }

  _extractHostname(start, end) {
    let portIndex = 0;
    let stopped = false;
    let i = start;
    let ipv6 = false;
    let hasUpper = false;

    // this is a IPv6 address - ignore everything until the closing bracket
    if (this.href.charCodeAt(i) === CODE_SQUARE_BRACKET_OPEN) {
      ipv6 = true;
      for (; i <= end; i += 1) {
        const code = this.href.charCodeAt(i);
        if (code === CODE_SQUARE_BRACKET_CLOSE) {
          // after closed brackets can only be ':' or '/'
          const nextCode = this.href.charCodeAt(i + 1);
          if (nextCode === CODE_COLON) {
            portIndex = i + 1;
            i += 1;
            stopped = true;
          } else if (nextCode === CODE_FORWARD_SLASH) {
            i += 1;
            stopped = true;
          } else if (i !== end) {
            throw new TypeError('expected `:` or `/` after IPv6 address');
          }
          break;
        }
      }
    }

    if (!ipv6) {
      for (; i <= end; i += 1) {
        const code = this.href.charCodeAt(i);
        if (code === CODE_COLON) {
          portIndex = i;
          stopped = true;
          break;
        } else if (code === CODE_AT) {
          // username without password
          this.username = this.href.slice(start, i);
          this.password = '';
          return this._extractHostname(i + 1, end);
        }
        if (BREAK_HOST_ON.indexOf(code) !== -1) {
          stopped = true;
          break;
        } else if (code <= 0x20) {
          throw new TypeError(`Invalid character '${this.href[i]}' in hostname`);
        } else if (code >= 65 && code <= 90) {
          hasUpper = true;
        }
      }
    }
    const hostnameEnd = !stopped ? i + 1 : i;
    if (hasUpper) {
      this.href = `${this.href.slice(0, start)}${this.href.slice(start, hostnameEnd).toLowerCase()}${this.href.slice(hostnameEnd)}`;
    }
    this.hostname = this.href.slice(start, hostnameEnd);

    if (portIndex > 0) {
      i += 1;
      const portStart = i;
      for (; i <= end; i += 1) {
        const code = this.href.charCodeAt(i);
        if (BREAK_HOST_ON.indexOf(code) !== -1) {
          this.port = this.href.slice(portStart, i);
          break;
        } else if (code === CODE_AT) {
          // this was actually a username and password - extract user:pass, then
          // parse the rest as a plain hostname
          this.username = this.href.slice(start, portIndex || i);
          this.password = this.href.slice(portIndex + 1, i);
          return this._extractHostname(i + 1, end);
        }
      }
      if (!this.port) {
        this.port = this.href.slice(portStart, i);
      }
    }
    this.host = this.href.slice(start, !stopped ? i + 1 : i);
    this.origin = `${this.protocol}//${this.host}`;
    return !stopped ? i + 1 : i;
  }

  _extractParams() {
    if (this._qsStartIndex > 0) {
      let index = this._qsStartIndex;
      const end = this.href.length - 1;
      if (this.href.charCodeAt(index) === CODE_QUESTION_MARK) {
        let broken = false;
        for (; index <= end; index += 1) {
          if (this.href.charCodeAt(index) === CODE_HASH) {
            broken = true;
            break;
          }
        }
        this._search = this.href.slice(this._qsStartIndex, broken ? index : end + 1);
        if (this._search.length === 1) {
          this._search = '';
        }
      }
      if (this.href.charCodeAt(index) === CODE_HASH) {
        this._hash = this.href.slice(index, end + 1);
      }
    }
  }

  _extractSearchParams() {
    this._qsParsed = true;
    if (this._qsStartIndex === 0 && this._psStartIndex === 0) {
      return;
    }
    const start = this._psStartIndex || this._qsStartIndex;
    const end = this.href.length - 1;
    let index = start;

    if (this.href.charCodeAt(index) === CODE_SEMICOLON) {
      // parameter string starts here
      index = this._extractParamTuples(index + 1, end, this._parameters, [CODE_SEMICOLON],
        CODE_EQUALS, [CODE_QUESTION_MARK, CODE_HASH]);
    }
    if (this.href.charCodeAt(index) === CODE_QUESTION_MARK) {
      // query string starts here
      const searchStart = index;
      index = this._extractParamTuples(index + 1, end, this._query, [CODE_AMPERSAND], CODE_EQUALS,
        [CODE_HASH]);
      this._search = this.href.slice(searchStart, index);
      if (this._search.length === 1) {
        this._search = '';
      }
    }
    if (this.href.charCodeAt(index) === CODE_HASH) {
      this._hash = this.href.slice(index, end + 1);
    }
  }

  _extractParamTuples(start, end, params, separators, equals, breakCodes) {
    let index = start;
    let keyStart = index;
    let keyEnd = 0;
    let valStart = 0;

    for (; index <= end; index += 1) {
      const code = this.href.charCodeAt(index);
      if (code === equals && keyEnd === 0) {
        keyEnd = index;
        valStart = index + 1;
      } else if (separators.indexOf(code) !== -1) {
        // don't add if key and value are empty
        if (index > keyStart) {
          params.append(
            this.href.slice(keyStart, keyEnd || index),
            this.href.slice(valStart || index, index)
          );
        }

        keyStart = index + 1;
        keyEnd = 0;
        valStart = 0;
      } else if (breakCodes.indexOf(code) !== -1) {
        break;
      }
    }
    // push last key-value
    if (index !== keyStart) {
      params.append(
        this.href.slice(keyStart, keyEnd || index),
        this.href.slice(valStart || index, index)
      );
    }
    return index;
  }

  /**
   * Non-standard params extractor.
   *
   * Returns search params from parameter string and query params with more aggessive extraction
   * than the standard URL implementation. Extra extraction features are:
   *  * `;` separated parameters - used by multi trackers
   * @returns URLSearchParams
   */
  extractKeyValues() {
    if (this._kvcache) {
      return this._kvcache;
    }
    this._kvcache = new URLSearchParams();
    if (this._qsStartIndex === 0 && this._psStartIndex === 0) {
      return this._kvcache;
    }
    const start = this._psStartIndex || this._qsStartIndex;
    const end = this.href.length - 1;
    let index = start;

    if (this.href.charCodeAt(index) === CODE_SEMICOLON) {
      // parameter string starts here
      index = this._extractParamTuples(index + 1, end, this._kvcache, [CODE_SEMICOLON],
        CODE_EQUALS, [CODE_QUESTION_MARK, CODE_HASH]);
    }

    if (this.href.charCodeAt(index) === CODE_QUESTION_MARK) {
      // query string starts here
      index = this._extractParamTuples(index + 1, end, this._kvcache,
        [CODE_AMPERSAND, CODE_SEMICOLON], // allow '&' or ';' as separators
        CODE_EQUALS, [CODE_HASH]);
    }
    return this._kvcache;
  }
}
