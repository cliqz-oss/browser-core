/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Counter from '../../core/helpers/counter';
import { CONSENT_TYPES } from './metrics';

function countDistinct(array) {
  return new Set(array).size;
}

const number = { type: 'number', min: 0 };
const allowedValues = [0, 1, 2, 3, 4, 5];
const properties = {
  google: {
    pageActionCount: number,
    pageActionSites: number,
    popupCount: number,
    popupSites: number,
    clickedCount: number,
    clickedSites: number,
  },
  facebook: {
    pageActionCount: number,
    pageActionSites: number,
    popupCount: number,
    popupSites: number,
    clickedCount: number,
    clickedSites: number,
  },
  iab: {
    pageActionCount: number,
    pageActionSites: number,
    popupCount: number,
    popupSites: number,
    consentChangedCount: number,
    consentChangedSites: number,
    allowedHist: {
      properties: allowedValues.reduce((hist, v) => ({ ...hist, [v]: number }), {}),
    },
  }
};

function generateForType(type, { records }) {
  const filter = arr => arr.filter(s => s.type === type);
  const pageActionSignals = filter(records.get('metrics.consentric.pageAction'));
  const popupOpenedSignals = filter(records.get('metrics.consentric.popupOpened'));
  const clickedSignals = filter(records.get('metrics.consentric.clicked'));

  const analysis = {};
  const pluckSite = s => s.site;
  analysis.pageActionCount = pageActionSignals.length;
  analysis.pageActionSites = countDistinct(pageActionSignals.map(pluckSite));
  analysis.popupCount = popupOpenedSignals.length;
  analysis.popupSites = countDistinct(popupOpenedSignals.map(pluckSite));

  if (type === 'iab') {
    const changedSignals = records.get('metrics.consentric.consentChanged');
    analysis.consentChangedCount = changedSignals.length;
    analysis.consentChangedSites = countDistinct(changedSignals.map(pluckSite));
    const hist = new Counter(changedSignals.map(s => s.allowed));
    analysis.allowedHist = allowedValues.reduce((hash, key) =>
      ({ ...hash, [key]: hist.get(key) }), {});
  } else {
    // google or facebook
    analysis.clickedCount = clickedSignals.length;
    analysis.clickedSites = countDistinct(clickedSignals.map(pluckSite));
  }
  return [analysis];
}

export default CONSENT_TYPES.map(type => ({
  name: `analysis.consentric.${type}`,
  sendToBackend: {
    version: 1,
    demographics: [
      'campaign',
      'country',
      'install_date',
      'platform',
      'product',
    ],
  },
  generate: ({ records }) => generateForType(type, { records }),
  schema: {
    required: Object.keys(properties[type]),
    properties: properties[type],
  }
}));
