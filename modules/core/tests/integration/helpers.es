/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable */

export * from '../test-helpers';
export { getResourceUrl } from '../../../core/platform';
export { getMessage } from '../../../core/i18n';

import { win } from '../test-helpers';
import { getMessage } from '../../../core/i18n';
import {
  queryHTML,
  waitFor,
  CliqzEvents,
} from '../test-helpers';

export function getLocalisedString(key) {
  return getMessage(key);
}

function getElementsFromParsedHTML({ rawHTML, selector }) {
  return new DOMParser().parseFromString(rawHTML, 'text/html')
    .querySelectorAll(selector);
}

export async function getElements({
  elementSelector,
  parentElementSelector = '[aria-label="result-card-0"]',
  url,
}) {
  const $elementsFromParsedHTML = [];

  return waitFor(async () => {
    const results = await queryHTML(url, parentElementSelector, 'innerHTML');

    if (results && results.length) {
      results.forEach((r) => {
        const $el = getElementsFromParsedHTML({ rawHTML: r, selector: elementSelector });
        [...$el].map($e => $elementsFromParsedHTML.push($e));
      });
      return $elementsFromParsedHTML;
    }

    return null;
  });
}
export const waitForPageLoad = url => new Promise((resolve) => {
  const pageLoad = CliqzEvents.subscribe('content:dom-ready', (_url) => {
    if (_url === url) {
      pageLoad.unsubscribe();
      resolve();
    }
  });
});
