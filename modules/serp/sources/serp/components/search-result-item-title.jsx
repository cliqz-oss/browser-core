/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { getMaxHeightValue } from './search-result-item-helper';

const handleTitleBlockContent = (element, text) => {
  if (!element) {
    return;
  }

  const maxHeightValue = getMaxHeightValue(element);
  let lastDashIndex = text.lastIndexOf('-');

  if (lastDashIndex === -1) {
    lastDashIndex = text.length;
  } else if (text.length - lastDashIndex > lastDashIndex) {
    lastDashIndex = text.length;
  }

  const nextText = text.split('');
  const scrollHeight = element.scrollHeight;

  if (scrollHeight <= maxHeightValue) {
    element.classList.remove('searchbox-results-item-title-invisible');
    return;
  }

  while (element.scrollHeight > maxHeightValue) {
    nextText.splice(lastDashIndex - 1, 1);
    element.innerHTML = nextText.join(''); // eslint-disable-line no-param-reassign
    lastDashIndex -= 1;
  }

  nextText.splice(lastDashIndex - 4, 4, '...');
  element.innerHTML = nextText.join(''); // eslint-disable-line no-param-reassign
  element.classList.remove('searchbox-results-item-title-invisible');
};

export default ({
  item = {},
  shouldHandleSearchResultItemView,
} = {}) => (
  <a
    href={item.href}
    className="searchbox-results-item-title searchbox-results-item-title-invisible"
    data-telemetry="result"
    data-telemetry-element="title"
    ref={element =>
      shouldHandleSearchResultItemView
      && handleTitleBlockContent(element, item.title)
    }
  >
    {item.title}
  </a>
);
