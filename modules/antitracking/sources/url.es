import md5 from './md5';
import MapCache from './fixed-size-cache';
import { getGeneralDomain } from './domain';
import unquotedJsonParse from './parsers/unquoted-json-parser';

function parseHostname(hostname) {
  var o = {'hostname': null, 'username': '', 'password': '', 'port': null};

  var h = hostname;
  var v = hostname.split('@');
  if (v.length > 1) {
    var w = v[0].split(':');
    o['username'] = w[0];
    o['password'] = w[1];
    h = v[1];
  }

  v = h.split(':');
  if (v.length > 1) {
    o['hostname'] = v[0];
    o['port'] = parseInt(v[1]);
  }
  else {
    o['hostname'] = v[0];
    o['port'] = 80;
  }

  return o;
}

function parseURL(url) {
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

   Additionally, any key-value pairs found in the parameters, query and fragment
   components are extracted into objects in 'parameter_keys', query_keys' and
   'fragment_keys' respectively.
   */
  var o = {};

  var v = url.split('://');
  if (v.length >= 2) {

    o['protocol'] = v[0];
    o['hostname'] = '';
    o['port'] = '';
    o['username'] = '';
    o['password'] = '';
    o['path'] = '/';
    o['query'] = '';
    o['parameters'] = '';
    o['fragment'] = '';
    o['host'] = '';
    var s = v.slice(1, v.length).join('://');

    let state = 'host';
    for(let i=0; i<s.length; i++) {
      let c = s.charAt(i);
      // check for special characters which can change parser state
      if(c == '#' && ['host', 'path', 'query', 'parameters'].indexOf(state) >= 0) {
        // begin fragment
        state = 'fragment';
        continue;
      } else if(c == '?' && ['host', 'path', 'parameters'].indexOf(state) >= 0) {
        // begin query string
        state = 'query';
        continue;
      } else if(c == ';' && ['host', 'path'].indexOf(state) >= 0) {
        // begin parameter string
        state = 'parameters';
        continue;
      } else if(c == '/' && state == 'host') {
        // from host we could go into any next state
        state = 'path';
        continue;
      }

      // add character to key based on state
      o[state] += c;
    }

    if (o['host'] == '') return null;

    var oh = parseHostname(o['host']);
    ['hostname', 'port', 'username', 'password'].forEach(function(k) {
      o[k] = oh[k];
    });
    delete o['host'];

    if (state != 'path') {
      o['query_keys'] = getParametersQS(o['query']);
      o['parameter_keys'] = getParametersQS(o['parameters']);
      o['fragment_keys'] = getParametersQS(o['fragment']);
    } else {
      o['query_keys'] = {};
      o['parameter_keys'] = {};
      o['fragment_keys'] = {};
    }

  } else {
    return null;
  }
  return o;
};

function isMaybeJson(v) {
  if (typeof v !== 'string') {
    return false;
  }
  const trimmed = v.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (first === '{' && last === '}') || (first === '[' && last === ']')
}

const complexParsers = [JSON.parse, unquotedJsonParse];

function getJson(v) {
  if (isMaybeJson(v)) {
    let obj = v;
    for (let i = 0; i < complexParsers.length; i++) {
      try {
        obj = complexParsers[i](v);
        break;
      } catch(e) {
      }
    }
    return _flattenJson(obj);
  }
  return false;
}

function getParametersQS(qs) {
  var res = {};
  const keysMultiValue = new Set();
  let state = 'key';
  let k = '';
  let v = '';

  var _updateQS = function(k, v) {
    // check for JSON in value
    const jsonParts = getJson(v);
    if (jsonParts) {
      Object.keys(jsonParts).forEach((jk) => {
        res[k + jk] = jsonParts[jk];
      })
    } else {
      if (keysMultiValue.has(k)) {
        res[k].push(v)
      } else if (k in res) {
        keysMultiValue.add(k);
        res[k] = [res[k], v]
      } else {
        res[k] = v;
      }
    }
  };

  var quotes = '';
  for(let i=0; i<qs.length; i++) {
    let c = qs.charAt(i);
    if (c === '"' || c === "'") {
      if (quotes.slice(-1) === c) {
        quotes = quotes.slice(0, quotes.length - 1);
      }
      else {
        quotes += c;
      }
    }
    if(c == '=' && state == 'key' && k.length > 0) {
      state = 'value';
      continue;
    } else if((c === '&' || c === ';') && quotes === '') {
      if(state == 'value') {
        state = 'key';
        // in case the same key already exists
        v = dURIC(v);
        _updateQS(k, v);
      } else if(state == 'key' && k.length > 0) {
        // key with no value, set value='true'
        res[k] = 'true';
      }
      k = '';
      v = '';
      continue;
    }
    switch(state) {
    case 'key':
      k += c;
      break;
    case 'value':
      v += c;
      break;
    }
  }
  if(state == 'value') {
    state = 'key';
    v = dURIC(v);
    _updateQS(k, v);
  } else if(state == 'key' && k.length > 0) {
    res[k] = 'true';
  }

  // for keys with multiple values, check for '=' in value, and use that to build a unique key
  keysMultiValue.forEach((mvKey) => {
    const doubleKeys = res[mvKey].filter((v) => v.indexOf('=') > -1)
    if (doubleKeys.length > 0) {
      // add new keys to res object
      doubleKeys.forEach(v => {
        var items = v.split('=');
        const k2 = mvKey + '_' + items[0];
        const v2 = items.splice(1).join('=');
        _updateQS(k2, v2);
      });
      // delete old duplicate values
      if (doubleKeys.length === res[mvKey].length) {
        delete res[mvKey];
      } else {
        res[mvKey] = res[mvKey].filter((v) => v.indexOf('=') === -1)
        // special case: only one element left, unpack array
        if (res[mvKey].length === 1) {
          res[mvKey] = res[mvKey][0];
        }
      }
    }
  });

  return res
};

// The value in query strings can be a json object, we need to extract the key-value pairs out
function _flattenJson(obj) {
  if (typeof obj === 'string' && (obj.indexOf('{') > -1 || obj.indexOf('[') > -1)) {
    try {
      obj = JSON.parse(obj);
      if (typeof obj !== 'object' && typeof obj !== 'array') {
        obj = JSON.stringify(obj);
      }
    } catch(e) {}
  }
  var res = {};
  switch(typeof obj) {
  case 'object':
    for (var key in obj) {
      var r = _flattenJson(obj[key]);
      for (var _key in r) {
        res[key + _key] = r[_key];
      }
    }
    break;
  case 'number':
    obj = JSON.stringify(obj);
  default:
    res[''] = obj;
  }
  return res;
};

function dURIC(s) {
  // avoide error from decodeURIComponent('%2')
  try {
    return decodeURIComponent(s);
  } catch(e) {
    return s;
  }
};

function getHeaderMD5(headers) {
  var qsMD5 = {};
  for (var key in headers) {
    var tok = dURIC(headers[key]);
    while (tok != dURIC(tok)) {
      tok = dURIC(tok);
    }
    qsMD5[md5(key)] = md5(tok);
  }
  return qsMD5;
};

/**
 URLInfo class: holds a parsed URL.
 */

const urlCache = new MapCache(function(url) { return new Url(url); }, 100);

/** Factory getter for URLInfo. URLInfo are cached in a LRU cache. */
const URLInfo = {
  get: function(url) {
    if (!url) return "";
    try {
      return urlCache.get(url);
    } catch(e) {
      return null;
    }
  }
}

class Url {

  constructor(urlString) {
    this.urlString = urlString;
    // add attributes from parseURL to this object
    const parsed = parseURL(urlString);
    if (parsed) {
      Object.keys(parsed).forEach((k) => {
        this[k] = parsed[k];
      });
    } else {
      throw new Error(`invalid url: ${urlString}`);
    }
  }

  get generalDomain() {
    if (!this._generalDomain) {
      this._generalDomain = getGeneralDomain(this.hostname);
    }
    return this._generalDomain;
  }

  get generalDomainHash() {
    return md5(this.generalDomain).substring(0, 16);
  }

  toString() {
    return this.urlString;
  }

  getKeyValues() {
    var kvList = [];
    for (let kv of [this.query_keys, this.parameter_keys]) {
      for (let key in kv) {
        // iterate each array element separately
        if (Array.isArray(kv[key])) {
          kv[key].forEach((val) => {
            kvList.push({k: key, v: val});
          });
        } else {
          kvList.push({k: key, v: kv[key]});
        }
      }
    }
    return kvList;
  }

  getKeyValuesMD5() {
    const kvList = this.getKeyValues();
    return kvList.map(function (kv) {
      // ensure v is stringy
      const vStr = String(kv.v);
      kv.k_len = kv.k.length;
      kv.v_len = vStr.length;
      kv.k = md5(kv.k);
      kv.v = md5(vStr);
      return kv;
    });
  }

}

function shuffle(s) {
  var a = s.split(""),
      n = a.length;

  for(var i = n - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.join("");
};

function parseQuery(qstr) {
  var query = {};
  var a = qstr.split('&');
  for (var i in a)
  {
    var b = a[i].split('=');
    query[dURIC(b[0])] = dURIC(b[1]);
  }
  return query;
};

function findOauth(url, url_parts) {
  try {
    var value = null;

    if ((url_parts.path.length < 50) && url_parts.query_string && (url_parts.path.indexOf('oauth')!=-1)) {

      var qso = parseQuery(url_parts.query_string);
      var k = Object.keys(qso);
      for(var i=0;i<k.length;i++) {
        if (k[i].indexOf('callback')!=-1 || k[i].indexOf('redirect')!=-1) {
          value = dURIC(qso[k[i]]);
        }
        else {
          if ((qso[k[i]].indexOf('http')==0) && (qso[k[i]].indexOf('/oauth')!=-1)) {

            var url_parts2 = parseURL(qso[k[i]]);
            if (url_parts2 && url_parts2.path && url_parts2.path.indexOf('oauth')) {
              if (url_parts.query_string) {
                var qso2 = parseQuery(url_parts2.query_string);
                var k2 = Object.keys(qso2);
                for(var i2=0;i2<k2.length;i2++) {
                  if (k2[i2].indexOf('callback')!=-1 || k2[i2].indexOf('redirect')!=-1) {
                    value = dURIC(qso2[k2[i2]]);
                  }
                }
              }
            }
          }
        }
      }
    }
    return value;

  } catch(ee) {
    return null;
  }
};

export {
  parseURL,
  getParametersQS,
  dURIC,
  getHeaderMD5,
  URLInfo,
  shuffle,
  findOauth
};
