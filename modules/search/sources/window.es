import Rx from '../platform/lib/rxjs';

import events from '../core/events';
import prefs from '../core/prefs';
import { Window } from '../core/browser';
import createUrlbarObservable from './observables/urlbar';
import mixed from './search';

export default class {
  constructor({ window }) {
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

    const focus = Rx.Observable
      .fromEvent(this.window.gURLBar, 'focus');

    const searchString = keyup
      .map(e => e.target.mController.searchString);

    const input = createUrlbarObservable(searchString);

    const results = mixed(input, focus);

    results.subscribe((r) => {
      events.pub('search:results', {
        windowId: this.id,
        results: r,
      });
    });
  }

  unload() {

  }
}
