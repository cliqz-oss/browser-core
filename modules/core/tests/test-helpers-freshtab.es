import chai from 'chai';
import chaiDom from 'chai-dom';

import config from '../../core/config';
import { wait } from './test-helpers';


chai.use(chaiDom);

export const CONFIG = config;

function range(i) {
  return i > 0 ? range(i - 1).concat(i - 1) : [];
}

const favoritesDial = i => ({
  title: `https://this${i}.test.title`,
  id: `this${i}.test.id`,
  url: `https://this${i}.test.domain`,
  displayTitle: `t0${i}`,
  custom: true,
  logo: {
    text: `0${i}`,
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #c3043e;color:#fff;'
  }
});

export function generateFavResponse() {
  const favoritesResponse = [];
  for (let a = 1; a < 8; a += 1) {
    favoritesResponse.push(
      {
        history: [],
        custom: range(a).map(favoritesDial)
      }
    );
  }
  return favoritesResponse;
}

export const favoritesMiniResponse = [
  {
    history: [],
    custom: [0].map(favoritesDial)
  },

  {
    history: [],
    custom: [0, 1, 2, 3, 4, 5].map(favoritesDial)
  },
];

const historyDial = i => ({
  title: `https://this${i}.test.title`,
  id: `this${i}.test.id`,
  url: `https://this${i}.test.domain`,
  displayTitle: `t0${i}`,
  custom: false,
  logo: {
    text: `0${i}`,
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #c3043e;color:#fff;'
  }
});

export function generateHistoryResponse() {
  const historyResponse = [];
  for (let a = 1; a < 7; a += 1) {
    historyResponse.push(
      {
        history: range(a).map(historyDial),
        custom: []
      }
    );
  }
  return historyResponse;
}

const newsItem = i => ({
  title: `News title ${i}`,
  description: `${i} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin in sem in turpis vestibulum viverra id vel arcu. Nunc at hendrerit elit. Nunc eget neque non magna egestas efficitur. Quisque eget justo quis elit pulvinar volutpat. Cras tempus sodales mauris, sed rhoncus mauris accumsan ut.`,
  displayUrl: `http://display.news${i}.com`,
  logo: {
    backgroundColor: '333333',
    backgroundImage: 'url("https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg")',
    text: 'it',
    color: '#fff',
    buttonsClass: 'cliqz-brands-button-10',
    style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg); text-indent: -10em;'
  },
  url: `http://newsabcdefgh${i}.com`,
  type: 'topnews'
});

export function generateNewsResponse() {
  const newsResponse = [];
  for (let a = 3; a < 13; a += 1) {
    newsResponse.push(
      {
        news: range(a).map(newsItem),
        version: 0
      }
    );
  }
  return newsResponse;
}

export const mockMessage = {
  'new-cliqz-tab': {
    id: 'new-cliqz-tab',
    active: true,
    type: 'notification',
    title: 'It’s not only the inner values that count!',
    description: 'Now you can change the style on Cliqz Tab.',
    icon: 'settings-icon_blue.svg',
    cta_text: 'TRY IT NOW',
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  }
};

export const mockOfferMessage = {
  123: {
    offer_id: '123',
    id: '123',
    offer_info: {
      ui_info: {
        template_data: {
          call_to_action: {
            target: '',
            text: 'Teilnehmen',
            url: 'https://umfrage.cliqz.com/index.php/545662?lang=de"='
          },
          conditions: 'Diese Umfrage dauert ca. 5 Minuten und ist anonym.',
          desc: 'Hallo! Wir möchten sehr gerne etwas über Ihre Meinung zum Cliqz-Browser erfahren.',
          logo_url: 'https://cdn.cliqz.com/extension/offers/survey-icon.svg',
          title: 'Cliqz-Umfrage',
          validity: 1519967709,
          voucher_classes: ''
        }
      }
    },
    validity: 1519967709,
    position: 'middle',
    type: 'offer',
  }
};

export class Subject {
  constructor({ waitForFirstMessage = false, injectTestUtils = false } = {}) {
    this.waitForFirstMessage = waitForFirstMessage;
    this.modules = {};
    this.messages = [];
    this.injectTestUtils = injectTestUtils;
    const listeners = new Set();
    this.chrome = {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.add(listener);
          },
          removeListener(listener) {
            listeners.delete(listener);
          }
        },
        sendMessage: ({ module, action, requestId, args }) => {
          const response = this.modules[module].actions[action];

          listeners.forEach((l) => {
            l({
              action,
              response,
              type: 'response',
              requestId,
              source: 'cliqz-content-script',
              args
            });
          });
        }
      },
      i18n: {
        getMessage: k => k,
      }
    };
  }

  _injectTestUtils() {
    let testUtilsPromise = Promise.resolve();

    if (this.injectTestUtils) {
      let resolver;
      testUtilsPromise = new Promise((r) => { resolver = r; });
      const testUtils = document.createElement('script');
      this.iframe.contentWindow.document.body.appendChild(testUtils);

      testUtils.onload = () => {
        resolver();
      };
      testUtils.src = '../vendor/react-dom-test-utils.js';
    }

    return testUtilsPromise;
  }

  load({
    buildUrl = `/build/${config.settings.id}/chrome/content/freshtab/home.html`,
    iframeWidth = 900 } = {}) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = buildUrl;
    this.iframe.width = iframeWidth;
    this.iframe.height = 700;
    document.body.appendChild(this.iframe);
    return new Promise((resolve) => {
      this.iframe.contentWindow.chrome = this.chrome;
      this.iframe.contentWindow.addEventListener('message', (ev) => {
        const data = JSON.parse(ev.data);
        this.messages.push(data);
        if (this.waitForFirstMessage) {
          this._injectTestUtils().then(() => resolve());
        }
      });

      this.iframe.contentWindow.addEventListener('load', () => {
        if (!this.waitForFirstMessage) {
          this._injectTestUtils().then(() => resolve());
        }
      });
    });
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  get testUtils() {
    return this.iframe.contentWindow.ReactTestUtils;
  }

  queryByI18n(switchLabel) {
    const xpath = `//span[text()="${switchLabel}"]`;
    const switchElement = this.iframe.contentWindow.document
      .evaluate(xpath, this.iframe.contentWindow.document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
    if (switchElement !== null) {
      return (switchElement.closest('div'));
    }
    return null;
  }

  get activeElement() {
    return this.iframe.contentWindow.document.activeElement;
  }

  get body() {
    return this.iframe.contentWindow.document.body;
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  pushData(target, data = {}, action = 'render_template') {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target,
      origin: 'window',
      message: {
        action,
        data,
      }
    }), '*');
    return wait(500);
  }

  respondsWith({ module, action, response }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }

  getComputedStyle(element) {
    return this.iframe.contentWindow.getComputedStyle(element);
  }

  getComputedStyleOfElement(element) {
    return this.iframe.contentWindow.getComputedStyle(element);
  }

  respondsWithEmptyTelemetry() {
    this.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });
  }

  respondsWithEmptySpeedDials() {
    this.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      },
    });
  }

  respondsWithOneHistory() {
    this.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: generateHistoryResponse()[0],
    });
  }

  respondsWithEmptyNews() {
    this.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });
  }

  respondsWithEmptyOffers() {
    this.respondsWith({
      module: 'freshtab',
      action: 'getOffers',
      response: []
    });
  }

  getNewsDeLanguage() {
    return this.query('#news-radio-selector-2');
  }
  getNewsFrLanguage() {
    return this.query('#news-radio-selector-3');
  }
  getNewsIntlLanguage() {
    return this.query('#news-radio-selector-4');
  }
  getNewsDeTrEnLanguage() {
    return this.query('#news-radio-selector-5');
  }
  getNewsUsLanguage() {
    return this.query('#news-radio-selector-6');
  }
  getNewsGbLanguage() {
    return this.query('#news-radio-selector-7');
  }

  getCliqzThemeSettings() {
    return this.queryByI18n('Cliqz Theme');
  }
  getBackgroundSettings() {
    return this.queryByI18n('freshtab_app_settings_background_label');
  }
  getMostVisitedSettings() {
    return this.queryByI18n('freshtab_app_settings_most_visited_label');
  }
  getFavoritesSettings() {
    return this.queryByI18n('freshtab_app_settings_favorites_label');
  }
  getSearchSettings() {
    return this.queryByI18n('freshtab_app_settings_search_label');
  }
  getNewsSettings() {
    return this.queryByI18n('freshtab_app_settings_news_label');
  }

  getCliqzThemeSwitch() {
    return this.getCliqzThemeSettings().querySelector('input.switch');
  }
  getBackgroundSwitch() {
    return this.getBackgroundSettings().querySelector('input.switch');
  }
  getMostVisitedSwitch() {
    return this.getMostVisitedSettings().querySelector('input.switch');
  }
  getFavoritesSwitch() {
    return this.getFavoritesSettings().querySelector('input.switch');
  }
  getSearchSwitch() {
    return this.getSearchSettings().querySelector('input.switch');
  }
  getNewsSwitch() {
    return this.getNewsSettings().querySelector('input.switch');
  }
}

export const defaultConfig = {
  module: 'freshtab',
  action: 'getConfig',
  response: {
    locale: 'en',
    newTabUrl: config.settings.NEW_TAB_URL,
    isBrowser: false,
    showNewBrandAlert: false,
    messages: {},
    isHistoryEnabled: true,
    hasActiveNotifications: false,
    isBlueBackgroundSupported: true,
    isBlueThemeSupported: true,
    isBlue: false,
    componentsState: {
      historyDials: {
        visible: false
      },
      customDials: {
        visible: false
      },
      search: {
        visible: false
      },
      news: {
        visible: false,
        preferedCountry: 'de'
      },
      background: {
        image: 'bg-default'
      }
    },
    wallpapers: [
      {
        name: 'bg-blue',
        alias: 'alps',
        isDefault: false,
      },
      {
        name: 'bg-light',
        alias: 'light',
        isDefault: false,
      },
      {
        name: 'bg-dark',
        alias: 'dark',
        isDefault: false,
      },
      {
        name: 'bg-winter',
        alias: 'winter',
        isDefault: false,
      },
      {
        name: 'bg-matterhorn',
        alias: 'matterhorn',
        isDefault: true,
      },
      {
        name: 'bg-spring',
        alias: 'spring',
        isDefault: false,
      },
      {
        name: 'bg-worldcup',
        alias: 'worldcup',
        isDefault: false,
      },
      {
        name: 'bg-summer',
        alias: 'summer',
        isDefault: false,
      }
    ]
  },
};
