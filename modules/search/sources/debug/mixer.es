/* global window, document, Handlebars */
import { fromEvent, merge } from 'rxjs';
import { map, switchMap, mapTo, share } from 'rxjs/operators';
import background from '../background';
import getThrottleQueries from '../operators/streams/throttle-queries';
import getConfig from '../config';
import search from '../search';
import templates from '../templates';
import globalConfig from '../../core/config';
import pluckResults from '../operators/streams/pluck-results';
import { setGlobal } from '../../core/kord/inject';
import { parseKind } from '../telemetry';
import { RESULT_SOURCE_MAP } from '../../anolysis/metrics/search';

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

const $ = window.document.querySelector.bind(window.document);


browser.cliqz._unifiedSearch = browser.cliqz.unifiedSearch;
let lastQ = null;
// issuing same query multiple times gets trottled by the history search function
browser.cliqz.unifiedSearch = function _(q) {
  if (lastQ !== q) {
    lastQ = q;
    return browser.cliqz._unifiedSearch(q);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      browser.cliqz._unifiedSearch(q).then(resolve);
    }, 200);
  });
};

const createProviderContainer = (provider) => {
  const container = document.createElement('div');
  container.setAttribute('id', provider);
  return container;
};

const COLORS = {
  history: '990099',
  backend: '009900',
  cliqz: '009900',
  instant: 'ee2200',
  'custom-search': 'ee2200',
};

const COLOR_MAP = Object.keys(RESULT_SOURCE_MAP)
  .reduce((acc, p) => {
    const kinds = Object.keys(RESULT_SOURCE_MAP[p])
      .reduce((acc2, k) => {
        /* eslint-disable no-param-reassign */
        acc2[k] = {
          name: RESULT_SOURCE_MAP[p][k],
          kind: k,
          provider: p,
          color: COLORS[p] || '333333'
        };
        /* eslint-enable no-param-reassign */

        return acc2;
      }, {});


    return Object.assign({}, acc, kinds);
  }, {});

Handlebars.registerHelper('json', obj => new Handlebars.SafeString(JSON.stringify(obj, null, 4)));
Handlebars.registerHelper('kindColor', provider => COLORS[provider]);
Handlebars.registerHelper('desc', desc => desc || 'NO DESCRIPTION');
Handlebars.registerHelper('parseKind', kind => parseKind(kind).sources.map(s => COLOR_MAP[s]));

window.addEventListener('load', () => {
  const $urlbar = $('#urlbar');
  const $mixer = $('#mixer');

  $urlbar.value = '';
  setTimeout(() => $urlbar.focus(), 100);

  const config = getConfig({ isPrivateMode: false }, globalConfig.settings);

  const query$ = fromEvent($urlbar, 'keyup')
    .pipe(
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

  const results$ = search({ query$, focus$ },
    background.providers, config).pipe(pluckResults());

  const IGNORE = ['richHeader', 'cliqz::offers', 'querySuggestions', 'historyView', 'calculator'];

  Object.keys(background.providers).forEach((name) => {
    // needs additional input for search: depends on previous results
    if (IGNORE.indexOf(name) !== -1) return;

    const provider = background.providers[name];
    query1$
      .pipe(
        switchMap(query => provider.search(query, config, {})),
      )
      .subscribe((response) => {
        if (IGNORE.indexOf(response.provider) !== -1) return;

        if (!$(`#${response.provider}`)) {
          $mixer.appendChild(createProviderContainer(response.provider));
        }

        $(`#${response.provider}`).innerHTML = templates.mixer(response);
      });
  });

  results$.subscribe((r) => {
    $('#results').innerHTML = templates.mixerResult(r);
  });
});
