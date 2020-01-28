/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */

import { VERSION } from './config';
import { getHourTimestamp } from './time';
import prefs from '../core/prefs';


function getCountryCode() {
  return prefs.get('config_location', '--');
}

export function splitTelemetryData(data, bucketSize) {
  let acc = 0;
  let bucket = {};
  const splitData = [];
  for (const k in data) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      const length = JSON.stringify(data[k]).length;
      // full bucket
      if (acc !== 0 && acc + length > bucketSize) {
        // full bucket, push it
        splitData.push(bucket);
        bucket = {};
        acc = 0;
      }
      acc += length;
      bucket[k] = data[k];
    }
  }
  if (Object.keys(bucket).length > 0) {
    splitData.push(bucket);
  }
  return splitData;
}

export function generatePayload(data, ts, instant, attachAttrs) {
  const payl = {
    data,
    ts,
  };
  if (instant) {
    payl.instant = true;
  }
  if (attachAttrs) {
    for (const k in attachAttrs) {
      if (Object.prototype.hasOwnProperty.call(attachAttrs, k)) {
        payl[k] = attachAttrs[k];
      }
    }
  }
  return payl;
}

export function cleanTimestampCache(cacheObj, timeout, currTime) {
  const keys = Object.keys(cacheObj);
  keys.forEach((k) => {
    if (currTime - cacheObj[k] || timeout < 0) {
      delete cacheObj[k];
    }
  });
}


export function generateAttrackPayload(data, ts, qsVersion) {
  const extraAttrs = qsVersion;
  extraAttrs.ver = VERSION;
  extraAttrs.ctry = getCountryCode();
  ts = ts || getHourTimestamp();
  return generatePayload(data, ts, false, extraAttrs);
}

export function truncateDomain(host, depth) {
  const generalDomain = host.domain;

  if (host.isIp
    || host.hostname === generalDomain
    || generalDomain === null
    || generalDomain.length === 0
  ) {
    return host.hostname;
  }

  const subdomains = host.subdomain
    .split('.')
    .filter(p => p.length > 0);
  return `${subdomains.slice(Math.max(subdomains.length - depth, 0)).join('.')}.${generalDomain}`;
}

export function shuffle(s) {
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
