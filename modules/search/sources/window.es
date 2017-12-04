import Rx from '../platform/lib/rxjs';

import utils from '../core/utils';
import events from '../core/events';
import prefs from '../core/prefs';
import { Window } from '../core/browser';
import createUrlbarObservable from './observables/urlbar';
import search from './search';
import DEFAULT_CONFIG from './config';

export default class {
  constructor({ window, background }) {
    this.background = background;
    this.window = window;
    this.id = (new Window(window)).id;
  }

  init() {
    if (prefs.get('searchMode', 'autocomplete') !== 'search') {
      return;
    }

    // we take the parent of urlbar as urlbar gets replaced during ui/window#init
    const keyup = Rx.Observable
      .fromEvent(this.window.gURLBar.parentElement, 'keyup');

    const focus = Rx.Observable.merge(
      Rx.Observable
        .fromEvent(this.window.gURLBar, 'focus')
        .mapTo('focus'),
      Rx.Observable
        .fromEvent(this.window.gURLBar, 'blur')
        .mapTo('blur'));

    const searchString = keyup
      .map(e => e.target.mController.searchString);

    const input = createUrlbarObservable(searchString)
      .filter(() => this.window.gURLBar.valueIsTyped);

    const config = {
      ...DEFAULT_CONFIG,
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

    const results = search(input, focus, this.background.providers, config);

    this.resultsSubscription = results.subscribe((r) => {
      events.pub('search:results', {
        windowId: this.id,
        results: r,
      });
    });
  }

  unload() {
    this.resultsSubscription.unsubscribe();
  }
}
