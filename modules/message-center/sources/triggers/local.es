import utils from '../../core/utils';
import inject from '../../core/kord/inject';
import prefs from '../../core/prefs';
import { isCliqzBrowser, isCliqzAtLeastInVersion } from '../../core/platform';


const DISMISSED_ALERTS = 'dismissedAlerts';
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const MESSAGES = {
  'new-cliqz-tab': {
    id: 'new-cliqz-tab',
    active: false,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-desc'),
    icon: 'settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-cta'),
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  },
  'blue-theme': {
    id: 'blue-theme',
    active: false,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.blue-theme-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.blue-theme-desc'),
    icon: 'settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.blue-theme-cta'),
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle',
    rules: [
      {
        fn: 'cliqzVersionCheck',
        value: '1.16.0',
      }
    ]
  },
  'french-news': {
    id: 'french-news',
    active: false,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.french-news-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.french-news-desc'),
    icon: 'settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.french-news-cta'),
    cta_url: 'home-action:settings&news',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle',
    rules: [
      {
        fn: 'locale',
        value: 'fr',
      },
      {
        fn: 'currentNewsLanguageIsNot',
        value: 'fr'
      },
    ]
  },
  'promote-mobile': {
    id: 'promote-mobile',
    active: true,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.promote-mobile-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.promote-mobile-desc'),
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle',
    buttons: [
      {
        src: 'apple-badge.svg',
        class: 'apple-badge',
        link: {
          en: 'https://itunes.apple.com/us/app/cliqz-browser/id1065837334',
          de: 'https://itunes.apple.com/de/app/cliqz-browser-suchmaschine/id1065837334?mt=8'
        }
      },
      {
        src: 'android-badge.svg',
        class: 'android-badge',
        link: {
          en: 'https://play.google.com/store/apps/details?hl=en&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Den%26cliqz_campaign%3Dmobile_en',
          de: 'https://play.google.com/store/apps/details?hl=de&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Dde%26cliqz_campaign%3Dmobile_de'
        }
      }
    ]
  }
};

const messageFunctions = {
  cliqzVersionCheck(value) {
    return (isCliqzBrowser && isCliqzAtLeastInVersion(value)) || prefs.get('developer', false);
  },
  locale(value) {
    return value === utils.PREFERRED_LANGUAGE;
  },
  currentNewsLanguageIsNot(value, message) {
    const ftConfig = JSON.parse(prefs.get(FRESHTAB_CONFIG_PREF, '{}'));

    if (ftConfig.news && ftConfig.news.preferedCountry) {
      if (ftConfig.news.preferedCountry === value) {
        // if the expected language is already set we should never show this message
        // therefore we need to dismiss this message
        const dismissedAlerts = JSON.parse(prefs.get(DISMISSED_ALERTS, '{}'));
        dismissedAlerts[message.id] = { count: 1 };
        prefs.set(DISMISSED_ALERTS, JSON.stringify(dismissedAlerts));

        return false;
      }
    }

    return true;
  }
};

export default class LocalTrigger {
  constructor() {
    this.messageCenter = inject.module('message-center');
  }

  get messages() {
    return MESSAGES;
  }

  get handlers() {
    return this.messageCenter.action('getHandlers');
  }

  init() {
    const dismissedAlerts = JSON.parse(prefs.get(DISMISSED_ALERTS, '{}'));
    this.handlers.then((handlers) => {
      const activeMessageIds = Object.keys(this.messages).filter(messageId =>
        this.messages[messageId].active
      );

      activeMessageIds.map((messageId) => {
        const message = this.messages[messageId];
        return message;
      }).filter((message) => {
        const dismissedAlert = dismissedAlerts[message.id] || { count: 0 };
        const rules = message.rules || [];
        return dismissedAlert.count === 0
          && rules.every(r => messageFunctions[r.fn](r.value, message));
      }).forEach((message) => {
        const handler = message.handler;
        if (handlers.indexOf(handler) !== -1) {
          this.messageCenter.action(
            'showMessage',
            handler,
            message
          );
        }
      });
    });
  }
}
