/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const defaultSearchEngine = {
  name: 'Google',
  url: 'https://www.google.com/search?q=',
  default: true,
  getSubmissionForQuery: query => defaultSearchEngine.url + query,
};

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
  return defaultSearchEngine;
}

export function getSearchEngines() {
  return [defaultSearchEngine];
}

export function getSearchEnginesAsync() {
  return Promise.resolve([defaultSearchEngine]);
}

export function loadSearchEngines() { return Promise.resolve(); }

export function getEngineByName() {
  return '';
}

export function setDefaultSearchEngine({ name, url }) {
  defaultSearchEngine.name = name;
  defaultSearchEngine.url = url;
}

export function addEngineWithDetails() {
}

export function restoreHiddenSearchEngines() {
}

export function removeEngine() {
}

export function updateAlias() {}
