/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { registerContentScript } from '../core/content/register';

function contentScript(window, chrome, CLIQZ) {
  const URLSearchParams = window.URLSearchParams;
  const searchParams = new URLSearchParams(window.location.search);
  const queries = searchParams.getAll('q');
  const query = queries[queries.length - 1];

  function queryCliqz(q) {
    CLIQZ.app.modules.core.action('queryCliqz', decodeURIComponent(q));
  }

  if (!query) {
    return;
  }

  queryCliqz(query);

  window.document.addEventListener('DOMContentLoaded', () => {
    const content = window.document.querySelector('.post-content');
    if (content) {
      content.innerHTML = '';

      const rowContainer = window.document.createElement('div');
      rowContainer.classList.add('row-container');

      const row = window.document.createElement('div');
      row.classList.add('row');
      row.classList.add('limit-width');
      row.classList.add('row-parent');
      rowContainer.appendChild(row);

      const p = window.document.createElement('p');
      // TODO: need translations
      p.innerText = 'Search Cliqz for: ';
      row.appendChild(p);

      const anchor = window.document.createElement('a');
      anchor.innerText = query;
      anchor.classList.add('btn');
      anchor.addEventListener('click', queryCliqz.bind(null, query));
      p.appendChild(anchor);

      content.appendChild(rowContainer);
    }
  });
}

registerContentScript({
  module: 'history',
  matches: [
    'https://cliqz.com/search?q=*',
  ],
  js: [contentScript],
});
