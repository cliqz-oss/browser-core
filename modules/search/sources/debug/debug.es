/* global window, document, Handlebars */

import Rx from '../../platform/lib/rxjs';
import search from '../search';
import background from '../background';
import getThrottleQueries from '../operators/streams/throttle-queries';
import getConfig from '../config';
import Results from '../../dropdown/results';
import Dropdown from '../../dropdown/dropdown';
import templates from '../../dropdown/templates';
import helpers from '../../dropdown/helpers';
import { setGlobal } from '../../core/kord/inject';
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

  const query$ = Rx.Observable
    .fromEvent($urlbar, 'keyup')
    .map(() => ({ query: $urlbar.value }))
    .let(getThrottleQueries(config));

  const focus$ = Rx.Observable.merge(
    Rx.Observable
      .fromEvent($urlbar, 'focus')
      .mapTo({ event: 'focus' }),
    Rx.Observable
      .fromEvent($urlbar, 'blur')
      .mapTo({ event: 'blur' }));

  background.init();

  const results$ = search({ query$, focus$ },
    background.providers, config).let(pluckResults());

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
