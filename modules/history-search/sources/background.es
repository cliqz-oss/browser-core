/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import WorkerManager from './worker-manager';
import prefs from '../core/prefs';

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  enabled() {
    return true;
  },

  /**
    @method init
    @param settings
  */
  init() {
    if (prefs.get('historyLookupEnabled', false)) {
      this.startWorker();
    }
  },

  unload() {
    this.stopWorker();
  },

  startWorker() {
    if (!this.workerManager) {
      this.workerManager = new WorkerManager();
    }
  },

  stopWorker() {
    if (this.workerManager) {
      this.workerManager.unload();
      this.workerManager = null;
    }
  },

  beforeBrowserShutdown() {

  },

  events: {
    prefchange: function onPrefChanged(pref) {
      if (pref === 'historyLookupEnabled') {
        if (prefs.get('historyLookupEnabled', false)) {
          this.startWorker();
        } else {
          this.stopWorker();
        }
      }
    },
  },

  actions: {
    search(query) {
      return new Promise((resolve) => {
        this.workerManager.searchFromHistory(query, resolve);
      });
    }
  }
});
