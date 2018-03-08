import utils from '../../core/utils';
import inject from '../../core/kord/inject';
import prefs from '../../core/prefs';
import { isCliqzBrowser, isCliqzAtLeastInVersion } from '../../core/platform';
import getLocalMessages from './local';
import getRemoteMessages from './remote';


const DISMISSED_ALERTS = 'dismissedAlerts';
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';
const VERSION = 1;

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
  },
  isCurrentDate(aDate) {
    const today = utils.getPref('config_ts', null);
    return aDate.indexOf(today) !== -1;
  }
};

function checkRulesForMessage(message) {
  const rules = message.rules || [];
  return rules.every((r) => {
    if (!Object.prototype.hasOwnProperty.call(messageFunctions, r.fn)) {
      // we did not expect this function so drop out
      return false;
    }
    return messageFunctions[r.fn](r.value, message);
  });
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

  init() {
    const dismissedAlerts = JSON.parse(prefs.get(DISMISSED_ALERTS, '{}'));
    Promise.all([this.handlers, this.messages]).then(([handlers, messages]) => {
      messages
        // filter only the active ones
        .filter(message => message.active)
        // make sure the message is supported in this version
        .filter(message => message.version <= VERSION)
        // check if the message was already dismissed
        .filter(message => (dismissedAlerts[message.id] || { count: 0 }).count === 0)
        // check the rules
        .filter(checkRulesForMessage)
        .forEach((message) => {
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
