/* global window, document */

import background from '../background';
import getThrottleQueries from '../operators/streams/throttle-queries';
import getConfig from '../config';
import Rx from '../../platform/lib/rxjs';
import templates from '../templates';


const $ = window.document.querySelector.bind(window.document);

const createProviderContainer = (provider) => {
  const container = document.createElement('div');
  container.setAttribute('id', provider);
  return container;
};

window.addEventListener('load', () => {
  const $providers = $('#providers');
  const $urlbar = $('#urlbar');
  $urlbar.value = '';
  setTimeout(() => $urlbar.focus(), 100);

  const config = getConfig({ isPrivateMode: false });

  const query$ = Rx.Observable
    .fromEvent($urlbar, 'keyup')
    .map(() => $urlbar.value)
    .let(getThrottleQueries(config));

  background.init();

  const containers = new Map();

  Object.keys(background.providers).forEach((name) => {
    // needs additional input for search: depends on previous results
    if (name === 'richHeader') {
      return;
    }

    const provider = background.providers[name];

    query$
      .switchMap(query => provider.search(query, config, {}))
      .subscribe((response) => {
        if (!containers.has(response.provider)) {
          const container = createProviderContainer(response.provider);
          $providers.appendChild(container);
          containers.set(response.provider, container);
        }

        const container = containers.get(response.provider);
        container.innerHTML = templates.response(response);
      });
  });
});
