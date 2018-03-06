import logger from './logger';
import { nextTick } from '../core/decorators';
import { Dns as PlatformDns } from '../platform/human-web/dns';
import FallbackDns from './fallback-dns';

const Dns = PlatformDns || FallbackDns;

export function parseHostname(hostname) {
  const o = {
    hostname: null,
    username: '',
    password: '',
    port: null,
  };

  let h = hostname;
  let v = hostname.split('@');
  if (v.length > 1) {
    const w = v[0].split(':');
    o.username = w[0];
    o.password = w[1];
    h = v[1];
  }

  v = h.split(':');
  if (v.length > 1) {
    o.hostname = v[0];
    o.port = parseInt(v[1], 10);
  } else {
    o.hostname = v[0];
    o.port = 80;
  }

  return o;
}

// TODO: suppress for now, fix later
/* eslint-disable no-useless-escape */
/* eslint-disable prefer-template */
export function parseURL(url) {
  // username, password, port, path, query_string, hostname, protocol
  const o = {};

  let v = url.split('://');
  if (v.length >= 2) {
    o.protocol = v[0];
    let s = v.slice(1, v.length).join('://');
    v = s.split('/');

    // Check for hostname, if not present then return null.
    if (v[0] === '') {
      return null;
    }

    // Check if the hostname is invalid by checking for special characters.
    // Only special characters like - and _ are allowed.
    const hostnameRegex = /[?!@#\$\^\&*\)\(+=]/g;
    if (hostnameRegex.test(v[0])) {
      return null;
    }

    const oh = parseHostname(v[0]);
    o.hostname = oh.hostname;
    o.port = oh.port;
    o.username = oh.username;
    o.password = oh.password;
    o.path = '/';
    o.query_string = null;

    if (v.length > 1) {
      s = v.splice(1, v.length).join('/');
      v = s.split('?');
      o.path = '/' + v[0];
      if (v.length > 1) {
        o.query_string = v.splice(1, v.length).join('?');
      }

      v = o.path.split(';');
      o.path = v[0];
      if (v.length > 1) {
        o.query_string = v.splice(1, v.length).join(';') + '&' + (o.query_string || '');
      }

      v = o.path.split('#');
      o.path = v[0];
      if (v.length > 1) {
        o.query_string = v.splice(1, v.length).join('#') + '&' + (o.query_string || '');
      }
    }
  } else {
    return null;
  }

  return o;
}

// TODO: suppress for now, fix later
/* eslint-disable radix */
export function isIPInternal(ip) {
  // Need to check for ipv6.
  const ipSplit = ip.split('.');
  if (parseInt(ipSplit[0]) === 10 ||
      (parseInt(ipSplit[0]) === 172 &&
       (parseInt(ipSplit[1]) >= 16 && parseInt(ipSplit[1]) <= 31)) ||
      (parseInt(ipSplit[0]) === 192 && parseInt(ipSplit[1]) === 168) ||
      (parseInt(ipSplit[0]) === 127) ||
      (parseInt(ipSplit[0]) === 0)) {
    return true;
  }

  return false;
}

export class Network {
  constructor() {
    this.dns = new Dns();
  }

  isPublicDomain(msg) {
    // We need to check for action page if the URLs in the message
    // are not private because of local domains. like fritzbox or admin.example.com.
    const promise = new Promise((resolve, reject) => {
      if (msg.action === 'page') {
        // Get all the urls in the payload.
        const urls = [];
        urls.push(msg.payload.url);
        if (msg.payload.ref) {
          urls.push(msg.payload.ref);
        }
        if (msg.payload.red) {
          msg.payload.red.forEach((redURL) => {
            urls.push(redURL);
          });
        }
        logger.debug('isPublicDomain: All urls in the message:', urls);

        // Check for each URL if the host is public or private,
        // If any of the host is private then it should resolve as true and exit.
        // Else should resolve as not private.

        Promise.all(urls.map(url => this.isHostNamePrivate(url))).then((results) => {
          // Now that we have checked all the URLS, if any of the URL resulted as private
          // We drop the message.
          if (results.indexOf(true) > -1) {
            logger.debug('isPublicDomain: Contains private URL');
            reject(false);
          } else {
            logger.debug('isPublicDomain: URLs are public');
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    });
    return promise;
  }

  isHostNamePrivate(url) {
    let host;
    try {
      host = parseURL(url).hostname;
    } catch (ee) {
      // If the parsing of the host fails for some reason,
      // we would mark it as private.
      return Promise.resolve(true);
    }

    if (!host) {
      return Promise.resolve(true);
    }

    return this.dns.resolveHost(host)
      .then(address => isIPInternal(address))
      .catch((e) => {
        logger.error(
          'Could not resolve domain', host,
          '. Be conservative and assume that the domain is private.', e);
        return true;
      });
  }

  cacheDnsResolution(domain, ip) {
    this.dns.cacheDnsResolution(domain, ip);
  }

  flushExpiredCacheEntries() {
    nextTick(() => {
      this.dns.flushExpiredCacheEntries();
    }).catch(logger.error);
  }
}
