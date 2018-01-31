import AttrackBG from './background';
import { utils, events } from '../core/cliqz';
import { URLInfo } from '../core/url-info';
import inject from '../core/kord/inject';

const CliqzUtils = utils;
const CliqzEvents = events;

function onLocationChange({ url, windowId, tabId }) {
  if (this.windowId !== windowId) {
    return;
  }

  if(this.interval) { utils.clearInterval(this.interval); }

  var counter = 8;

  this.updateBadge({ tabId, url });

  this.interval = utils.setInterval(function () {
    this.updateBadge({ tabId, url });

    counter -= 1;
    if (counter <= 0) {
      utils.clearInterval(this.interval);
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
      this.onLocationChangeSubscription = events.subscribe("content:location-change",
        ({ windowId, url, windowTreeInformation: { tabId }}) => this.onLocationChange({ windowId, url, tabId }));
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
    utils.clearInterval(this.interval);
  }

  getBadgeData(info) {
    if (AttrackBG.attrack.urlWhitelist.isWhitelisted(info.hostname)) {
      // do not display number if site is whitelisted
      return 0;
    } else {
      return info.cookies.blocked + info.requests.unsafe;
    }
  }

  updateBadge({ tabId, url }) {
    AttrackBG.attrack.getTabBlockingInfo(tabId, url)
      .then((info) => {
        this.controlCenter.windowAction(
          this.window,
          'setBadge',
          this.getBadgeData(info)
        );
      });
  }

  status() {
    return AttrackBG.attrack.getCurrentTabBlockingInfo(this.window)
      .then((info) => {
        const url = URLInfo.get(info.url);
        const ps = info.ps;
        const hostname = url ? url.hostname : '';
        const isWhitelisted = AttrackBG.attrack.urlWhitelist.isWhitelisted(hostname);
        const enabled = utils.getPref('modules.antitracking.enabled', true) && !isWhitelisted;

        return {
          visible: true,
          strict: utils.getPref('attrackForceBlock', false),
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
          state: enabled ? 'active' : (isWhitelisted ? 'inactive' : 'critical')
        };
      });
  }
}
