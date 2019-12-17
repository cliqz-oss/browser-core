/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../core/kord/inject';
import window from '../core/globals-window';

const core = inject.module('core');

function getHTML(originalURL) {
  return core.action('getHTML', originalURL).then((html) => {
    if (html) {
      return html;
    }
    throw new Error(`Failed to get content for tab with url=${originalURL}`);
  });
}

export function parseHtml(html) {
  if (!parseHtml.domParser) {
    parseHtml.domParser = new window.DOMParser();
  }

  return parseHtml.domParser.parseFromString(html, 'text/html');
}

/**
 * @param originalURL  URL as seen by the browser
 */
export function getContentDocument(originalURL) {
  return getHTML(originalURL).then(parseHtml);
}
