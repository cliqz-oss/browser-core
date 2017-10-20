import AttrackBG from './background';
import { utils, events } from '../core/cliqz';
import { URLInfo } from './url';
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

export default class {

  constructor(config) {
    this.window = config.window;
    this.controlCenter = inject.module('control-center');

    this.onLocationChange = onLocationChange.bind(this);
    this.enabled = false;
  }

  init() {
    events.sub("core.location_change", this.onLocationChange);
  }

  unload() {
    events.un_sub("core.location_change", this.onLocationChange);
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

  updateBadge() {
    if (this.window !== utils.getWindow()) { return; }

    AttrackBG.attrack.getCurrentTabBlockingInfo()
      .then((info) => {
        this.controlCenter.windowAction(
          this.window,
          'setBadge',
          this.getBadgeData(info)
        );
      });
  }

  status() {
    const url = URLInfo.get(this.window.gBrowser.currentURI.spec);
    return AttrackBG.attrack.getCurrentTabBlockingInfo(this.window.gBrowser)
      .then((info) => {
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
