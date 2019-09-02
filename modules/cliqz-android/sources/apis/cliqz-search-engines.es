/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals ChromeUtils, ExtensionAPI */
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

function toSerializable(engine) {
  const queryPlaceholder = 'XXXXXX';
  const urlTypes = ['text/html', 'application/x-suggestions+json'];
  const serialized = {
    name: engine.name,
    icon: engine.iconURI.spec,
    searchForm: engine.searchForm,
    isDefault: Services.search.defaultEngine === engine,
    urls: {}
  };
  urlTypes.forEach((type) => {
    const submission = engine.getSubmission(queryPlaceholder, type);
    if (submission) {
      serialized.urls[type] = {
        template: submission.uri.spec.replace(queryPlaceholder, '{searchTerms}')
      };
    }
  });
  return serialized;
}

global.cliqzSearchEngines = class extends ExtensionAPI {
  getAPI() {
    return {
      cliqzSearchEngines: {
        getEngines: () => {
          const engines = Services.search.getEngines();
          return engines.map(toSerializable);
        },
        getDefaultEngine: () => toSerializable(Services.search.defaultEngine)
      }
    };
  }
};
