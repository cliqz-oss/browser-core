/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { getResourceUrl } from '../core/platform';
import UI from './ui';
import { getActiveTab } from '../platform/browser';
import { chrome } from '../platform/globals';
import { createUITourTarget, deleteUITourTarget } from '../core/ui-tour';

export default background({
  init() {
    this.UI = new UI();
    if (chrome.i18n) {
      this.UI.init();
    }

    const styleUrl = getResourceUrl('video-downloader/styles/xul.css');
    chrome.cliqz.initTheme(styleUrl, 'video-downloader-stylesheet');
    createUITourTarget('video-downloader', '#pageAction-urlbar-cliqz_cliqz_com', 'pageAction-urlbar-cliqz_cliqz_com');
    createUITourTarget('downloads-button', '#downloads-button', 'downloads-button');
  },

  unload() {
    if (this.UI) this.UI.unload();
    deleteUITourTarget('video-downloader');
    deleteUITourTarget('downloads-button');
  },

  actions: {
    async getVideoLinks(originalUrl) {
      const url = originalUrl || (await getActiveTab()).url;
      return this.UI.getVideoLinks(url);
    },
    download(data) {
      this.UI.download(data);
    },
  }
});
