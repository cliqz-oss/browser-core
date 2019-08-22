/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {};

export function isSearchServiceReady() {
  return Promise.resolve();
}

export function getDefaultEngine() {
  return {};
}

export function revertToOriginalEngine() {
}

export function addCustomSearchEngine() {
}

export function getDefaultSearchEngine() {
  return { name: 'google', url: 'http://www.google.com/search?q=' };
}

export function restoreHiddenSearchEngines() {
}

export function getSearchEngines() {
  return [];
}

export function getSearchEnginesAsync() {
  return Promise.resolve([]);
}

export function loadSearchEngines() { return Promise.resolve(); }

export function getEngineByName() {
  return '';
}

export function updateAlias() {}

export function removeEngine() {}
