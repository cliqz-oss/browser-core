/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { toASCII } from 'punycode';
import { ImmutableURL, URL, getPunycodeEncoded } from '@cliqz/url-parser';
import Cache from './helpers/string-cache';

/**
 * The `caseInsensitiveStartsWith` method determines whether an ASCII
 * string begins with the characters of a specified `needle` string, returning
 * true or false as appropriate. It does so in a case-insensitive way, which
 * means that `caseInsensitiveStartsWith('foo bar', FOO)` will return
 * `true`.
 */
function caseInsensitiveStartsWith(str: string, needle: string, start: number = 0): boolean {
  return str.toLowerCase().startsWith(needle.toLowerCase(), start);
}

/**
 * Given `url` as well as the current index where we should `start` looking at,
 * return the index immediately following the last leading space.
 *
 * >>> getIndexAfterLeadingSpaces(' foo  bar', 0) === 1
 * >>> getIndexAfterLeadingSpaces(' foo  bar', 1) === 1
 * >>> getIndexAfterLeadingSpaces(' foo  bar', 4) === 6
 *
 * This function is used as part of `strip(...)`.
 */
function getIndexAfterLeadingSpaces(url: string, start: number): number {
  const end = url.length;

  while (start < end && url.charCodeAt(start) <= 32) {
    start += 1;
  }

  return start;
}

/**
 * Given `url` as well as the index where we should start looking from the
 * `end`, return the index immediately *preceding* the last trailing space.
 *
 * >>> getIndexBeforeTrailingSpaces(' foo  bar ', 9) === 8
 * >>> getIndexBeforeTrailingSpaces(' foo  bar ', 8) === 8
 * >>> getIndexBeforeTrailingSpaces(' foo  bar ', 5) === 3
 *
 * This function is used as part of `strip(...)`.
 */
function getIndexBeforeTrailingSpaces(url: string, end: number): number {
  while (end >= 0 && url.charCodeAt(end) <= 32) {
    end -= 1;
  }

  return end;
}

/**
 * Given `url` as well as the index where we should start looking from the
 * `end`, return the index immediately *preceding* the last trailing slash.
 *
 * >>> getIndexBeforeTrailingSlash(' foo  bar/', 9) === 8 // skip slash
 * >>> getIndexBeforeTrailingSlash(' foo  ////', 9) === 5 // skip slashes
 * >>> getIndexBeforeTrailingSlash(' foo  bar/', 8) === 8
 * >>> getIndexBeforeTrailingSlash(' foo  bar/', 0) === 0
 *
 * This function is used as part of `strip(...)`.
 */
function getIndexBeforeTrailingSlash(url: string, end: number): number {
  while (end >= 0 && url[end] === '/') {
    end -= 1;
  }

  return end;
}

/**
 * Given `url` as well as the current index where we should `start` looking at,
 * return the index immediately following the last leading 'www'-like
 * sub-domain. We currently support 'www2.' variation as well.
 *
 * >>> getIndexAfterWWW('https://www.example.com', 0) === 0
 * >>> getIndexAfterWWW('https://www.example.com', 8) === 12
 * >>> getIndexAfterWWW('https://www2.example.com', 8) === 13
 *
 * This function is used as part of `strip(...)`.
 */
function getIndexAfterWWW(url: string, start: number): number {
  if (caseInsensitiveStartsWith(url, 'www.', start)) {
    return start + 4;
  }

  if (caseInsensitiveStartsWith(url, 'www2.', start)) {
    return start + 5;
  }

  return start;
}

/**
 * Given `url` as well as the current index where we should `start` looking at,
 * return the index immediately following the last leading mobile-specific
 * sub-domain. We currently handle things like 'mobile.', 'm.', etc.
 *
 * >>> getIndexAfterMobileSubdomain('https://mobile.example.com', 0) === 0
 * >>> getIndexAfterMobileSubdomain('https://mobile.example.com', 8) === 15
 * >>> getIndexAfterMobileSubdomain('https://m.example.com', 8) === 10
 *
 * This function is used as part of `strip(...)`.
 */
function getIndexAfterMobileSubdomain(url: string, start: number): number {
  if (caseInsensitiveStartsWith(url, 'mobile.', start)) {
    return start + 7;
  }

  if (caseInsensitiveStartsWith(url, 'mobil.', start)) {
    return start + 6;
  }

  if (caseInsensitiveStartsWith(url, 'm.', start)) {
    return start + 2;
  }

  return start;
}

/**
 * Given `url` as well as the current index where we should `start` looking at,
 * return the index immediately following the protocol. This function also
 * implements a fast-path to handle the most common protocols: 'http:',
 * 'https:', 'ws:' and 'wss:'. Any other protocol will be validated to make
 * sure it only contains valid characters.
 *
 * Note that this code was heavily inspired by part of the hostname extraction
 * logic from the `tldts` library and was tuned for performance.
 *
 * >>> getIndexAfterProtocol('https://mobile.example.com', 0) === 8
 * >>> getIndexAfterProtocol('HTTPS://mobile.example.com', 0) === 8
 * >>> getIndexAfterProtocol('ws://mobile.example.com', 0) === 5
 * >>> getIndexAfterProtocol('ws://mobile.example.com', 1) === 5
 * >>> getIndexAfterProtocol('ws://mobile.example.com', 5) === 5
 * >>> getIndexAfterProtocol('custom:///mobile.example.com', 0) === 10
 * >>> getIndexAfterProtocol('//mobile.example.com', 0) === 2
 *
 * This function is used as part of `strip(...)`.
 */
function getIndexAfterProtocol(url: string, start: number): number {
  if (url.length - start <= 2) {
    return start;
  }

  // Handle case where `url` starts directly with '//'.
  if (url[start] === '/' && url[start + 1] === '/') {
    return start + 2;
  }

  // Look for ':' which would mark the start of a protocol
  const indexOfProtocol = url.indexOf(':', start);
  if (indexOfProtocol === -1) {
    return start;
  }

  // Check that scheme is valid: [a-zA-Z0-9.+-]
  let index = start;
  for (; index < indexOfProtocol; index += 1) {
    const code = url.charCodeAt(index);
    const valid = (
      (code >= 97 && code <= 122) || // [a, z]
      (code >= 65 && code <= 90) || // [A, Z]
      (code >= 48 && code <= 57) || // [0, 9]
      code === 46 || // '.'
      code === 45 || // '-'
      code === 43 // '+'
    );

    if (valid === false) {
      return start;
    }
  }

  // Skip 0, 1 or more '/' after ':'
  index = indexOfProtocol + 1;
  while (url[index] === '/') {
    index += 1;
  }

  return index;
}

/**
  * WIP Used to create a canonical representation of a path
  * Currently only used to remedy known errors of specific news URLs
  * >>> normalizePath('') === ''
  * >>> normalizePath('/') === '/'
  * >>> normalizePath('//my/sample/path/') === '/my/sample/path/'
  * >>> normalizePath('/yet/another/path') === '/yet/another/path'
  * >>> normalizePath('my/other/path') === 'my/other/path'
  */
function normalizePath(path: string): string {
  if (path.length === 0) return path;
  let index = 0;
  while (index < path.length && path.charCodeAt(index) === 47 /* '/' */) {
    index += 1;
  }
  return index === 0 ? path : path.slice(index - 1);
}

/**
  * WIP Used for news related URLs
  */
export function normalize(url: string): string {
  if (typeof url !== 'string' || url.length === 0) {
    return url;
  }
  const urlParts = new ImmutableURL(url);

  const res = (urlParts.hostname + normalizePath(urlParts.pathname))
  return strip(res, { trailingSlash: true, www: true });
}

/**
 * Generic function which can be used to strip different parts of a URL in its
 * raw string format. The goal is to normalize the input without having to rely
 * on more expensive parsing. Furthermore, this function is implemented in such
 * a way that at most *one string slce* will be performed; to guarantee
 * efficiency. The following parts can be cleaned-up:
 *
 * - `spaces` allows to trim() spaces from the input if needed (leading + trailing).
 * - `protocol` will strip any protocol (e.g.: http://, wss:// or foobar://)
 * - `www` will strip variations of leading 'www' (e.g.: www2 or www)
 * - `mobile` will strip mobile-specific sub-domains (e.g.: mobile. or m.)
 * - `trailingSlash` will strip any number of trailing slashes from input.
 */
export function strip(url: string, {
  spaces = true,
  protocol = false,
  www = false,
  mobile = false,
  trailingSlash = false,
}: {
  spaces?: boolean;
  protocol?: boolean;
  www?: boolean;
  mobile?: boolean;
  trailingSlash?: boolean;
} = {}): string {
  if (typeof url !== 'string' || url.length === 0) {
    return url;
  }

  let start = 0;
  let end = url.length - 1;

  if (spaces === true) {
    start = getIndexAfterLeadingSpaces(url, start);
    end = getIndexBeforeTrailingSpaces(url, end);
  }

  if (protocol === true) {
    start = getIndexAfterProtocol(url, start);
  }

  if (www === true) {
    start = getIndexAfterWWW(url, start);
  }

  if (mobile === true) {
    start = getIndexAfterMobileSubdomain(url, start);
  }

  if (trailingSlash === true) {
    // Check if there are search params in `url`.
    const indexOfSearch = url.indexOf('?', start);
    if (indexOfSearch !== -1) {
      const indexBeforeSearch = indexOfSearch - 1;
      const beforeSlashes = getIndexBeforeTrailingSlash(url, indexBeforeSearch);
      if (beforeSlashes !== indexBeforeSearch) {
        return url.slice(start, beforeSlashes + 1) + url.slice(indexOfSearch, end + 1);
      }
    }

    // Check if there is a hash in `url`.
    const indexOfHash = url.indexOf('#', start);
    if (indexOfHash !== -1) {
      const indexBeforeHash = indexOfHash - 1;
      const beforeSlashes = getIndexBeforeTrailingSlash(url, indexBeforeHash);
      if (beforeSlashes !== indexBeforeHash) {
        return url.slice(start, beforeSlashes + 1) + url.slice(indexOfHash, end + 1);
      }
    }

    if (indexOfHash === -1 && indexOfSearch === -1) {
      end = getIndexBeforeTrailingSlash(url, end);
    }
  }

  if (end < start) {
    return '';
  }

  if (start !== 0 || end !== (url.length - 1)) {
    return url.slice(start, end + 1);
  }

  return url;
}

const KNOWN_PROTOCOLS = new Set([
  'http',
  'https',
  'ftp',
  'file',
  'about',
  'mailto',
  'chrome',
  'moz-extension',
  'chrome-extension',
  'view-source',
  'data',
  'resource',
]);

function isKnownProtocol(protocol: string): boolean {
  const known = KNOWN_PROTOCOLS.has(protocol);
  if (
    !known &&
    typeof browser !== 'undefined' &&
    browser.cliqz &&
    browser.cliqz.externalProtocolHandlerExists(protocol)
  ) {
    KNOWN_PROTOCOLS.add(protocol);
    return true;
  }
  return known;
}

const LD = 'a-z0-9';
const ULD = `${LD}\\u{00c0}-\\u{ffff}`;
const LDH = `${LD}-_`; // technically underscore cannot be the part of hostname
const ULDH = `${ULD}-_`; // but it is being used too often to ignore it

const UrlRegExp = new RegExp(
  [
    `^(?:[${ULDH}]{1,63}\\.)*`, // optional subdomains
    `((?:[${ULD}][${ULDH}]{0,61}[${ULD}])|`,
    `(?:[${ULD}]))\\.`, // mandatory hostname
    `([${ULD}]{2,63})`, // mandatory TLD
    '(?:(?::(\\d{1,5}))|\\.)?$', // optional port or dot
  ].join(''),
  'iu',
);

const LocalUrlRegExp = new RegExp(
  [
    `(^[${LD}][${LDH}]{0,61}[${LD}])`, // mandatory ascii hostname
    '(:\\d{1,5})$', // mandatory port
  ].join(''),
  'i',
);

function tryDecode(fn: (url: string) => string): (url: string) => string {
  return (url) => {
    // Any decoding function should always be given a 'string' argument but
    // since the name of the function `try` implies that it should *never* throw
    // it is safer to add an explicit check for this.
    if (typeof url !== 'string') {
      return url;
    }

    // We observe that in practice, most URLs do not need any decoding; to make
    // sure the cost is as low as possible, we first check if there is a chance
    // that decoding will be needed (will be false 99% of the time).
    if (url.indexOf('%') === -1) {
      return url;
    }

    try {
      return fn(url);
    } catch (e) {
      return url;
    }
  };
}

const ipv4Part = '0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])'; // numbers 0 - 255
const ipv4Regex = new RegExp(`^${ipv4Part}\\.${ipv4Part}\\.${ipv4Part}\\.${ipv4Part}([:]([0-9])+)?$`); // port number
const ipv6Regex = new RegExp('^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$');

export function isIpv4Address(host: string): boolean {
  return ipv4Regex.test(host);
}

function isIpv6Address(host: string): boolean {
  return ipv6Regex.test(host);
}

export function isIpAddress(host: string): boolean {
  return isIpv4Address(host) || isIpv6Address(host);
}

const urlCache: Cache<ImmutableURL> = new Cache(128);

/**
 * This is an abstraction over URL with caching and basic error handling built in. The main
 * difference is that this catches exceptions from the URL constructor (when the url is invalid)
 * and returns null instead in these cases.
 * @param String url
 * @returns {URL} parsed URL if valid is parseable, otherwise null;
 */
export function parse(url: string): URL | null {
  // We can only try to parse url of type `string`.
  if (typeof url !== 'string') {
    return null;
  }

  // Check if we already parsed this particular `url`.
  const res = urlCache.get(url);
  if (res !== undefined) {
    return res;
  }

  // If it's the first time we see `url`, try to parse it.
  try {
    const parsed = new ImmutableURL(url);
    return urlCache.set(url, parsed);
  } catch (e) {
    return null;
  }
}

export function fixURL(url: string): string | null {
  let fixed = strip(url, { spaces: true });
  let uri = parse(fixed);
  if (uri === null || !uri.scheme || !isKnownProtocol(uri.scheme)) {
    // The following regex will strip any prefix which looks like a protocol to
    // clean-up `url`. This allows to then prepend a generic http:// protocol
    // and try parsing the input again.
    fixed = `http://${fixed.replace(/^:?\/*/, '')}`;
    uri = parse(fixed);
  }

  return (uri && fixed) || null;
}

/**
 * General heuristics are:
 * 1. If the input string can be successfuly parsed with a URL constructor
 *    and has a known protocol — it IS A URL.
 *    Examples: 'https://cliqz.com', 'mailto:info@cliqz.com', 'data:text/plain,hello'
 * 2. If the input string starts with a known protocol but cannot be parsed — it is NOT A URL.
 *    Examples: 'http://?q=0#wat', 'about:'
 * 3. If the input string is not valid URL (usually due to the lack of protocol) extract
 *    domain name and port out of it and run the following checks:
 *    a. If domain name is 'localhost' or IP-address IT IS A URL. Port is optional.
 *       Examples: 'localhost', '192.168.1.1', '[2001:db8:85a3:8d3:1319:8a2e:370:7348]:443'
 *    b. If domain matches "höstnäme.tld" pattern IT IS A URL
 *       (höstnäme can contain Unicode symbols, port is optional).
 *       Examples: 'bild.de', 'www.nürnberg.de', 'cliqz.com:443'
 *    c. If domain matches "hostname:port" pattern IT IS A URL
 *       (hostname can only contain ASCII symbols).
 *       Examples: 'cliqznas:80', magrathea:8080'
 * 4. If none of the conditions above can be applied to the input string IT IS NOT A URL.
 */
function isUrlLike(host: string): boolean {
  // TODO strict check port validity
  if (!host) {
    return false;
  }
  return (
    host.toLowerCase() === 'localhost'
    || UrlRegExp.test(host)
    || LocalUrlRegExp.test(host)
    || isIpAddress(host)
  );
}

const URL_SHALLOW_PARSE_RE = /^(?:([^:/\s@]*):(\/*))?([^@#?/\s]+@)?([^/?#]+).*$/;

/**
 * This function performs a loose check against given input string in order to
 * decide whether it LOOKS LIKE a URL or not. It relies on a number of
 * heuristics and cannot be 100% correct.
 *
 * Typical use case for this function would be testing if user-typed value in
 * the URL bar is a URL (and we should navigate to that address) or just a
 * search query (and we should lead them to search).
 *
 * It DOES NOT run strict URL checks or tests URL's validity, DO NOT USE IT FOR
 * THESE PURPOSES.
 */
export function isUrl(_input: string): boolean {
  if (typeof _input !== 'string') {
    return false;
  }

  const input = strip(_input, { spaces: true });
  if (input.length === 0) {
    return false;
  }

  const [, proto, slashes, auth, host] = input.match(URL_SHALLOW_PARSE_RE) || [];
  if (proto) {
    if (host) {
      if (isKnownProtocol(proto.toLowerCase())) {
        const uri = parse(input);
        if (uri === null) {
          return false;
        }

        return !!(uri.host || uri.pathname !== '/') && uri.isValidHost();
      }

      // If there were no slashes after colon, iț might be in fact an 'auth' or 'port' delimiter.
      // I.e. 'localhost:3000' or 'username:password@somewhere.com'
      if (!slashes) {
        return isUrlLike(auth ? host : `${proto}:${host}`);
      }
    }
    // cases like 'http://?q=0' or 'unknown-protocol://whatever'
    return false;
  }

  return isUrlLike(host);
}

export const tryDecodeURI = tryDecode(decodeURI);
export const tryDecodeURIComponent = tryDecode(decodeURIComponent);

export function getCleanHost(url: URL | null): string | null {
  if (url === null) {
    return null;
  }

  return strip(url.domain, { spaces: false, www: true });
}

/**
 * URL with `https?://www.` and trailing slash on the path removed.
 * For non `http` and `https` URLs, the protocol is included.
 */
export function getFriendlyUrl(url: URL | null): string | null {
  if (url === null) {
    return null;
  }

  // Create nicer version of `url`
  let friendlyUrl = `${getCleanHost(url)}${url.pathname}${url.search}`;
  if (url.protocol && url.protocol !== 'http:' && url.protocol !== 'https:') {
    friendlyUrl = `${url.protocol}${url.slashes}${friendlyUrl}`;
  }

  return strip(friendlyUrl, { spaces: false, trailingSlash: true });
}

function* toggleWWW(urlObj: URL, enabled: boolean): IterableIterator<URL> {
  if (enabled) {
    yield urlObj;
    if (urlObj.hostname.startsWith('www.')) {
      // eslint-disable-next-line no-param-reassign
      urlObj.hostname = urlObj.hostname.slice(4);
    } else {
      // eslint-disable-next-line no-param-reassign
      urlObj.hostname = `www.${urlObj.hostname}`;
    }
  }
  yield urlObj;
}

export function getUrlVariations(url: string, { protocol = true, www = true, trailingSlash = true } = {}): string[] {
  let protocols = protocol ? ['http:', 'https:'] : [];

  // NOTE: here we should not use URLInfo (cached) because the resulting `u`
  // will be mutated. This means that other users of URLInfo asking for the same
  // URL object might get different values.
  let u: URL | null = null;
  try {
    u = new URL(url);
  } catch (e) {
    u = null;
  }
  if (u === null) {
    return [url];
  }

  const urlSet = new Set([url]);

  if (!protocols.includes(u.protocol)) {
    // If original protocol is not "http/https" don't change it
    protocols = [u.protocol];
  }

  // Create url variants with different protocol "http/https"
  for (const proto of protocols) {
    u.protocol = proto;
    /* eslint-disable no-unused-vars, no-shadow */
    // Two more variants by adding/removing "www" subdomain
    for (const _ of toggleWWW(u, www)) {
      // Two more variants: with and without trailing slash
      let href = u.href;
      urlSet.add(href);
      if (trailingSlash) {
        if (u.pathname !== '/' && !u.pathname.endsWith('/')) {
          u.pathname = `${u.pathname}/`;
          href = u.href;
        } else if (u.search.startsWith('?')) {
          href = href.replace('/?', '?');
        } else if (u.hash.startsWith('#')) {
          href = href.replace('/#', '#');
        } else if (href.endsWith('/')) {
          href = href.slice(0, -1);
        }
        urlSet.add(href);
      }
    }
    /* eslint-enable no-unused-vars, no-shadow */
  }

  return Array.from(urlSet);
}

export function isPrivateIP(ip: string): boolean {
  // Need to check for ipv6.
  if (ip.indexOf(':') !== -1) {
    // ipv6
    if (ip === '::1') {
      return true;
    }
    const ipParts = ip.split(':');
    return (
      ipParts[0].startsWith('fd')
      || ipParts.every((d, i) => {
        if (i === ipParts.length - 1) {
          // last group of address
          return d === '1';
        }
        return d === '0' || !d;
      })
    );
  }
  const ipParts = ip.split('.').map(d => parseInt(d, 10));
  return (
    ipParts[0] === 10
    || (ipParts[0] === 192 && ipParts[1] === 168)
    || (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] < 32)
    || ipParts[0] === 127
    || ipParts[0] === 0
  );
}

function protocolDefaultPort(protocol: string): string {
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

/**
 * Equivalence check for two URL strings.
 */
export function equals(url1: string, url2: string): boolean {
  if (!url1 || !url2) {
    return false;
  }
  const pUrl1 = parse(tryDecodeURI(url1));
  const pUrl2 = parse(tryDecodeURI(url2));

  if (!pUrl1 || !pUrl2) {
    // one is not a url
    return false;
  }
  if (pUrl1.href === pUrl2.href) {
    return true;
  }
  const port1 = pUrl1.port || protocolDefaultPort(pUrl1.protocol);
  const port2 = pUrl2.port || protocolDefaultPort(pUrl2.protocol);
  return (
    pUrl1.protocol === pUrl2.protocol
    && pUrl1.username === pUrl2.username
    && pUrl1.password === pUrl2.password
    && port1 === port2
    && pUrl1.pathname === pUrl2.pathname
    && pUrl1.search === pUrl2.search
    && pUrl1.hash === pUrl2.hash
    && (pUrl1.hostname === pUrl2.hostname
      || getPunycodeEncoded(toASCII, pUrl1).hostname
        === getPunycodeEncoded(toASCII, pUrl2).hostname)
  );
}

/**
 * Get the name of `url`. The name is usually the domain with public suffix
 * removed. In some cases the value can be different:
 *
 * - If `url` is an IP then 'IP' is returned.
 * - If `hostname` is empty then 'pathname' is returned.
 * - If `domainWithoutSuffix` is empty then `generalDomain` is returned.
 */
export function getName(url: URL | null): string | null {
  if (url === null) {
    return null;
  }

  if (url.hostIsIp) {
    return 'IP';
  }

  if (!url.hostname) {
    return url.pathname;
  }

  return url.domainInfo.domainWithoutSuffix || url.generalDomain;
}

// List of url shorteners hostnames.
const SHORTENERS = new Set([
  'adf.ly',
  'amp.gs',
  'bc.vc',
  'bit.do',
  'bit.ly',
  'bitly.com',
  'cutt.us',
  'db.tt',
  'filoops.info',
  'goo.gl',
  'hive.am',
  'is.gd',
  'ity.im',
  'j.mp',
  'joturl.com',
  'link.zip.net',
  'lnkd.in',
  'lnnk.in',
  'ow.ly',
  'po.st',
  'q.gs',
  'qr.ae',
  'qr.net',
  'rover.ebay.com',
  'shorter.is',
  'shorturl.is',
  'shrt.li',
  'shtn.me',
  't.co',
  't2mio.com',
  'tinyurl.com',
  'tr.im',
  'u.to',
  'urlways.com',
  'ux9.de',
  'v.gd',
  'vzturl.com',
  'x.co',
  'yourls.org',
  'youtu.be',
  'zii.bz',
]);

/**
 * Check if `url` is a shortener, using our list of shortener hostnames.
 */
export function isUrlShortener(url: URL | null): boolean {
  if (url === null) {
    return false;
  }

  return SHORTENERS.has(url.hostname);
}

/**
 * Given two URLs in their raw string form `url1` and `url2`, check if they
 * have compatible protocols. Protocols are compatible if they only differ in
 * case (e.g.: 'http:' and 'HTTP:'), security (e.g.: 'http:' and 'https:') or
 * in the number of slashes after the colon (e.g.: 'https://' and 'https:').
 *
 * If one or both of `url1` and `url2` do not have a protocol at all then we
 * consider that they are "compatible".
 */
export function haveCompatibleProtocol(url1: string, url2: string): boolean {
  // If one or both of `url1` and `url2` is empty then protocols cannot match
  if (url1.length === 0 || url2.length === 0) {
    return false;
  }

  // Get index after protocol and make sure there is a protocol.
  const indexAfterProtocol1 = url1.lastIndexOf(':', getIndexAfterProtocol(url1, 0));
  if (indexAfterProtocol1 === -1) {
    return true;
  }

  // Get index after protocol and make sure there is a protocol.
  const indexAfterProtocol2 = url2.lastIndexOf(':', getIndexAfterProtocol(url2, 0));
  if (indexAfterProtocol2 === -1) {
    return true;
  }

  // If one of the protocols is empty (e.g.: '://foo.com' or '//foo.com'), then
  // we consider the protocols to be compatible only if they are both empty.
  if (indexAfterProtocol1 === 0 || indexAfterProtocol2 === 0) {
    return indexAfterProtocol1 === indexAfterProtocol2;
  }

  const protocol1 = url1.slice(0, indexAfterProtocol1);
  const protocol2 = url2.slice(0, indexAfterProtocol2);

  // If protocols have the same length then they must be equal (case-insensitive).
  if (protocol1.length === protocol2.length) {
    return caseInsensitiveStartsWith(protocol1, protocol2);
  }

  // Protocols are compatible only if their size differs only by '1' and one of
  // them is the secure version of the other (e.g.: 'http' and 'https').
  if (Math.abs(protocol1.length - protocol2.length) !== 1) {
    return false;
  }

  if (protocol1.length > protocol2.length) {
    return (
      protocol1[protocol1.length - 1] === 's'
      && caseInsensitiveStartsWith(protocol1, protocol2)
    );
  }

  return (
    protocol2[protocol2.length - 1] === 's'
    && caseInsensitiveStartsWith(protocol2, protocol1)
  );
}
