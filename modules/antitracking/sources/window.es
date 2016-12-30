import background from 'antitracking/background';
import CliqzAttrack from 'antitracking/attrack';
import { utils, events } from 'core/cliqz';
import { URLInfo } from 'antitracking/url';

function onLocationChange(ev) {
  if(this.interval) { CliqzUtils.clearInterval(this.interval); }

  var counter = 8;

  this.updateBadge();

  this.interval = CliqzUtils.setInterval(function () {
    this.updateBadge();

    counter -= 1;
    if (counter <= 0) {
      CliqzUtils.clearInterval(this.interval);
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

    this.popup = background.popup;

    this.onLocationChange = onLocationChange.bind(this);
    this.onPrefChange = onPrefChange.bind(this);
    this.enabled = false;
  }

  init() {
    CliqzEvents.sub("core.location_change", this.onLocationChange);
    if( this.popup ){
      // Better to wait for first window to set the state of the button
      // otherways button may not be initialized yet
      this.popup.updateState(utils.getWindow(), CliqzAttrack.isEnabled());
    }
    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  }

  unload() {
    CliqzEvents.un_sub("core.location_change", this.onLocationChange);
    CliqzUtils.clearInterval(this.interval);
    CliqzEvents.un_sub("prefchange", this.onPrefChange);
  }

  updateBadge() {
    if (this.window !== CliqzUtils.getWindow()) { return; }

    var info = CliqzAttrack.getCurrentTabBlockingInfo(), count;

    try {
      count = info.cookies.blocked + info.requests.unsafe;
    } catch(e) {
      count = 0;
    }

    // do not display number if site is whitelisted
    if (CliqzAttrack.isSourceWhitelisted(info.hostname)) {
      count = 0;
    }

    if( this.popup ){
      this.popup.setBadge(this.window, count);
    } else {
      utils.callWindowAction(
        this.window,
        'control-center',
        'setBadge',
        [ count ]
      );
    }
  }

  status() {
    var info = CliqzAttrack.getCurrentTabBlockingInfo(this.window.gBrowser),
        ps = info.ps,
        hostname = URLInfo.get(this.window.gBrowser.currentURI.spec).hostname,
        isWhitelisted = CliqzAttrack.isSourceWhitelisted(hostname),
        enabled = utils.getPref('modules.antitracking.enabled', true) && !isWhitelisted;

    return {
      visible: true,
      strict: utils.getPref('attrackForceBlock', false),
      hostname: hostname,
      cookiesCount: info.cookies.blocked,
      requestsCount: info.requests.unsafe,
      totalCount: info.cookies.blocked + info.requests.unsafe,
      enabled: enabled,
      isWhitelisted: isWhitelisted || enabled,
      reload: info.reload || false,
      trackersList: info,
      ps: ps,
      state: enabled ? 'active' : isWhitelisted ? 'inactive' : 'critical'
    }
  }
};
