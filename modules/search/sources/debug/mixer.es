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
import createModuleWrapper from '../../core/helpers/spanan-module-wrapper';
import { COLORS, COLOR_MAP, IGNORED_PROVIDERS, IMAGE_PATHS } from './helpers';

const historySearch = createModuleWrapper('history-search').createProxy();

const app = {
  modules: {
    'history-search': {
      isReady() { return Promise.resolve(); },
      background: {
        actions: {
          search(...args) {
            return historySearch.search(...args);
          }
        }
      }
    }
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

setGlobal(app);

const $ = window.document.querySelector.bind(window.document);
const onlyHistory = window.location.href.endsWith('onlyhistory=true');

if (!onlyHistory) {
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
      }, 300);
    });
  };
}

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

  const rawConfig = getConfig({ isPrivateMode: false }, globalConfig.settings);
  // Enable both history and historyLookup
  const config = {
    ...rawConfig,
    providers: {
      ...rawConfig.providers,
      history: {
        ...rawConfig.providers.history,
        isEnabled: true,
      },
      historyLookup: {
        ...rawConfig.providers.historyLookup,
        isEnabled: true,
      }
    },
  };

  const ignoredHistoryProvider = rawConfig.providers.history.isEnabled ? 'historyLookup' : 'history';
  const ignoredProviders = IGNORED_PROVIDERS.concat(onlyHistory
    ? ['backend', 'cliqz', 'instant', 'custom-search']
    : [ignoredHistoryProvider]);

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

  Object.keys(background.providers).forEach((name) => {
    // needs additional input for search: depends on previous results
    if (ignoredProviders.indexOf(name) !== -1) return;

    const provider = background.providers[name];
    query1$
      .pipe(
        switchMap(query => provider.search(query, config, {})),
      )
      .subscribe((response) => {
        if (ignoredProviders.indexOf(response.provider) !== -1) return;

        if (!$(`#${response.provider}`)) {
          $mixer.appendChild(createProviderContainer(response.provider));
        }

        $(`#${response.provider}`).innerHTML = templates.mixerProviderResult(response);
      });
  });

  if (!onlyHistory) {
    results$.subscribe((r) => {
      $('#results').innerHTML = templates.mixerFinalResult(r);
    });
  }

  document.addEventListener('click', showPopup);
});
