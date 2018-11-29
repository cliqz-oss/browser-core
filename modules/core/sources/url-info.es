/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */
/* eslint camelcase: 'off' */

import MapCache from './helpers/fixed-size-cache';
import fastUrl from './fast-url-parser';
import md5 from './helpers/md5';
import unquotedJsonParse from './unquoted-json-parser';
import { parse as parseHost } from './tlds';

/*  Parse a URL string into a set of sub-components, namely:
 - protocol
 - username
 - password
 - hostname
 - port
 - path
 - parameters (semicolon separated key-values before the query string)
 - query (? followed by & separated key-values)
 - fragment (after the #)
 Given a valid string url, this function returns an object with the above
 keys, each with the value of that component, or empty string if it does not
 appear in the url.
 */
function parseURL(url) {
  const urlobj = fastUrl.parse(url, false, false, true);
  if (
    !urlobj._protocol
    || !urlobj.slashes
    || (!urlobj.host && urlobj._port < 0 && !urlobj.auth)
  ) {
    return null;
  }
  const port = urlobj._port < 0 ? 80 : urlobj._port;
  let username = '';
  let password = '';
  if (urlobj.auth) {
    [username, password] = urlobj.auth.split(':');
  }
  let path = urlobj.pathname || '/';
  const query = urlobj.search !== null ? urlobj.search.slice(1) : '';
  let parameters = '';
  if (urlobj.pathname !== null) {
    const parametersIndex = urlobj.pathname.indexOf(';');
    if (parametersIndex !== -1) {
      path = path.slice(0, parametersIndex);
      parameters = urlobj.pathname.slice(parametersIndex + 1);
    }
  }
  const fragment = urlobj.hash !== null ? urlobj.hash.slice(1) : '';
  return {
    urlString: url,
    protocol: urlobj._protocol,
    hostname: urlobj.hostname,
    port,
    username,
    password,
    path,
    query,
    parameters,
    fragment,
  };
}

function isMaybeJson(v) {
  if (typeof v !== 'string') {
    return false;
  }
  const trimmed = v.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (first === '{' && last === '}') || (first === '[' && last === ']');
}

// The value in query strings can be a json object, we need to extract the key-value pairs out
function _flattenJson(obj) {
  if (typeof obj === 'string' && (obj.indexOf('{') > -1 || obj.indexOf('[') > -1)) {
    try {
      obj = JSON.parse(obj);
      if (typeof obj !== 'object' && !Array.isArray(obj)) {
        obj = JSON.stringify(obj);
      }
    } catch (e) {
      // empty
    }
  }
  const res = {};
  switch (typeof obj) {
    case 'object':
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const r = _flattenJson(obj[key]);
          for (const _key in r) {
            if (Object.prototype.hasOwnProperty.call(r, _key)) {
              res[key + _key] = r[_key];
            }
          }
        }
      }
      break;
    case 'number':
      obj = JSON.stringify(obj);
      res[''] = obj;
      break;
    default:
      res[''] = obj;
  }
  return res;
}

const complexParsers = [JSON.parse, unquotedJsonParse];

function getJson(v) {
  if (isMaybeJson(v)) {
    let obj = v;
    for (let i = 0; i < complexParsers.length; i += 1) {
      try {
        obj = complexParsers[i](v);
        break;
      } catch (e) {
        // empty
      }
    }
    return _flattenJson(obj);
  }
  return false;
}

function dURIC(s) {
  // avoide error from decodeURIComponent('%2')
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

function getParametersQS(qs) {
  const res = {};
  const keysMultiValue = new Set();
  let state = 'key';
  let k = '';
  let v = '';

  const _updateQS = (_k, _v) => {
    // check for JSON in value
    const jsonParts = getJson(v);
    if (jsonParts) {
      Object.keys(jsonParts).forEach((jk) => {
        res[_k + jk] = jsonParts[jk];
      });
    } else if (keysMultiValue.has(_k)) {
      res[_k].push(_v);
    } else if (_k in res) {
      keysMultiValue.add(_k);
      res[_k] = [res[_k], _v];
    } else {
      res[_k] = _v;
    }
  };

  let quotes = '';
  for (let i = 0; i < qs.length; i += 1) {
    const c = qs.charAt(i);
    if (c === '"' || c === "'") {
      if (quotes.slice(-1) === c) {
        quotes = quotes.slice(0, quotes.length - 1);
      } else {
        quotes += c;
      }
    }
    if (c === '=' && state === 'key' && k.length > 0) {
      state = 'value';
    } else if ((c === '&' || c === ';') && quotes === '') {
      if (state === 'value') {
        state = 'key';
        // in case the same key already exists
        v = dURIC(v);
        _updateQS(k, v);
      } else if (state === 'key' && k.length > 0) {
        // key with no value, set value='true'
        res[k] = 'true';
      }
      k = '';
      v = '';
    } else {
      switch (state) {
        case 'key':
          k += c;
          break;
        case 'value':
          v += c;
          break;
        // no default
      }
    }
  } // for
  if (state === 'value') {
    state = 'key';
    v = dURIC(v);
    _updateQS(k, v);
  } else if (state === 'key' && k.length > 0) {
    res[k] = 'true';
  }

  // for keys with multiple values, check for '=' in value, and use that to build a unique key
  keysMultiValue.forEach((mvKey) => {
    const doubleKeys = res[mvKey].filter(_v => _v.indexOf('=') > -1);
    if (doubleKeys.length > 0) {
      // add new keys to res object
      doubleKeys.forEach((_v) => {
        const items = _v.split('=');
        const k2 = `${mvKey}_${items[0]}`;
        const v2 = items.splice(1).join('=');
        _updateQS(k2, v2);
      });
      // delete old duplicate values
      if (doubleKeys.length === res[mvKey].length) {
        delete res[mvKey];
      } else {
        res[mvKey] = res[mvKey].filter(_v => _v.indexOf('=') === -1);
        // special case: only one element left, unpack array
        if (res[mvKey].length === 1) {
          res[mvKey] = res[mvKey][0];
        }
      }
    }
  });

  return res;
}

function getHeaderMD5(headers) {
  const qsMD5 = {};
  for (const key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key)) {
      let tok = dURIC(headers[key]);
      while (tok === dURIC(tok)) {
        tok = dURIC(tok);
      }
      qsMD5[md5(key)] = md5(tok);
    }
  }
  return qsMD5;
}

class Url {
  constructor(urlString) {
    this.urlString = urlString;
    // add attributes from parseURL to this object
    const parsed = parseURL(urlString);
    if (parsed) {
      Object.assign(this, parsed);
    } else {
      throw new Error(`invalid url: ${urlString}`);
    }
  }

  get host() {
    if (!this._parsedHost) {
      this._parsedHost = parseHost(this.hostname);
    }
    return this._parsedHost;
  }

  get generalDomain() {
    return this.host.domain;
  }

  get generalDomainHash() {
    return md5(this.generalDomain).substring(0, 16);
  }

  toString() {
    return this.urlString;
  }

  get query_keys() {
    if (this._query_keys) {
      return this._query_keys;
    }
    this._query_keys = getParametersQS(this.query);
    return this._query_keys;
  }

  get parameter_keys() {
    if (this._parameter_keys) {
      return this._parameter_keys;
    }
    this._parameter_keys = getParametersQS(this.parameters);
    return this._parameter_keys;
  }

  get fragment_keys() {
    if (this._fragment_keys) {
      return this._fragment_keys;
    }
    this._fragment_keys = getParametersQS(this.fragment);
    return this._fragment_keys;
  }

  getKeyValues() {
    if (this._kvList) {
      return this._kvList;
    }
    const kvList = [];
    for (const kv of [this.query_keys, this.parameter_keys]) {
      for (const key in kv) {
        // iterate each array element separately
        if (Array.isArray(kv[key])) {
          kv[key].forEach((val) => {
            kvList.push({ k: key, v: val });
          });
        } else {
          kvList.push({ k: key, v: kv[key] });
        }
      }
    }
    this._kvList = kvList;
    return kvList;
  }

  getKeyValuesMD5() {
    if (this._kvMD5List) {
      return this._kvMD5List;
    }
    const kvList = this.getKeyValues().map((kv) => {
      // ensure v is stringy
      // eslint-disable-next-line prefer-template
      const vStr = '' + kv.v;
      return {
        k_len: kv.k.length,
        v_len: vStr.length,
        k: md5(kv.k),
        v: md5(vStr)
      };
    });
    this._kvMD5List = kvList;
    return kvList;
  }
}

/**
 URLInfo class: holds a parsed URL.
 */
const urlCache = new MapCache(url => new Url(url), 100);

function urlGetFromCache(url) {
  return urlCache.get(url);
}

/** Factory getter for URLInfo. URLInfo are cached in a LRU cache. */
const URLInfo = {
  get(url) {
    if (!url) return '';
    try {
      return urlGetFromCache(url);
    } catch (e) {
      return null;
    }
  }
};

function shuffle(s) {
  const a = s.split('');
  const n = a.length;

  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.join('');
}

function parseQuery(qstr) {
  const query = {};
  const a = qstr.split('&');
  for (const i in a) {
    if (Object.prototype.hasOwnProperty.call(a, i)) {
      const b = a[i].split('=');
      query[dURIC(b[0])] = dURIC(b[1]);
    }
  }
  return query;
}

function findOauth(url, url_parts) {
  try {
    let value = null;

    if ((url_parts.path.length < 50) && url_parts.query_string && (url_parts.path.indexOf('oauth') !== -1)) {
      const qso = parseQuery(url_parts.query_string);
      const k = Object.keys(qso);
      for (let i = 0; i < k.length; i += 1) {
        if (k[i].indexOf('callback') !== -1 || k[i].indexOf('redirect') !== -1) {
          value = dURIC(qso[k[i]]);
        } else if ((qso[k[i]].indexOf('http') === 0) && (qso[k[i]].indexOf('/oauth') !== -1)) {
          const url_parts2 = parseURL(qso[k[i]]);
          if (url_parts2 && url_parts2.path && url_parts2.path.indexOf('oauth')) {
            if (url_parts.query_string) {
              const qso2 = parseQuery(url_parts2.query_string);
              const k2 = Object.keys(qso2);
              for (let i2 = 0; i2 < k2.length; i2 += 1) {
                if (k2[i2].indexOf('callback') !== -1 || k2[i2].indexOf('redirect') !== -1) {
                  value = dURIC(qso2[k2[i2]]);
                }
              }
            }
          }
        }
      }
    }
    return value;
  } catch (ee) {
    // empty
    return null;
  }
}

export {
  parseURL,
  getParametersQS,
  dURIC,
  getHeaderMD5,
  URLInfo,
  shuffle,
  findOauth
};
