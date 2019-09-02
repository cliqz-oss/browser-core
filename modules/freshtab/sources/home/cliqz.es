/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global window */

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
        this.storage.setState(() => ({
          results: response.results,
        }));
      },
      closeNotification: (messageId) => {
        this.storage.setState((prevState) => {
          const messages = Object.assign({}, prevState.messages);
          delete messages[messageId];
          return {
            messages,
          };
        });
      },
      addMessage: (message) => {
        this.storage.setState(prevState => ({
          messages: {
            ...prevState.messages,
            [message.id]: message,
          }
        }));
      }
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
