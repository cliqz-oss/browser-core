import Rx from '../platform/lib/rxjs';

import AppWindow from '../core/base/window';
import utils from '../core/utils';
import events from '../core/events';
import prefs from '../core/prefs';
import createUrlbarObservable from './observables/urlbar';
import logger from './logger';
import search from './search';
import telemetry from './telemetry';
import DEFAULT_CONFIG from './config';
import ObservableProxy from '../core/helpers/observable-proxy';

export default class SearchWindow extends AppWindow {
  events = {
    'urlbar:focus': () => {
      if (!this.isEnabled) {
        return;
      }
      this.focusEventProxy.next();
    },

    'urlbar:blur': () => {
      if (!this.isEnabled) {
        return;
      }
      this.blurEventProxy.next();
    },

    'urlbar:input': ({ query, isTyped }) => {
      if (!isTyped || !this.isEnabled) {
        return;
      }

      this.inputEventProxy.next(query);
    },

    'ui:click-on-url': (ev) => {
      if (!this.isEnabled) {
        return;
      }

      this.selectionEventProxy.next(ev);
    },
  };

  constructor(settings) {
    super(settings);
    this.background = settings.background;
  }

  get isEnabled() {
    return prefs.get('searchMode') === 'search';
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

    const focus$ = Rx.Observable.merge(
      this.focusEventProxy.observable.mapTo('focus'),
      this.blurEventProxy.observable.mapTo('blur'),
    ).share();

    const query$ = createUrlbarObservable(this.inputEventProxy.observable);

    const config = {
      ...DEFAULT_CONFIG,
      window: this.window,
      providers: {
        ...DEFAULT_CONFIG.providers,
        'query-suggestions': {
          get isEnabled() {
            return !utils.isPrivateMode(this.window)
              && DEFAULT_CONFIG.providers['query-suggestions'].isEnabled
              && (prefs.get('suggestionChoice', 0) === 2);
          },
        },
      },
    };

    const results$ = search(query$, focus$, this.background.providers, config).share();
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
}
