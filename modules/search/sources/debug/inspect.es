/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fromEvent } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import background from '../background';
import getThrottleQueries from '../operators/streams/throttle-queries';
import getConfig from '../config';
import templates from '../templates';
import globalConfig from '../../core/config';
import { setTimeout } from '../../core/timers';


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

  const config = getConfig({ isPrivateMode: false }, globalConfig.settings);

  const query$ = fromEvent($urlbar, 'keyup')
    .pipe(
      map(() => $urlbar.value),
      getThrottleQueries(config)
    );

  background.init();

  const containers = new Map();

  Object.keys(background.providers).forEach((name) => {
    // needs additional input for search: depends on previous results
    if (name === 'richHeader') {
      return;
    }

    const provider = background.providers[name];

    query$
      .pipe(
        switchMap(query => provider.search(query, config, {})),
      )
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
