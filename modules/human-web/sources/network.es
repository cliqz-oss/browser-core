/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import logger from './logger';
import { nextTick } from '../core/decorators';
import { isPrivateIP as isIPInternal } from '../core/url';
import Dns from './fallback-dns';

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

export class Network {
  constructor() {
    this.dns = new Dns();
  }

  /* eslint-disable no-param-reassign */
  async sanitizeUrlsWithPrivateDomains(msg) {
    if (msg.action === 'page') {
      // We need to check if the URLs in the message are not private
      // because of local domains (e.g., 'fritzbox' or 'admin.example.com').
      //
      // 1) check for fields sensitive enough to drop the complete message:
      if (msg.payload.url && await this.isHostNamePrivate(msg.payload.url)) {
        logger.debug('sanitizeUrlsWithPrivateDomains: dropped because of private URL:', msg.payload.url);
        return null;
      }

      // 2) check for fields which can be nulled out without dropping the messages:
      if (msg.payload.x && msg.payload.x.canonical_url
          && await this.isHostNamePrivate(msg.payload.x.canonical_url)) {
        logger.debug('sanitizeUrlsWithPrivateDomains: private "canonical_url" URL nulled out:', msg.payload.url);
        msg.payload.x.canonical_url = null;
      }
      if (msg.payload.ref && await this.isHostNamePrivate(msg.payload.ref)) {
        logger.debug('sanitizeUrlsWithPrivateDomains: private "ref" URL nulled out:', msg.payload.ref);
        msg.payload.ref = null;
      }
      if (msg.payload.red) {
        for (let i = 0; i < msg.payload.red.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          if (msg.payload.red[i] && await this.isHostNamePrivate(msg.payload.red[i])) {
            logger.debug('sanitizeUrlsWithPrivateDomains: private "red" URL nulled out:', msg.payload.red[i]);
            msg.payload.red[i] = null;
          }
        }
      }
    }

    return msg;
  }
  /* eslint-enable no-param-reassign */

  async isHostNamePrivate(url) {
    let host;
    try {
      host = parseURL(url).hostname;
    } catch (ee) {
      // If the parsing of the host fails for some reason,
      // we would mark it as private.
      return true;
    }

    if (!host) {
      return true;
    }

    try {
      const address = await this.dns.resolveHost(host);
      return isIPInternal(address);
    } catch (e) {
      logger.log(
        'Could not resolve domain', host,
        '. Be conservative and assume that the domain is private.', e
      );
      return true;
    }
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
