/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { v5 as uuidv5 } from 'uuid';
import { normalize } from '../core/url';
import { randomInt } from '../core/crypto/random';

/**
 * Hashing URLs in accordance with the news backend, using the same
 * NAMESPACE (default used by the Python implementation of UUID5).
 */
export const hashUrl = (url) => {
  const normUrl = normalize(url);
  const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
  const urlHash = uuidv5(normUrl, NAMESPACE);
  return urlHash;
};

/**
 * Since we're only interested in News products, any non-news related
 * product will return `undefined`.
 */
export const getProduct = (result) => {
  const type = (((result || {}).rawResult || {}).data || {}).template || undefined;
  if (type && type === 'news') return 'NSD';
  for (const kind of result.kind || []) {
    if (kind.includes('EntityNews')) return 'SmartCliqz';
    if (kind.includes('EntityTopNews')) return 'ATN';
  }
  return undefined;
};

export const getRandomDelay = () => {
  const minSec = 0;
  const maxSec = 300;
  const delayInSeconds = (randomInt() % maxSec) + minSec;
  return delayInSeconds * 1000;
};
