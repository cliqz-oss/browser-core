import background from 'antitracking/background';
import CliqzAttrack from 'antitracking/attrack';
import { utils, events } from 'core/cliqz';
import { URLInfo } from 'antitracking/url';
import inject from '../core/kord/inject';

const CliqzUtils = utils;
const CliqzEvents = events;

function onLocationChange(ev) {
  if(this.interval) { utils.clearInterval(this.interval); }

  var counter = 8;

  this.updateBadge();

  this.interval = utils.setInterval(function () {
    this.updateBadge();

    counter -= 1;
    if (counter <= 0) {
      utils.clearInterval(this.interval);
    }
  }.bind(this), 2000);
}

function onPrefChange(pref) {
  if (pref == CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() != this.enabled) {
    if (CliqzAttrack.isEnabled()) {
      CliqzAttrack.initWindow(this.window);
    }
    this.enabled = CliqzAttrack.isEnabled();
  }
};

export default class {

  constructor(config) {
    this.window = config.window;
    this.controlCenter = inject.module('control-center');

    this.onLocationChange = onLocationChange.bind(this);
    this.onPrefChange = onPrefChange.bind(this);
    this.enabled = false;
  }

  init() {
    events.sub("core.location_change", this.onLocationChange);
    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    events.sub("prefchange", this.onPrefChange);
  }

  unload() {
    events.un_sub("core.location_change", this.onLocationChange);
    utils.clearInterval(this.interval);
    events.un_sub("prefchange", this.onPrefChange);
  }

  getBadgeData(info) {
    if (CliqzAttrack.isSourceWhitelisted(info.hostname)) {
      // do not display number if site is whitelisted
      return 0;
    } else {
      return info.cookies.blocked + info.requests.unsafe;
    }
  }

  updateBadge() {
    if (this.window !== utils.getWindow()) { return; }

    this.controlCenter.windowAction(
      this.window,
      'setBadge',
      this.getBadgeData(CliqzAttrack.getCurrentTabBlockingInfo())
    );
  }

  status() {
    const url = URLInfo.get(this.window.gBrowser.currentURI.spec);
    var info = CliqzAttrack.getCurrentTabBlockingInfo(this.window.gBrowser),
        ps = info.ps,
        hostname = url ? url.hostname : '',
        isWhitelisted = CliqzAttrack.isSourceWhitelisted(hostname),
        enabled = utils.getPref('modules.antitracking.enabled', true) && !isWhitelisted;

    return {
      visible: true,
      strict: utils.getPref('attrackForceBlock', false),
      hostname: hostname,
      cookiesCount: info.cookies.blocked,
      requestsCount: info.requests.unsafe,
      totalCount: info.cookies.blocked + info.requests.unsafe,
      badgeData: this.getBadgeData(info),
      enabled: enabled,
      isWhitelisted: isWhitelisted || enabled,
      reload: info.reload || false,
      trackersList: info,
      ps: ps,
      state: enabled ? 'active' : isWhitelisted ? 'inactive' : 'critical'
    }
  }
};
