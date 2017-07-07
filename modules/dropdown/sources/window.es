import Handlebars from 'handlebars';
import templates from './templates';
import UI from './ui';
import helpers from './helpers';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import utils from '../core/utils';
import inject from '../core/kord/inject';

const STYLESHEET_URL = 'chrome://cliqz/content/dropdown/styles/styles.css';
const DISMISSED_ALERTS = 'dismissedAlerts';

export default class {
  constructor(config) {
    this.window = config.window;
    this.background = config.background;
    this.settings = config.settings;
    this.ui = new UI(this.window, {
      getSessionCount: this.background.getSessionCount.bind(this.background),
    });

    this.actions = {
      init: () => {
        this.window.CLIQZ.UI = this.ui;
      }
    };
  }

  init() {
    Handlebars.partials = Object.assign({}, Handlebars.partials, templates);
    addStylesheet(this.window.document, STYLESHEET_URL);

    Object.keys(helpers).forEach(
      helperName => Handlebars.registerHelper(helperName, helpers[helperName])
    );

    this.showOnboarding();
  }

  showOnboarding() {
    const isInABTest = utils.getPref('extOnboardNewSearchUI', false);
    const dismissedAlerts = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
    const messageType = 'new-search-ui';
    const isDismissed = dismissedAlerts[messageType] && dismissedAlerts[messageType].count >= 1;
    const messageCenter = inject.module('message-center');
    if (isInABTest && !isDismissed) {
      messageCenter.action(
        'showMessage',
        'MESSAGE_HANDLER_FRESHTAB',
        {
          id: messageType,
          template: messageType,
        }
      );
    }
  }

  unload() {
    delete this.window.CLIQZ.UI;
    removeStylesheet(this.window.document, STYLESHEET_URL);
  }
}
