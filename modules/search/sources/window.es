import Rx from '../platform/lib/rxjs';

import AppWindow from '../core/base/window';
import utils from '../core/utils';
import events from '../core/events';
import createUrlbarObservable from './observables/urlbar';
import logger from './logger';
import search from './search';
import telemetry from './telemetry';
import getConfig from './config';
import ObservableProxy from '../core/helpers/observable-proxy';
import { getSearchEngines } from '../core/search-engines';

function getProviders() {
  const all = JSON.parse(utils.getPref('config_backends', '["de"]'))
    .reduce((acc, cur) => {
      acc[cur] = {
        selected: cur === utils.getPref('backend_country', 'de'),
        name: utils.getLocalizedString(`country_code_${cur.toUpperCase()}`),
      };

      return acc;
    }, {});

  if (utils.hasPref('backend_country.override')) {
    const customCountry = utils.getPref('backend_country.override');
    all[customCountry] = {
      selected: true,
      name: `Custom - [${customCountry}]`
    };
  }

  return all;
}

export default class SearchWindow extends AppWindow {
  events = {
    'urlbar:focus': () => {
      this.focusEventProxy.next();
    },

    'urlbar:blur': () => {
      this.blurEventProxy.next();
    },

    'urlbar:input': (ev) => {
      if (!ev.isTyped) {
        return;
      }
      this.inputEventProxy.next(ev);
    },

    'ui:click-on-url': (ev) => {
      this.selectionEventProxy.next(ev);
    },

    'dropdown:result-selected': () => {
      this.resultHighlightEventProxy.next();
    },

    'urlbar:dropmarker-click': () => {
      this.focusEventProxy.next();
      this.inputEventProxy.next({ query: '', allowEmptyQuery: true });
    },
  };

  constructor(settings) {
    super(settings);
    this.background = settings.background;
  }

  init() {
    super.init();

    // use 'input' instead of 'keyup' to also get input set via
    // `setUserInput`, for example from `queryCliqz`; we take
    // the parent of urlbar as urlbar gets replaced during `ui/window#init`
    this.inputEventProxy = new ObservableProxy();
    this.focusEventProxy = new ObservableProxy();
    this.blurEventProxy = new ObservableProxy();
    this.selectionEventProxy = new ObservableProxy();
    this.resultHighlightEventProxy = new ObservableProxy();

    const focus$ = Rx.Observable.merge(
      this.focusEventProxy.observable.mapTo('focus'),
      this.blurEventProxy.observable.mapTo('blur'),
    ).share();

    const query$ = createUrlbarObservable(this.inputEventProxy.observable);

    const config = getConfig({
      isPrivateMode: utils.isPrivateMode(this.window),
    });

    const highlight$ = this.resultHighlightEventProxy.observable.share();
    const results$ = search({ query$, focus$, highlight$ },
      this.background.providers, config).share();
    const selection$ = this.selectionEventProxy.observable;

    const telemetry$ = telemetry(focus$, results$, selection$);
    telemetry$.subscribe(data => utils.telemetry(data),
      error => logger.error('Failed preparing telemetry', error));

    this.resultsSubscription = results$.subscribe((r) => {
      events.pub('search:results', {
        windowId: this.windowId,
        results: r,
      });
    });
  }

  unload() {
    super.unload();
    if (this.resultsSubscription) {
      this.resultsSubscription.unsubscribe();
    }
  }

  status() {
    let engines = [];

    try {
      engines = getSearchEngines();
    } catch (e) {
      // may be not initailized yet
    }

    return {
      visible: true,
      state: engines,
      supportedIndexCountries: getProviders(),
    };
  }
}
