/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../../core/prefs';
import i18n from '../../core/i18n';
import console from '../../core/console';
import NonDefaultProviders from './custom-engines-list';
import * as searchUtils from '../../core/search-engines';

const INIT_KEY = 'newProvidersAdded';
const LOG_KEY = 'NonDefaultProviders.jsm';
const KEY = '#';

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp

const SEARCH_ENGINE_ALIAS = {
  YouTube: '#yt',
  'Google Images': '#gi',
  'Google Maps': '#gm',
};

const addCustomProviders = () => {
  let providersAddedState;
  let maxState = -1;
  let newProviderIsAdded = false;

  if (typeof prefs.get(INIT_KEY) === 'boolean') {
    providersAddedState = 1;
  } else {
    providersAddedState = prefs.get(INIT_KEY, 0);
  }

  // we only add non default search providers for the languages we support
  (NonDefaultProviders[i18n.PLATFORM_LANGUAGE] || []).forEach((extern) => {
    try {
      if (providersAddedState < extern.state) {
        maxState = extern.state > maxState ? extern.state : maxState;
        const existedEngine = searchUtils.getEngineByName(extern.name);
        if (!existedEngine) {
          console.log(LOG_KEY, `Added ${extern.name}`, LOG_KEY);
          searchUtils.addEngineWithDetails(extern);
        } else {
          // Keep the current alias just in case user has changed it
          if (!extern.overrideAlias && existedEngine.alias) {
            /* eslint-disable no-param-reassign */
            extern.key = existedEngine.alias;
            /* eslint-enable no-param-reassign */
          }
          searchUtils.removeEngine(extern.name);
          console.log(LOG_KEY, `Updated ${extern.name}`);
          searchUtils.addEngineWithDetails(extern);
        }
      }
    } catch (e) {
      console.log(LOG_KEY, 'error', e);
    }
  });

  if (maxState > 0) {
    prefs.set(INIT_KEY, maxState);
    newProviderIsAdded = true;
  }

  return newProviderIsAdded;
};

const createShortcut = (name) => {
  if (SEARCH_ENGINE_ALIAS[name]) {
    return SEARCH_ENGINE_ALIAS[name];
  }

  return `${KEY}${name.substring(0, 2).toLowerCase()}`;
};

const updateAlias = (name, newAlias) => {
  searchUtils.updateAlias(name, newAlias);
  console.log(LOG_KEY, `Alias of engine "${name}" was updated to "${newAlias}`);
};


const updateEngineAliases = () => {
  searchUtils.getSearchEngines().forEach((engine) => {
    let alias = engine.alias;
    if (!alias) {
      alias = createShortcut(engine.name);
    }
    updateAlias(engine.name, alias);
  });
};

export default function () {
  if (prefs.get('restoredDefaultSearchEnginesOnce', false) === false) {
    // the actual changes might happen later if the search system needs time
    // to initialize
    searchUtils.restoreHiddenSearchEngines();
    prefs.set('restoredDefaultSearchEnginesOnce', true);
  }

  const newProviderAdded = addCustomProviders();

  if (newProviderAdded) {
    updateEngineAliases();
  }
}
