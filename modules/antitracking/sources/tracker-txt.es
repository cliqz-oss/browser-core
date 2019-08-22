/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

/**
TrackerTXT: caching rules for tracker.txt
 */

import MapCache from '../core/helpers/fixed-size-cache';
import { getTime } from './time';
import { httpGet } from '../core/http';
import prefs from '../core/prefs';

const trackerTxtActions = new Set(['placeholder', 'block', 'empty', 'replace']);

export const DEFAULT_ACTION_PREF = 'attrackDefaultAction';

let defaultTrackerTxtRule = null;

export function getDefaultTrackerTxtRule() {
  if (defaultTrackerTxtRule === null) {
    defaultTrackerTxtRule = prefs.get(DEFAULT_ACTION_PREF, 'same');
  }
  return defaultTrackerTxtRule;
}

export function setDefaultTrackerTxtRule(rule) {
  defaultTrackerTxtRule = rule;
}

export function updateDefaultTrackerTxtRule() {
  const ruleFromPref = prefs.get('attrackDefaultAction', 'same');
  // default rule may be either a tracking.txt action, or 'same'
  if (trackerTxtActions.has(ruleFromPref) || ruleFromPref === 'same') {
    defaultTrackerTxtRule = ruleFromPref;
  } else {
    // bad pref value, reset it
    prefs.clear('attrackDefaultAction');
  }
}

const trackerRuleParser = (str, rules) => {
  /* Tracker format:
   one rule per line: "R tracker action"
   */
  str
    .split('\n')
    .map(x => x.trim())
    .filter(x => x[0] === 'R')
    .forEach((element) => {
      const siteRule = element.split(/\s+/)
        .map(x => x.trim().toLowerCase());
      if (siteRule.length === 3 && trackerTxtActions.has(siteRule[2])) {
        rules.push({
          site: siteRule[1],
          rule: siteRule[2]
        });
      }
    });
};

const TrackerTXT = function (baseurl) {
  this.baseurl = baseurl;
  this.rules = [];
  this.status = null;
  this.last_update = null;
};

TrackerTXT._cache = new MapCache(baseurl => new TrackerTXT(baseurl), 1000);

TrackerTXT.get = (urlParts) => {
  const baseurl = `${urlParts.protocol}://${urlParts.hostname}(${urlParts.port !== 80 ? urlParts.port : ''})`;
  return TrackerTXT._cache.get(baseurl);
};

TrackerTXT.prototype = {
  update() {
    if (this.status === 'updating'
      || this.last_update === getTime()) return; // try max once per hour
    this.status = 'updating';
    const self = this;
    httpGet(
      `${self.baseurl}/tracking.txt`,
      function success(req) {
        if (req.responseText.length < 4 * 1024) {
          self.rules = [];
          trackerRuleParser(req.responseText, self.rules);
        }
        self.status = 'updated';
        self.last_update = getTime();
      },
      function error() {
        self.status = 'error';
        self.last_update = getTime();
      }
    );
  },
  getRule(tp) {
    for (let i = 0; i < this.rules.length; i += 1) {
      const rule = this.rules[i];
      if (tp.endsWith(rule.site)) {
        return rule.rule;
      }
    }
    return getDefaultTrackerTxtRule();
  }
};

export {
  TrackerTXT,
  trackerRuleParser
};
