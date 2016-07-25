import { utils } from 'core/cliqz';
import CliqzADB, { adbEnabled, adbABTestEnabled, ADB_PREF_VALUES, ADB_PREF } from 'adblocker/adblocker';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (adbEnabled()) {
      CliqzADB.initWindow(this.window);
    }
  }

  unload() {
    if (adbEnabled()) {
      CliqzADB.unloadWindow(this.window);
    }
  }

  createAdbButton() {
    var win = this.window,
        doc = win.document,
        adbBtn = doc.createElement('menu'),
        adbPopup = doc.createElement('menupopup');

    adbBtn.setAttribute('label', utils.getLocalizedString('adb-menu-option'));

    // we must create the whole ADB popup every time we show it
    // because parts of it depend on the current URL
    adbPopup.addEventListener('popupshowing', function() {
      // clean the whole popup
      while (adbPopup.lastChild){
        adbPopup.removeChild(adbPopup.lastChild);
      }

      const currentURL = win.gBrowser.currentURI.spec,
            adbDisabled = !adbEnabled();

      // do not show disable for current URL/Domain
      if(utils.isUrl(currentURL)) {
        const disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL),
              disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);

        const disableUrl = win.CLIQZ.Core.createCheckBoxItem(
          doc,
          'cliqz-adb-url',
          utils.getLocalizedString('adb-menu-disable-url'),
          true,
          function() { CliqzADB.adBlocker.toggleUrl(currentURL); },
          disabledForUrl
        );

        const disableDomain = win.CLIQZ.Core.createCheckBoxItem(
          doc,
          'cliqz-adb-domain',
          utils.getLocalizedString('adb-menu-disable-domain'),
          true,
          function() { CliqzADB.adBlocker.toggleDomain(currentURL); },
          disabledForDomain
        );

        // we disabled the option of adding a custom rule for URL in case the whole domain is disabled

        disableUrl.setAttribute('disabled', adbDisabled || disabledForDomain);
        disableDomain.setAttribute('disabled', adbDisabled);

        adbPopup.appendChild(disableUrl);
        adbPopup.appendChild(disableDomain);
        adbPopup.appendChild(doc.createElement('menuseparator'));
      }

      Object.keys(ADB_PREF_VALUES).forEach(name => {
        let item = doc.createElement('menuitem');

        item.setAttribute('label', utils.getLocalizedString('adb-menu-option-' + name.toLowerCase()));
        item.setAttribute('class', 'menuitem-iconic');
        item.option = ADB_PREF_VALUES[name];

        if (utils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) === item.option)  {
          item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';
        }

        item.addEventListener('command', function(event) {
          utils.setPref(ADB_PREF, this.option);

          utils.setTimeout(win.CLIQZ.Core.refreshButtons, 0);
          utils.telemetry({
            type: 'activity',
            action: 'cliqz_menu_button',
            button_name: 'adb_option_' + this.option
          });
        }, false);

        adbPopup.appendChild(item);
      });

      adbPopup.appendChild(doc.createElement('menuseparator'));

      adbPopup.appendChild(
        win.CLIQZ.Core.createSimpleBtn(
          doc,
          CliqzUtils.getLocalizedString('adb-menu-more'),
          function() { CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/whycliqz/adblocking'); },
          'cliqz-adb-more'
        )
      );
    });

    adbBtn.appendChild(adbPopup);

    return adbBtn;
  }

  createButtonItem() {
    if (adbABTestEnabled()) {
      return [this.createAdbButton()];
    } else {
      return [];
    }
  }
}
