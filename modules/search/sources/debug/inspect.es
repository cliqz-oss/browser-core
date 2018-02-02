/* global window, document */

import background from '../background';
import createUrlbarObservable from '../observables/urlbar';
import DEFAULT_CONFIG from '../config';
import Rx from '../../platform/lib/rxjs';
import templates from '../templates';


const $ = window.document.querySelector.bind(window.document);

window.addEventListener('load', () => {
  const $providers = $('#providers');
  const $urlbar = $('#urlbar');
  $urlbar.value = '';
  setTimeout(() => $urlbar.focus(), 100);

  // TODO: adaptive debounce (only when typing fast)
  const query$ = createUrlbarObservable(
    Rx.Observable
      .fromEvent($urlbar, 'keyup')
      .map(() => $urlbar.value)
  );

  background.init();

  Object.keys(background.providers).forEach((name) => {
    // needs additional input for search: depends on previous results
    if (name === 'richHeader') {
      return;
    }

    const container = document.createElement('div');
    container.setAttribute('id', name);
    container.innerHTML = templates.response({ provider: name });
    $providers.appendChild(container);

    const provider = background.providers[name];
    query$
      .switchMap(query => provider.search(query, DEFAULT_CONFIG))
      // .do(response => console.log(response))
      .subscribe((response) => { container.innerHTML = templates.response(response); });
  });
});
