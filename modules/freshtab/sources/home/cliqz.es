/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RemoteActionProvider from '../../core/helpers/remote-action-provider';
import createModuleWrapper from '../../core/helpers/action-module-wrapper';

class Cliqz {
  constructor() {
    this.state = {};

    // Bridge this context with background
    this.freshtab = createModuleWrapper('freshtab');
    this.core = createModuleWrapper('core');
    this.search = createModuleWrapper('search');
    this.controlCenter = createModuleWrapper('control-center');
    this.antiPhishing = createModuleWrapper('anti-phishing');

    this.actions = new RemoteActionProvider('freshtab', {
      renderResults: (response) => {
        this.storage.setState({
          results: response.results,
        });
      },
      updateSpeedDials: (dials, hasHidden) => {
        this.storage.setState({
          dials: {
            ...dials,
            isLoaded: true,
          },
          hasHistorySpeedDialsToRestore: hasHidden,
        });
      },
      updateBrowserTheme: (browserTheme) => {
        this.storage.setState(prevState => ({
          config: {
            ...prevState.config,
            browserTheme,
          },
        }));
      },
    });

    this.actions.init();

    window.addEventListener('unload', () => {
      this.actions.unload();
    }, { once: true });
  }

  setStorage(storage) {
    this.storage = storage;
  }
}

export default new Cliqz();
