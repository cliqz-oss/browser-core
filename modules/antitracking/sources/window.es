import background from 'antitracking/background';
import CliqzAttrack from 'antitracking/attrack';
import { utils, events } from 'core/cliqz';

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
    } else {
      CliqzAttrack.unloadWindow(this.window);
    }
    this.enabled = CliqzAttrack.isEnabled();
  }
};

export default class {

  constructor(config) {
    this.window = config.window;

    this.popup = background.popup;

    if ( this.popup ) {
      this.onLocationChange = onLocationChange.bind(this);
    }
    this.onPrefChange = onPrefChange.bind(this);
    this.enabled = false;
  }

  init() {
    if ( this.popup ) {
      CliqzEvents.sub("core.location_change", this.onLocationChange);
      // Better to wait for first window to set the state of the button
      // otherways button may not be initialized yet
      this.popup.updateState(utils.getWindow(), CliqzAttrack.isEnabled());
    }
    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  }

  unload() {
    if ( this.popup ) {
      CliqzEvents.un_sub("core.location_change", this.onLocationChange);
      CliqzUtils.clearInterval(this.interval);
    }
    if (CliqzAttrack.isEnabled()) {
      CliqzAttrack.unloadWindow(this.window);
    }
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

    this.popup.setBadge(this.window, count);
  }

  createButtonItem() {
    if (!background.buttonEnabled) return;

    var win = this.window,
        doc = win.document,
        menu = doc.createElement('menu'),
        menupopup = doc.createElement('menupopup');

    menu.setAttribute('label', utils.getLocalizedString('attrack-force-block-setting'));

    var filter_levels = {
      false: {
        name: utils.getLocalizedString('attrack-force-block-off'),
        selected: false
      },
      true: {
        name: utils.getLocalizedString('attrack-force-block-on'),
        selected: false
      }
    };
    filter_levels[utils.getPref('attrackForceBlock', false).toString()].selected = true;

    for(var level in filter_levels) {
      var item = doc.createElement('menuitem');
      item.setAttribute('label', filter_levels[level].name);
      item.setAttribute('class', 'menuitem-iconic');

      if(filter_levels[level].selected){
        item.style.listStyleImage = 'url(chrome://cliqz/content/static/skin/checkmark.png)';
      }

      item.filter_level = level;
      item.addEventListener('command', function(event) {
        if ( this.filter_level === 'true' ) {
          utils.setPref('attrackForceBlock', true);
          utils.telemetry( { type: 'antitracking', action: 'click', target: 'attrack_qbutton_strict'} );
        } else {
          utils.clearPref('attrackForceBlock');
          utils.telemetry( { type: 'antitracking', action: 'click', target: 'attrack_qbutton_default'} );
        }
        utils.setTimeout(win.CLIQZ.Core.refreshButtons, 0);
      }, false);

      menupopup.appendChild(item);
    };

    var learnMore = this.window.CLIQZ.Core.createSimpleBtn(
        doc,
        utils.getLocalizedString('learnMore'),
        function() {
          CLIQZEnvironment.openTabInWindow(this.window, 'https://cliqz.com/whycliqz/anti-tracking');
        }.bind(this),
        'attrack_learn_more'
    );
    learnMore.setAttribute('class', 'menuitem-iconic');
    menupopup.appendChild(doc.createElement('menuseparator'));
    menupopup.appendChild(learnMore);

    menu.appendChild(menupopup);
    return menu;

  }

};
