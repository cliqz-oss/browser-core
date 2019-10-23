/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global Handlebars */

import { fromEvent, merge } from 'rxjs';
import { map, mapTo } from 'rxjs/operators';

import search from '../search';
import background from '../background';
import getThrottleQueries from '../operators/streams/throttle-queries';
import getConfig from '../config';
import Results from '../../dropdown/results';
import Dropdown from '../../dropdown/dropdown';
import templates from '../../dropdown/templates';
import helpers from '../../dropdown/helpers';
import { setGlobal } from '../../core/kord/inject';
import { setTimeout } from '../../core/timers';
import pluckResults from '../operators/streams/pluck-results';

const app = {
  modules: {},
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

setGlobal(app);

Handlebars.partials = templates;

Object.keys(helpers).forEach((helperName) => {
  Handlebars.registerHelper(helperName, helpers[helperName]);
});

const $ = window.document.querySelector.bind(window.document);

window.addEventListener('load', () => {
  const stylesheet = document.createElement('link');
  stylesheet.setAttribute('rel', 'stylesheet');
  stylesheet.setAttribute('href', `chrome://cliqz/content/dropdown/styles/styles.css?r=${Date.now()}`);
  document.head.appendChild(stylesheet);

  const $urlbar = $('#urlbar');
  const $results = $('#results');
  $urlbar.value = '';
  setTimeout(() => $urlbar.focus(), 100);

  const config = getConfig({ isPrivateMode: false });

  const query$ = fromEvent($urlbar, 'keyup')
    .pipe(
      map(() => ({ query: $urlbar.value })),
      getThrottleQueries(config)
    );

  const focus$ = merge(
    fromEvent($urlbar, 'focus')
      .pipe(mapTo({ event: 'focus' })),
    fromEvent($urlbar, 'blur')
      .pipe(mapTo({ event: 'blur' }))
  );

  background.init();

  const results$ = search({ query$, focus$ },
    background.providers, config).pipe(pluckResults());

  const dropdown = new Dropdown($results, window);

  results$.subscribe((r) => {
    const rr = new Results({
      query: 'aa',
      rawResults: r,
    }, {
      assistants: {
        settings: {},
      },
    });
    dropdown.renderResults(rr);
  });
});
