import AppWindow from '../core/base/window';
import utils from '../core/utils';
import { getMessage } from '../core/i18n';
import prefs from '../core/prefs';
import events from '../core/events';
import createUrlbarObservable from './observables/urlbar';
import logger from './logger';
import search from './search';
import telemetry from './telemetry';
import telemetryLatency from './telemetry-latency';
import getConfig from './config';
import ObservableProxy from '../core/helpers/observable-proxy';
import { getSearchEngines } from '../core/search-engines';
import { integersToHistogram } from '../anolysis/analyses/search';

function getProviders() {
  const all = JSON.parse(prefs.get('config_backends', '["de"]'))
    .reduce((acc, cur) => {
      acc[cur] = {
        selected: cur === prefs.get('backend_country', 'de'),
        name: getMessage(`country_code_${cur.toUpperCase()}`),
      };

      return acc;
    }, {});

  if (prefs.has('backend_country.override')) {
    const customCountry = prefs.get('backend_country.override');
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
      this.focusEventProxy.next({ event: 'focus' });
    },

    'urlbar:blur': () => {
      this.focusEventProxy.next({ event: 'blur' });
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

    'dropdown:result-highlight': () => {
      this.resultHighlightEventProxy.next();
    },

    'urlbar:dropmarker-click': () => {
      this.focusEventProxy.next({ event: 'focus' });
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
    this.selectionEventProxy = new ObservableProxy();
    this.resultHighlightEventProxy = new ObservableProxy();

    const focus$ = this.focusEventProxy.observable.share();

    const query$ = createUrlbarObservable(this.inputEventProxy.observable);

    const config = getConfig({
      isPrivateMode: utils.isPrivateMode(this.window),
    });

    const highlight$ = this.resultHighlightEventProxy.observable.share();
    const results$ = search({ query$, focus$, highlight$ },
      this.background.providers, config).share();
    const selection$ = this.selectionEventProxy.observable;

    const telemetry$ = telemetry(focus$, query$, results$, selection$);
    this.telemetrySubscription = telemetry$.subscribe(
      data => utils.telemetry(data, false, 'search.session'),
      error => logger.error('Failed preparing telemetry', error));

    const telemetryLatency$ = telemetryLatency(focus$, query$, results$);
    const sendLatencyTelemery = (data) => {
      if (data.length) {
        // All data elements have the same backendCountry
        const backend = data[0].backendCountry;

        const smallLatencies = data.reduce((acc, { latency }) =>
          [...acc, ...latency < 200 ? [latency] : []], []);
        const bigLatencies = data.reduce((acc, { latency }) =>
          [...acc, ...latency >= 200 ? [latency] : []], []);
        const smallLatenciesHistogram = integersToHistogram(smallLatencies, { binSize: 20 });
        const bigLatenciesHistogram = integersToHistogram(bigLatencies, { binSize: 100 });

        const latency = Object.assign({}, smallLatenciesHistogram, bigLatenciesHistogram);
        utils.telemetry({ backend, latency }, false, 'metrics.search.latency');
      }
    };
    this.telemetryLatencySubscription = telemetryLatency$.subscribe(
      data => sendLatencyTelemery(data),
      error => logger.error('Failed preparing latency telemetry', error)
    );

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
    if (this.telemetrySubscription) {
      this.telemetrySubscription.unsubscribe();
    }
    if (this.telemetryLatencySubscription) {
      this.telemetryLatencySubscription.unsubscribe();
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
