/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { expect, urlbar, $cliqzResults } from '../helpers';

export async function expectSelection(selector, urlBarText) {
  expect(await $cliqzResults.querySelector(selector)).to.have.class('selected');
  expect(await $cliqzResults.querySelectorAll('.selected')).to.have.length(1);
  return expect(await urlbar.textValue).to.equal(urlBarText);
}

export function visibleValue(url) {
  let visibleUrl = url.startsWith('http:') ? url.slice(7) : url;
  visibleUrl = visibleUrl.endsWith('/') ? visibleUrl.slice(0, -1) : visibleUrl;
  return visibleUrl;
}

export function visibleAutocompetedValue(url) {
  let visibleUrl = url.startsWith('http:') ? url.slice(7) : url;
  visibleUrl = visibleUrl.startsWith('https:') ? visibleUrl.slice(8) : visibleUrl;
  visibleUrl = visibleUrl.startsWith('www.') ? visibleUrl.slice(4) : visibleUrl;
  visibleUrl = visibleUrl.endsWith('/') ? visibleUrl.slice(0, -1) : visibleUrl;
  return visibleUrl;
}
