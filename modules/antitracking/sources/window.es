/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import AttrackBG from './background';
import prefs from '../core/prefs';
import events from '../core/events';
import { URLInfo } from '../core/url-info';
import inject from '../core/kord/inject';

function onLocationChange({ url, windowId, tabId }) {
  if (this.windowId !== windowId) {
    return;
  }

  if (this.interval) { clearInterval(this.interval); }

  let counter = 8;

  this.updateBadge({ tabId, url });

  this.interval = setInterval(function () {
    this.updateBadge({ tabId, url });

    counter -= 1;
    if (counter <= 0) {
      clearInterval(this.interval);
    }
  }.bind(this), 2000);
}

export default class Win {
  constructor({ window, windowId }) {
    this.window = window;
    this.windowId = windowId;
    this.controlCenter = inject.module('control-center');

    this.onLocationChange = onLocationChange.bind(this);
    this.enabled = false;
  }

  init() {
    if (this.controlCenter.isEnabled()) {
      this.onLocationChangeSubscription = events.subscribe('content:location-change',
        ({ windowId, url, windowTreeInformation: { tabId } }) =>
          this.onLocationChange({ windowId, url, tabId }));
      this.onTabSelect = events.subscribe('core:tab_select', this.onLocationChange);
    }
  }

  unload() {
    if (this.onLocationChangeSubscription) {
      this.onLocationChangeSubscription.unsubscribe();
    }
    if (this.onTabSelect) {
      this.onTabSelect.unsubscribe();
    }
    clearInterval(this.interval);
  }

  getBadgeData(info) {
    if (AttrackBG.attrack.urlWhitelist.isWhitelisted(info.hostname)) {
      // do not display number if site is whitelisted
      return 0;
    }
    return info.cookies.blocked + info.requests.unsafe;
  }

  updateBadge({ tabId, url }) {
    if (AttrackBG.attrack) {
      AttrackBG.attrack.getTabBlockingInfo(tabId, url).then((info) => {
        this.controlCenter.windowAction(
          this.window,
          'setBadge',
          this.getBadgeData(info)
        );
      });
    }
  }

  status() {
    return AttrackBG.attrack.getCurrentTabBlockingInfo(this.window)
      .then((info) => {
        const url = URLInfo.get(info.url);
        const ps = info.ps;
        const hostname = url ? url.hostname : '';
        const isWhitelisted = AttrackBG.attrack.urlWhitelist.isWhitelisted(hostname);
        const enabled = prefs.get('modules.antitracking.enabled', true) && !isWhitelisted;
        let s;

        if (enabled) {
          s = 'active';
        } else if (isWhitelisted) {
          s = 'inactive';
        } else {
          s = 'critical';
        }

        return {
          visible: true,
          strict: prefs.get('attrackForceBlock', false),
          hostname,
          cookiesCount: info.cookies.blocked,
          requestsCount: info.requests.unsafe,
          totalCount: info.cookies.blocked + info.requests.unsafe,
          badgeData: this.getBadgeData(info),
          enabled,
          isWhitelisted: isWhitelisted || enabled,
          reload: info.reload || false,
          trackersList: info,
          ps,
          state: s
        };
      });
  }
}
