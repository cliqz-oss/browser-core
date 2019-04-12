/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */

import AttrackBG from './background';
import prefs from '../core/prefs';
import { URLInfo } from '../core/url-info';
import inject from '../core/kord/inject';

export default class Win {
  constructor({ window, windowId }) {
    this.window = window;
    this.windowId = windowId;
    this.controlCenter = inject.module('control-center');

    this.enabled = false;
  }

  init() {
  }

  unload() {
  }

  getBadgeData(info) {
    if (AttrackBG.attrack.urlWhitelist.isWhitelisted(info.url)) {
      // do not display number if site is whitelisted
      return 0;
    }
    return info.cookies.blocked + info.requests.unsafe;
  }

  status() {
    return AttrackBG.attrack.getCurrentTabBlockingInfo(this.window)
      .then((info) => {
        const url = URLInfo.get(info.url);
        const ps = info.ps;
        const hostname = url ? url.hostname : '';
        const isWhitelisted = url !== null && AttrackBG.attrack.urlWhitelist.isWhitelisted(
          url.href,
          url.hostname,
          url.generalDomain,
        );
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
