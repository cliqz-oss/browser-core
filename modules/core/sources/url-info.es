import URL from './fast-url-parser';
import Cache from './helpers/string-cache';

function dURIC(s) {
  // avoide error from decodeURIComponent('%2')
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

const urlCache = new Cache(100);

const URLInfo = {
  /**
   * This is an abstraction over URL with caching and basic error handling built in. The main
   * difference is that this catches exceptions from the URL constructor (when the url is invalid)
   * and returns null instead in these cases.
   * @param String url
   * @returns {URL} parsed URL if valid is parseable, otherwise null;
   */
  get(url) {
    try {
      let res = urlCache.get(url);
      if (res === undefined) {
        res = new URL(url);
        urlCache.set(url, res);
      }
      return res;
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

function protocolDefaultPort(protocol) {
  if (protocol === 'https:') {
    return '443';
  }
  if (protocol === 'http:') {
    return '80';
  }
  if (protocol === 'ftp:') {
    return '21';
  }
  return '';
}

function tryDecode(url) {
  try {
    return decodeURI(url);
  } catch (e) {
    return url;
  }
}

/**
 * Equivalence check for two URL strings.
 * @param url1
 * @param url2
 */
function equals(url1, url2) {
  if (!url1 || !url2) {
    return false;
  }
  const pUrl1 = URLInfo.get(tryDecode(url1));
  const pUrl2 = URLInfo.get(tryDecode(url2));

  if (!pUrl1 || !pUrl2) {
    // one is not a url
    return false;
  }
  if (pUrl1.href === pUrl2.href) {
    return true;
  }
  const port1 = pUrl1.port || protocolDefaultPort(pUrl1.protocol);
  const port2 = pUrl2.port || protocolDefaultPort(pUrl2.protocol);
  return pUrl1.protocol === pUrl2.protocol
      && pUrl1.username === pUrl2.username
      && pUrl1.password === pUrl2.password
      && port1 === port2
      && pUrl1.pathname === pUrl2.pathname
      && pUrl1.search === pUrl2.search
      && pUrl1.hash === pUrl2.hash
      && (pUrl1.hostname === pUrl2.hostname
          || pUrl1.getPunycodeEncoded().hostname === pUrl2.getPunycodeEncoded().hostname);
}

export {
  dURIC,
  URLInfo,
  shuffle,
  equals
};
