/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { getMaxHeightValue } from './search-result-item-helper';

const handleUrlBlockContent = (element, text) => {
  if (!element) {
    return;
  }

  const maxHeightValue = getMaxHeightValue(element);
  let slashIndex = text.lastIndexOf('/');
  if (slashIndex === -1) {
    element.classList.remove('searchbox-results-item-url-invisible');
    return;
  }

  const nextText = text.split('');
  const scrollHeight = element.scrollHeight;

  if (scrollHeight <= maxHeightValue) {
    element.classList.remove('searchbox-results-item-url-invisible');
    return;
  }

  while (element.scrollHeight > maxHeightValue) {
    nextText.splice(slashIndex + 1, 1);
    element.innerHTML = nextText.join(''); // eslint-disable-line no-param-reassign

    if (slashIndex + 1 > nextText.length - 1) {
      slashIndex = nextText.join('').lastIndexOf('/', slashIndex - 1);
    }
  }

  nextText.splice(slashIndex + 1, 4, '...');
  element.innerHTML = nextText.join(''); // eslint-disable-line no-param-reassign
  element.classList.remove('searchbox-results-item-url-invisible');
};

export default ({
  item = {},
  shouldHandleSearchResultItemView,
} = {}) => (
  <a
    href={item.href}
    className="searchbox-results-item-url searchbox-results-item-url-invisible"
    data-telemetry="result"
    data-telemetry-element="url"
    ref={element =>
      shouldHandleSearchResultItemView
      && handleUrlBlockContent(element, item.hrefText)
    }
  >
    {item.hrefText}
  </a>
);
