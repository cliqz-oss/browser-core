import { utils } from 'core/cliqz';
import { simpleBtn, checkBox } from 'q-button/buttons';
import CliqzADB,
     { adbEnabled,
       adbABTestEnabled,
       ADB_PREF_VALUES,
       ADB_PREF } from 'adblocker/adblocker';


export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (adbEnabled()) {
      CliqzADB.initWindow(this.window);
      this.window.adbinit = true;
    }
  }

  unload() {
    if (adbEnabled()) {
      CliqzADB.unloadWindow(this.window);
      this.window.adbinit = false;
    }
  }

  createAdbButton() {
    const win = this.window;
    const doc = win.document;
    const adbBtn = doc.createElement('menu');
    const adbPopup = doc.createElement('menupopup');

    adbBtn.setAttribute('label', utils.getLocalizedString('adb-menu-option'));

    // we must create the whole ADB popup every time we show it
    // because parts of it depend on the current URL
    adbPopup.addEventListener('popupshowing', () => {
      // clean the whole popup
      while (adbPopup.lastChild) {
        adbPopup.removeChild(adbPopup.lastChild);
      }

      const currentURL = win.gBrowser.currentURI.spec;
      const adbDisabled = !adbEnabled();

      const isCorrectUrl = utils.isUrl(currentURL);
      let disabledForUrl = false;
      let disabledForDomain = false;

      // Check if adblocker is disabled on this page
      if (isCorrectUrl) {
        disabledForDomain = CliqzADB.adBlocker.isDomainInBlacklist(currentURL);
        disabledForUrl = CliqzADB.adBlocker.isUrlInBlacklist(currentURL);
      }

      const disableUrl = checkBox(
        doc,
        'cliqz-adb-url',
        utils.getLocalizedString('adb-menu-disable-url'),
        true,
        () => { CliqzADB.adBlocker.toggleUrl(currentURL); },
        disabledForUrl
      );

      const disableDomain = checkBox(
        doc,
        'cliqz-adb-domain',
        utils.getLocalizedString('adb-menu-disable-domain'),
        true,
        () => { CliqzADB.adBlocker.toggleUrl(currentURL, true); },
        disabledForDomain
      );

      // We disabled the option of adding a custom rule for URL
      // in case the whole domain is disabled
      disableUrl.setAttribute('disabled', adbDisabled || disabledForDomain || !isCorrectUrl);
      disableDomain.setAttribute('disabled', adbDisabled || !isCorrectUrl);

      adbPopup.appendChild(disableUrl);
      adbPopup.appendChild(disableDomain);
      adbPopup.appendChild(doc.createElement('menuseparator'));

      Object.keys(ADB_PREF_VALUES).forEach(name => {
        const item = doc.createElement('menuitem');

        item.setAttribute(
          'label',
          utils.getLocalizedString(`adb-menu-option-${name.toLowerCase()}`));
        item.setAttribute('class', 'menuitem-iconic');
        item.option = ADB_PREF_VALUES[name];

        if (utils.getPref(ADB_PREF, ADB_PREF_VALUES.Disabled) === item.option) {
          item.style.listStyleImage = `url(${utils.SKIN_PATH}checkmark.png)`;
        }

        item.addEventListener('command', () => {
          utils.setPref(ADB_PREF, item.option);
          if (adbEnabled() && !win.adbinit) {
            CliqzADB.initWindow(win);
            win.adbinit = true;
          }
          if (!adbEnabled() && win.adbinit) {
            CliqzADB.unloadWindow(win);
            win.adbinit = false;
          }
          utils.telemetry({
            type: 'activity',
            action: 'cliqz_menu_button',
            button_name: `adb_option_${item.option}`,
          });
        }, false);

        adbPopup.appendChild(item);
      });

      adbPopup.appendChild(doc.createElement('menuseparator'));

      adbPopup.appendChild(
        simpleBtn(
          doc,
          CliqzUtils.getLocalizedString('adb-menu-more'),
          () => { utils.openTabInWindow(win, 'https://cliqz.com/whycliqz/adblocking'); },
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
    }
    return [];
  }
}
