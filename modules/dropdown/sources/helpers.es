/* eslint-disable no-param-reassign */
/* eslint-disable no-cond-assign */

import Handlebars from 'handlebars';
import templates from './templates';
import i18n from '../core/content/i18n';

const AGO_CEILINGS = [
  [0, '', 1],
  [120, 'ago1Minute', 1],
  [3600, 'agoXMinutes', 60],
  [7200, 'ago1Hour', 1],
  [86400, 'agoXHours', 3600],
  [172800, 'agoYesterday', 1],
  [2419200, 'agoXDays', 86400],
  [4838400, 'ago1Month', 1],
  [29030400, 'agoXMonths', 2419200],
  [58060800, 'ago1year', 1],
  [2903040000, 'agoXYears', 29030400]
];

// Make sure the input string is in lower case
function latinMap(str) {
  const map = [
    { base: 'a', letters: /[\u00E4]|ae/g },
    { base: 'o', letters: /[\u00F6]|oe/g },
    { base: 'u', letters: /[\u00FC]|ue/g },
    { base: 's', letters: /[\u00DF]|ss/g },
  ];

  map.forEach((mapper) => {
    str = str.replace(mapper.letters, mapper.base);
  });

  return str;
}

function countRemovedChars(indexes, lBound, hBound) {
  let count = 0;
  indexes.forEach((index) => {
    if (index >= lBound && index <= hBound) count += 1;
  });
  return count;
}

export default {
  take(array, number) {
    return array.slice(0, number || array.length);
  },

  even(value, options) {
    if (value % 2) {
      return options.fn(this);
    }
    return options.inverse(this);
  },

  exists(variable, options) {
    if (typeof variable !== 'undefined') {
      return options.fn(this);
    }
    return options.inverse(this);
  },

  emphasis(text = '', q = '', minQueryLength, cleanControlChars) {
    if (!q) return text;
    q = q.trim();

    if (text && cleanControlChars) {
      text.replace(/[\u0000-\u001F]/g, ' ');
    }

    const map = Array(text.length);
    const tokens = latinMap(q.toLowerCase()).split(/\s+|\.+|\/+/).filter(function (t) { return t && t.length > 1; });
    const lowerText = latinMap(text.toLowerCase());
    const out = [];
    let high = false;

    // Store a list of index(es) where a character has been removed
    const indexes = [];
    const patt = /ae|oe|ue|ss/g;
    let match = null;

    while (match = patt.exec(text.toLowerCase())) {
      indexes.push(match.index);
    }

    let lastRemovedChars = 0;
    let currentRemovedChars = 0;

    tokens.forEach(function (token) {
      let poz = lowerText.indexOf(token);
      while (poz !== -1) {
        // Number of characters have been removed before this token
        lastRemovedChars = countRemovedChars(indexes, 0, poz - 1);
        // Number of characters have been remove in this token
        currentRemovedChars = countRemovedChars(indexes, poz, poz + token.length);
        for (let i = poz + lastRemovedChars;
          i < poz + token.length + currentRemovedChars + lastRemovedChars;
          i += 1) {
          map[i] = true;
        }
        poz = lowerText.indexOf(token, poz + 1);
      }
    });

    let current = '';
    for (let i = 0; i < text.length; i += 1) {
      if (map[i] && !high) {
        out.push(current);
        current = '';
        current += text[i];
        high = true;
      } else if (!map[i] && high) {
        out.push(current);
        current = '';
        current += text[i];
        high = false;
      } else current += text[i];
    }
    out.push(current);

    return new Handlebars.SafeString(templates.emphasis(out));
  },

  local(...args) {
    const _args = Array.prototype.slice.call([...args]);
    const name = _args.shift();
    return i18n.getMessage.apply(null, [name, _args]);
  },

  agoline(ts) {
    if (!ts) return '';
    const now = (new Date().getTime() / 1000);
    const seconds = parseInt(now - ts, 10);
    let i = 0;
    let slot;

    while (slot = AGO_CEILINGS[i += 1]) {
      if (seconds < slot[0]) {
        return i18n.getMessage(slot[1], parseInt(seconds / slot[2], 10));
      }
    }
    return '';
  },

  agoDuration(duration) {
    if (!duration) return '';
    const seconds = parseInt(duration, 10);
    let i = 0;
    let slot;

    while (slot = AGO_CEILINGS[i += 1]) {
      if (seconds < slot[0]) {
        return i18n.getMessage(slot[1], parseInt(seconds / slot[2], 10));
      }
    }
    return '';
  },

  distance(meters) {
    if (!meters) {
      return null;
    }

    let distance;
    let unit;
    if (meters < 1000) {
      distance = meters.toFixed(0);
      unit = 'm';
    } else {
      distance = (meters / 1000).toFixed(1);
      unit = 'km';
    }
    return `${distance} ${unit}`;
  },

  concatLocale(prefix, locale) {
    if (!prefix) {
      return locale;
    }

    return `${prefix}_${locale}`;
  },

  truncate(text, maxChars) {
    const dots = '...';
    let str = text.trim();
    if (str.length > maxChars) {
      str = str.substring(0, maxChars - 3) + dots;
    }
    return str;
  }
};
