import config from '../core/config';
import prefs from '../core/prefs';
import * as platform from '../core/platform';
import {
  setNewTabPage,
  resetNewTabPage,
  setHomePage,
  getHomePage,
  migrate,
  AboutCliqz
} from '../platform/freshtab/new-tab-setting';

const NEW_TAB_URL = config.settings.NEW_TAB_URL;
const PREF_NEW_TAB_BUTTON_STATE = 'freshTabState';
const PREF_HOME_PAGE_BACKUP = 'backup.homepage';

export default {

  get isActive() {
    if (platform.isCliqzBrowser || !config.settings.freshTabButton) {
      return true;
    }

    return prefs.get(PREF_NEW_TAB_BUTTON_STATE);
  },

  startup() {
    if (this.isActive) {
      this.enableNewTabPage();
    }

    AboutCliqz.register();

    migrate();
  },

  shutdown() {
    resetNewTabPage();

    AboutCliqz.unregister();

    // save current homepage to backup
    if (this.isActive) {
      prefs.set(PREF_HOME_PAGE_BACKUP, getHomePage());
    }
  },

  enableNewTabPage() {
    prefs.set(PREF_NEW_TAB_BUTTON_STATE, true);
    setNewTabPage(NEW_TAB_URL);
  },

  enableHomePage() {
    const homePageBackup = prefs.get(PREF_HOME_PAGE_BACKUP);

    // If Home Page was already set once, we don't everwrite it again
    if (homePageBackup) {
      return;
    }

    const currentHomePage = getHomePage();

    prefs.set(PREF_NEW_TAB_BUTTON_STATE, currentHomePage);

    setHomePage(NEW_TAB_URL);
  },


  /**
   * Rollback to browser original settings
   */
  rollback() {
    const homePageBackup = prefs.get(PREF_HOME_PAGE_BACKUP);

    AboutCliqz.unregister();

    if (homePageBackup) {
      setHomePage(homePageBackup);
    }

    resetNewTabPage();

    prefs.set(PREF_NEW_TAB_BUTTON_STATE, false);
  },

};
