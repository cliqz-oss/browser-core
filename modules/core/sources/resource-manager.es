/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

class ResourceManager {
  constructor() {
    this.loaders = [];
    this.initialised = false;
  }

  init() {
    const loadPromises = this.loaders.map(e => this._startLoader(e.loader, e.callback));
    this.initialised = true;
    return Promise.all(loadPromises);
  }

  unload() {
    this.loaders.forEach((e) => {
      e.loader.stop();
    });
    this.initialised = false;
  }

  addResourceLoader(resourceLoader, callback) {
    this.loaders.push({
      loader: resourceLoader,
      callback,
    });
    if (this.initialised) {
      // extension is already running, we can load this resource straight away
      this._startLoader(resourceLoader, callback);
    }
  }

  _startLoader(resourceLoader, callback) {
    resourceLoader.onUpdate(callback);
    return resourceLoader.load().then(callback);
  }
}

const manager = new ResourceManager();

export default manager;
