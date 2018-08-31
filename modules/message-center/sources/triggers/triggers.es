import i18n from '../../core/i18n';
import inject from '../../core/kord/inject';
import prefs from '../../core/prefs';
import { isCliqzBrowser, isCliqzAtLeastInVersion, isAMO } from '../../core/platform';
import { getDaysSinceInstall } from '../../core/demographics';
import getLocalMessages from './local';
import getRemoteMessages from './remote';


const DISMISSED_ALERTS = 'dismissedAlerts';
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const VERSION = 1;

const messageFunctions = {
  cliqzVersionCheck(value) {
    if (!isCliqzBrowser) {
      return false;
    }

    return isCliqzAtLeastInVersion(value) || prefs.get('developer', false);
  },
  locale(value) {
    return value === i18n.PLATFORM_LOCALE || value === i18n.PLATFORM_LANGUAGE;
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
  },
  isCurrentDate(aDate) {
    const today = prefs.get('config_ts', null);
    return aDate.indexOf(today) !== -1;
  },
  async daysSinceInstallCheck(numDays) {
    return (await getDaysSinceInstall()) <= numDays;
  },
  isAMO() {
    return isAMO;
  }
};

async function checkRulesForMessage(message) {
  const rules = message.rules || [];
  for (let i = 0; i < rules.length; i += 1) {
    const { fn, value } = rules[i];
    if (!Object.prototype.hasOwnProperty.call(messageFunctions, fn)) {
      // This function does not exist so we abort the check
      return false;
    }

    // eslint-disable-next-line no-await-in-loop
    if (!(await messageFunctions[fn](value, message))) {
      return false;
    }
  }

  return true;
}

export default class Triggers {
  constructor() {
    this.messageCenter = inject.module('message-center');
  }

  get messages() {
    return Promise.all([
      getLocalMessages(),
      getRemoteMessages()
    ]).then(sources => sources.reduce((acc, cur) => acc.concat(cur), []));
  }

  get handlers() {
    return this.messageCenter.action('getHandlers');
  }

  async init() {
    const dismissedAlerts = JSON.parse(prefs.get(DISMISSED_ALERTS, '{}'));
    const [handlers, messages] = await Promise.all([this.handlers, this.messages]);

    for (let i = 0; i < messages.length; i += 1) {
      const message = messages[i];
      if (
        // filter only the active ones
        message.active &&
        // make sure the message is supported in this version
        message.version <= VERSION &&
        // check if the message was already dismissed
        (dismissedAlerts[message.id] || { count: 0 }).count === 0 &&
        // check the rules
        (await checkRulesForMessage(message)) // eslint-disable-line no-await-in-loop
      ) {
        const { handler } = message;
        if (handlers.indexOf(handler) !== -1) {
          this.messageCenter.action(
            'showMessage',
            handler,
            message
          );
        }
      }
    }
  }
}
