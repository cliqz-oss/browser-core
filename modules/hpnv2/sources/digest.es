/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { InvalidMsgError } from './errors';

const punctuation = '!"\'()*,-./:;?[\\]^_`{|}~%$=&+#';
const punctuationRegex = new RegExp(`[${punctuation}]`, 'g');

function flatten(data) {
  const result = [];
  const recurse = (cur, prop = []) => {
    if (Object(cur) !== cur) {
      result.push([prop, cur]);
    } else {
      let isEmpty = true;
      Object.keys(cur).sort().forEach((p) => {
        isEmpty = false;
        recurse(cur[p], prop.concat(p));
      });
      if (isEmpty && prop) {
        result.push([prop, {}]);
      }
    }
  };
  recurse(data);
  return result;
}

const NORM_FUNCTIONS = new Map();
NORM_FUNCTIONS.set(null, x => x);
NORM_FUNCTIONS.set(undefined, x => x);

// TODO: this normalization function is taken from hpn module.
// For now we want to keep the same logic so that we can verify the equivalence
// of hpnv2 and hpnv, but at some point we should review it, as well as the fact
// that we apply the same url normalization to many fields that are not actually url.
NORM_FUNCTIONS.set('url', (s) => {
  if (s === undefined || s === null) {
    return undefined;
  }
  // Because in some telemetry message we only create unique based on anti-duplicate.
  // Anti-duplicate is not a string, hence converting it to string.
  let s1 = `${s}`;

  // Decode uri component
  // Need to find lua equivalent
  try {
    s1 = decodeURIComponent(s);
  } catch (e) {
    // pass
  }

  // Replace all spaces
  return s1.replace(/\s+/g, '')
    // Convert to lower
    .toLowerCase()
    // Clean the URL
    .replace(/^http[s]?:\/\//, '')
    .replace(/^www\./, '')
    // Remove all punctuation marks
    .replace(punctuationRegex, '');
});
NORM_FUNCTIONS.set('obj', (o) => {
  if (!o) {
    return undefined;
  }
  const flat = flatten(o);
  flat.sort(([a], [b]) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
  return flat;
});

/**
 * Given some string path like "a.b[0].c..." it returns the element
 * in obj corresponding to that object path.
 * Will return undefined if the path is broken at some point (elem does not exist).
 * If path is an empty string, it returns obj itself.
 * @param {Object} obj
 * @param {String} path
 */
function getField(obj, path) {
  return path.split(/[.[\]]+/).filter(x => x).reduce((o, i) => o && o[i], obj);
}

function digest(keys, payload) {
  return keys.map((k) => {
    const [key, norm] = k.split('->');
    const field = (NORM_FUNCTIONS.get(norm))(getField(payload, key));
    if (field === undefined) {
      throw new InvalidMsgError('Found undefined field when calculating digest');
    }
    return field;
  });
}

export { digest, flatten };
