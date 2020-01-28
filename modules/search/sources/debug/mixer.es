/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global Handlebars */
import { fromEvent, merge } from 'rxjs';
import { map, switchMap, mapTo, share, tap } from 'rxjs/operators';
import background from '../background';
import getThrottleQueries from '../operators/streams/throttle-queries';
import getConfig from '../config';
import search from '../search';
import templates from '../templates';
import globalConfig from '../../core/config';
import pluckResults from '../operators/streams/pluck-results';
import { setGlobal } from '../../core/kord/inject';
import { parseKind } from '../telemetry';
import { COLORS, COLOR_MAP, IGNORED_PROVIDERS, IMAGE_PATHS } from './helpers';
import { overrideFetchHandler, fetch } from '../../core/http';
import { setTimeout } from '../../core/timers';

const app = {
  modules: {
  },
  services: {
    logos: {
      api: {
        getLogoDetails() {
          return {};
        },
      },
    },
  },
};

let fullJson = {};

setGlobal(app);

const $ = window.document.querySelector.bind(window.document);

browser.cliqzHistory._unifiedSearch = browser.cliqzHistory.unifiedSearch;
let lastQ = null;
// issuing same query multiple times gets trottled by the history search function
browser.cliqzHistory.unifiedSearch = function _(q) {
  if (lastQ !== q) {
    lastQ = q;
    return browser.cliqzHistory._unifiedSearch(q)
      .then((searchResults) => {
        fullJson.history = searchResults.results;
        return searchResults;
      });
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      browser.cliqzHistory._unifiedSearch(q)
        .then((searchResults) => {
          fullJson.history = searchResults.results;
          return searchResults;
        })
        .then(resolve);
    }, 300);
  });
};

const rawConfig = getConfig({ isPrivateMode: false }, globalConfig.settings);
overrideFetchHandler(() => (url, ...args) => {
  if (url.startsWith(rawConfig.settings.RESULTS_PROVIDER)) {
    return fetch(url, ...args)
      .then(fetchResults => fetchResults.json())
      .then((z) => {
        // prevent shallow copy of results
        fullJson.cliqz = JSON.parse(JSON.stringify(z.results));
        return {
          json() {
            return Promise.resolve(z);
          }
        };
      });
  }
  return fetch(url, ...args);
});

const createProviderContainer = (provider) => {
  const container = document.createElement('div');
  container.setAttribute('id', provider);
  return container;
};

const showPopup = (event) => {
  if (!event.target.parentNode.getAttribute) {
    return;
  }

  const popup = document.getElementById('popup');
  const jsonContainer = popup.querySelector('#data-json');
  const json = event.target.parentNode.getAttribute('data-json');

  if (
    (event.target.classList.contains('ellipsis'))
    || (event.target.classList.contains('kind'))
    || (event.target.classList.contains('image'))
  ) {
    popup.className = '';
    jsonContainer.innerHTML = `${json}`;
  } else if (event.target.classList.contains('close')) {
    popup.className = 'hidden';
  }
};

const updateTextArea = () => {
  const jsonTextArea = document.getElementById('full-json');

  jsonTextArea.innerHTML = JSON.stringify(fullJson, null, 2);
};

Handlebars.registerPartial('parseKind', templates['partials/parseKind']);
Handlebars.registerPartial('resultContent', templates['partials/resultContent']);

Handlebars.registerHelper('json', obj => JSON.stringify(obj, null, 4));
Handlebars.registerHelper('kindColor', provider => COLORS[provider]);
Handlebars.registerHelper('desc', desc => desc || 'NO DESCRIPTION');
Handlebars.registerHelper('parseKind', kind => parseKind(kind).sources.map(s => COLOR_MAP[s]));
Handlebars.registerHelper('checkImg', (json) => {
  const parsedJson = JSON.parse(json);

  const getNestedJsonField = (nestedPath, data) => nestedPath.reduce((xs, x) => (
    (xs && xs[x]) ? xs[x] : null
  ), data);

  const images = IMAGE_PATHS
    .map(path => getNestedJsonField(path, parsedJson))
    .filter(path => path !== null);

  return images.length > 0 ? images[0] : '';
});

window.addEventListener('load', () => {
  const $urlbar = $('#urlbar');
  const $mixer = $('#mixer');

  $urlbar.value = '';
  setTimeout(() => $urlbar.focus(), 100);

  const config = getConfig({ isPrivateMode: false }, globalConfig.settings);

  const query$ = fromEvent($urlbar, 'keyup')
    .pipe(
      // make sure displayed JSON does not have data from the previous search
      tap(() => { fullJson = {}; }),
      map(() => ({ query: $urlbar.value })),
      getThrottleQueries(config),
      share(),
    );

  const query1$ = query$
    .pipe(
      map(({ query }) => query),
    );

  const focus$ = merge(
    fromEvent($urlbar, 'focus')
      .pipe(mapTo({ event: 'focus' })),
    fromEvent($urlbar, 'blur')
      .pipe(mapTo({ event: 'blur' }))
  );

  background.init();

  const results$ = search({ query$, focus$ }, background.providers, config)
    .pipe(pluckResults());

  Object.keys(background.providers).forEach((name) => {
    // needs additional input for search: depends on previous results
    if (IGNORED_PROVIDERS.indexOf(name) !== -1) return;

    const provider = background.providers[name];
    query1$
      .pipe(
        switchMap(query => provider.search(query, config, {})),
      )
      .subscribe((response) => {
        if (IGNORED_PROVIDERS.indexOf(response.provider) !== -1) return;

        if (!$(`#${response.provider}`)) {
          $mixer.appendChild(createProviderContainer(response.provider));
        }

        $(`#${response.provider}`).innerHTML = templates.mixerProviderResult(response);

        if (
          (response.provider === 'instant')
          && (response.results.length > 0)
        ) {
          fullJson.instant = response.results[0].links;
        }
        updateTextArea();
      });
  });

  results$.subscribe((r) => {
    $('#results').innerHTML = templates.mixerFinalResult(r);
    fullJson.final = r;
    updateTextArea();
  });

  document.addEventListener('click', showPopup);
});
