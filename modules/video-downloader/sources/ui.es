/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../core/prefs';
import { strip } from '../core/url';
import { isVideoURL, getVideoInfo } from './video-downloader';
import CliqzEvents from '../core/events';
import console from '../core/console';
import { getMessage } from '../core/i18n';
import { chrome } from '../platform/globals';
import { showUITour, hideUITour } from '../core/ui-tour';
import { getResourceUrl } from '../core/platform';

const UI_TOUR_PREF = 'videoDownloaderUITourDismissed';
const ONE_DAY = 24 * 60 * 60 * 1000;

export default class UI {
  constructor() {
    this.actions = {
      checkForVideoLink: this.checkForVideoLink.bind(this),
      download: this.download.bind(this),
      hideButton: this.hideButton.bind(this),
    };
  }

  init() {
    CliqzEvents.sub('core.location_change', this.actions.checkForVideoLink);
    CliqzEvents.sub('core.tab_state_change', this.actions.checkForVideoLink);
  }

  unload() {
    CliqzEvents.un_sub('core.tab_state_change', this.actions.checkForVideoLink);
    CliqzEvents.un_sub('core.location_change', this.actions.checkForVideoLink);
  }

  openPage(url) {
    chrome.omnibox2.navigateTo(url, { target: 'tab' });
  }

  hideButton(tabId) {
    if (typeof browser !== 'undefined') {
      browser.pageAction.hide(tabId);
    }

    hideUITour();
  }

  showButton(tabId) {
    if (typeof browser !== 'undefined') {
      browser.pageAction.show(tabId);
    }

    setTimeout(() => {
      this.showVDUITour();
    }, 1000);
  }

  cleanUrl(url) {
    return strip(url, {
      protocol: true,
      www: true,
      mobile: true,
      trailingSlash: true,
    });
  }

  checkForVideoLink(url, _, tabId) {
    if (isVideoURL(this.cleanUrl(url))) {
      this.showButton(tabId);
    } else {
      this.hideButton(tabId);
    }
  }

  // used for a first faster rendering
  async getVideoLinks(originalUrl) {
    this.markUITourDismissed(UI_TOUR_PREF);
    hideUITour();

    const url = this.cleanUrl(originalUrl);
    try {
      const formats = await getVideoInfo(url);
      if (formats.length > 0) {
        const options = JSON.parse(prefs.get('videoDownloaderOptions', '{}'));
        const audioFile = formats.find(format => format.class === 'audio');
        if (audioFile) {
          audioFile.name = getMessage('video_downloader_audio_label');
        }
        const desiredFormat = formats.find(format =>
          format.name.toLowerCase().replace(' ', '_') === options.quality) || formats[0];
        desiredFormat.selected = true;

        return {
          formats,
          origin: encodeURI(originalUrl)
        };
      }

      return { unSupportedFormat: true };
    } catch (e) {
      console.error('Error getting video links', e);

      return {
        unSupportedFormat: true,
        isLiveVideo: e && e.message === 'live_video'
      };
    }
  }

  isUITourDismissed(prefName) {
    const lastSkip = prefs.get(prefName, '0');

    if (lastSkip === 'dismissed') {
      return true;
    }

    if (Number(lastSkip) + ONE_DAY < Date.now()) {
      return false;
    }

    return true;
  }

  markUITourDismissed(prefName, isSkipping) {
    if (isSkipping) {
      prefs.set(prefName, Date.now().toString());
    } else {
      prefs.set(prefName, 'dismissed');
    }
  }

  showVDUITour() {
    if (this.isUITourDismissed(UI_TOUR_PREF)) {
      return;
    }

    const settings = {
      targetId: 'video-downloader',
      title: getMessage('video_downloader_uitour_title'),
      text: getMessage('video_downloader_uitour_description'),
      icon: getResourceUrl('video-downloader/images/video-downloader-uitour.svg'),
    };

    const ctaButton = {
      label: getMessage('video_downloader_uitour_btn_try'),
      style: 'primary'
    };

    const skipButton = {
      label: getMessage('video_downloader_uitour_btn_skip'),
      style: 'link'
    };

    const promise = showUITour(settings, ctaButton, skipButton);

    promise.then((button) => {
      switch (button) {
        case 'CTA': {
          this.markUITourDismissed(UI_TOUR_PREF);
          setTimeout(() => {
            browser.cliqz.openPageActionPopup();
          }, 1000);
          break;
        }

        case 'skip': {
          this.markUITourDismissed(UI_TOUR_PREF, true);
          break;
        }

        case 'close': {
          this.markUITourDismissed(UI_TOUR_PREF);
          break;
        }

        default: {
          console.log(button);
        }
      }
    });
  }

  download({ url, filename, format, origin }) {
    prefs.set('videoDownloaderOptions', JSON.stringify({
      platform: 'desktop',
      quality: format
    }));

    const onStartedDownload = () => {
      if (origin && browser.cliqzHistory) {
        browser.cliqzHistory.history.fillFromVisit(url, origin);
      }

      console.log('Download started');
    };

    const onFailed = (error) => {
      console.error('Error downloading', error);
    };

    if (typeof browser !== 'undefined') {
      browser.tabs.query({
        active: true,
        currentWindow: true,
      }).then((tabs) => {
        const tab = tabs[tabs.length - 1];

        browser.downloads.download({
          url,
          filename: filename.trim(),
          incognito: tab.incognito,
        }).then(onStartedDownload, onFailed);
      });
    }
  }
}
