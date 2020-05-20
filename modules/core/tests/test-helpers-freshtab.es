/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../../core/config';
import DefaultMap from '../../core/helpers/default-map';
import { clone, expect, wait, waitFor } from './test-helpers';

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
        custom: range(a).map(favoritesDial),
      }
    );
  }
  return favoritesResponse;
}

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
        custom: [],
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
    icon: 'customize-icon.svg',
    cta_text: 'TRY IT NOW',
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  }
};

const now = Date.now();
export const mockOfferMessage = {
  123: {
    offer_id: '123',
    id: '123',
    offer_info: {
      ui_info: {
        styles: {
          'call-to-action-bg-color': '#e741',
          'call-to-action-color': '#fff'
        },
        template_data: {
          labels: [
            'best_offer',
            'exclusive'
          ],
          benefit: '499€',
          call_to_action: {
            target: '',
            text: '(Int-Test) Jetzt anmelden',
            url: 'http://testpage.cliqz.com'
          },
          code: 'IT-ODI-MO4915',
          desc: '(Int-Test) Jetzt registrieren und zusätzlich 15 Minuten geschenkt bekommen!',
          headline: '(Int-Test) Anmeldegebuhr',
          logo_class: 'normal',
          logo_url: 'https://cdn.cliqz.com/extension/offers/test/resources/drivenow-week/drivenow-week-logo-normal-1524572543.png',
          title: '(Int-Test) 499€ Anmeldegebühr (statt 29€) & 15 Freiminuten geschenkt! ',
          validity: (now * 1000) + 1,
          conditions: 'Das Angebot ist biz',
        },
        template_name: 'ticket_template'
      }
    },
    validity: {
      text: '10 days',
      isExpiredSoon: true,
    },
    position: 'middle',
    type: 'offer',
  }
};

const allElements = [
  {
    name: 'background',
    label: 'freshtab_app_settings_background_label',
    selector: 'ul.background-selection-list',
    telemetryName: 'background',
    message: 'saveBackgroundImage',
  },
  {
    name: 'most visited',
    label: 'freshtab_app_settings_most_visited_label',
    selector: '#section-most-visited',
    telemetryName: 'topsites',
    message: 'toggleComponent',
  },
  {
    name: 'favorites',
    label: 'freshtab_app_settings_favorites_label',
    selector: '#section-favorites',
    telemetryName: 'favorites',
    message: 'toggleComponent',
  },
  {
    name: 'search',
    label: 'freshtab_app_settings_search_label',
    selector: '.search',
    telemetryName: 'search_bar',
    message: 'toggleComponent',
  },
  {
    name: 'news',
    label: 'freshtab_app_settings_news_label',
    selector: '#section-news',
    telemetryName: 'news',
    message: 'toggleComponent',
  },
];

export class Subject {
  constructor({ waitForFirstMessage = false, injectTestUtils = false } = {}) {
    this.messagesByAction = new DefaultMap(() => []);
    this.areWeListening = false;

    this.waitForFirstMessage = waitForFirstMessage;
    this.modules = {};
    this.injectTestUtils = injectTestUtils;
    this.messages = [];

    const runtime = {
      id: 'test',
      onMessage: {
        addListener: () => {
        },
        removeListener: () => {
        }
      },
      // eslint-disable-next-line consistent-return
      sendMessage: async (message, ...rest) => {
        const module = message?.module || message?.target;
        const action = message?.action || message?.message?.action;

        this.messages.push(message);

        if (this.areWeListening === true) {
          this.messagesByAction.get(action).push(message);
        }

        const response = this.modules[module]?.actions[action];
        const lastArg = rest[rest.length - 1];
        const lastArgIsCallback = typeof lastArg === 'function';
        if (!lastArgIsCallback) {
          return response;
        }
        lastArg(response);
      },
    };

    this.browser = {
      runtime,
      i18n: {
        getMessage: k => k,
      },
    };

    this.chrome = {
      runtime,
      i18n: {
        getMessage: k => k,
      },
    };
  }

  async _injectTestUtils() {
    if (this.injectTestUtils) {
      await new Promise((resolve) => {
        const testUtils = document.createElement('script');
        this.iframe.contentWindow.document.body.appendChild(testUtils);

        testUtils.onload = () => {
          resolve();
        };
        testUtils.src = '../vendor/react-dom-test-utils.js';
      });
    }
  }

  startListening() {
    if (!this.areWeListening) {
      this.messagesByAction = new DefaultMap(() => []);
      this.areWeListening = true;
    }
  }

  async load(
    { buildUrl = `/${config.testsBasePath}/freshtab/home.html`,
      iframeWidth = 900 } = {}
  ) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = buildUrl;
    this.iframe.width = iframeWidth;
    this.iframe.height = 700;
    document.body.appendChild(this.iframe);

    this.iframe.contentWindow.chrome = this.chrome;
    this.iframe.contentWindow.browser = this.browser;

    let testsUtilsInjected = false;
    let iframeLoaded = false;

    this.iframe.contentWindow.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data);
      this.messages.push(data);
      if (this.waitForFirstMessage) {
        this._injectTestUtils().then(() => { testsUtilsInjected = true; });
      }
    });

    this.iframe.contentWindow.addEventListener('load', () => {
      if (!this.waitForFirstMessage) {
        this._injectTestUtils().then(() => { testsUtilsInjected = true; });
      }
      iframeLoaded = true;
    });

    await waitFor(() => (
      testsUtilsInjected
      && iframeLoaded
      && this.iframe.contentWindow.document
    ));

    // We need to wait a bit so that the iframe is fully operational. If we
    // don't we get random errors like: 'querySelector(...) is null', etc. If a
    // brave warrior in the future wants to fix this, please do.
    return wait(400);
  }

  unload() {
    this.messages = [];
    this.messagesByAction = new DefaultMap(() => []);
    this.areWeListening = false;
    document.body.removeChild(this.iframe);
  }

  get testUtils() {
    return this.iframe.contentWindow.ReactTestUtils;
  }

  queryByI18n(label, elType = 'span') {
    const xpath = `//${elType}[text()="${label}"]`;
    const $element = this.iframe.contentWindow.document
      .evaluate(xpath, this.iframe.contentWindow.document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();

    if ($element !== null) {
      return ($element.closest('div.settings-row'));
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

  // Do we still use postMessage ?
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
        custom: [],
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

  respondsWithEmptyStats() {
    this.respondsWith({
      module: 'freshtab',
      action: 'getStats',
      response: {
        data: [],
        isEmpty: true,
        promoData: {}
      }
    });
  }

  getNews(lang) {
    const $newsNodes = this.queryAll('.news-editions-select .news-edition-option');
    return [...$newsNodes].find(n => n.value === lang);
  }

  getNewsSelect() {
    return this.query('.news-editions-select');
  }

  getSettingsElementByLabel(label, elType) {
    return this.queryByI18n(label, elType);
  }

  getSettingsElementByName(elementName) {
    return this.getSettingsElementByLabel(allElements.find(e => e.name === elementName).label);
  }

  getElementLabel(name) {
    return this.getSettingsElementByName(name).querySelector('.label');
  }

  getElementSwitch(name) {
    return this.getSettingsElementByName(name).querySelector('.toggle');
  }
}

export const allNewsLanguages = ['de', 'de-tr-en', 'fr', 'intl', 'us', 'gb', 'es', 'it'];

export const defaultConfig = Object.freeze({
  module: 'freshtab',
  action: 'getConfig',
  response: {
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
        availableEditions: allNewsLanguages.map(lang => ({
          code: lang,
          name: lang,
          isSelected: false,
        })),
        preferedCountry: 'de'
      },
      background: {
        image: 'bg-default'
      },
      stats: {
        visible: false,
      }
    },
    displayFriendsIcon: true,
    hasActiveNotifications: false,
    HISTORY_URL: '/history/index.html',
    isBetaVersion: false,
    isBlue: false,
    isBrowser: false,
    isHistoryEnabled: true,
    locale: 'en',
    messages: {},
    newTabUrl: config.settings.NEW_TAB_URL,
    product: 'CLIQZ',
    showNewBrandAlert: false,
    wallpapers: [
      {
        name: 'bg-matterhorn',
        alias: 'matterhorn',
        isDefault: true,
      },
      {
        name: 'bg-alps',
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
      },
      {
        name: 'bg-autumn',
        alias: 'autumn',
        isDefault: false,
      },
    ]
  },
});

export function getActiveConfig() {
  const activeConfig = clone(defaultConfig);
  activeConfig.response.componentsState.background.image = 'bg-alps';
  activeConfig.response.componentsState.historyDials.visible = true;
  activeConfig.response.componentsState.customDials.visible = true;
  activeConfig.response.componentsState.search.visible = true;
  activeConfig.response.componentsState.news.visible = true;
  activeConfig.response.componentsState.stats.visible = true;
  return activeConfig;
}

function checkCommon({
  defaultState,
  flippedSwitchName = false,
  subject,
}) {
  let settingsElements;
  let newsState;

  beforeEach(function () {
    settingsElements = allElements.filter(el => el.label);
    newsState = flippedSwitchName === 'news' ? !defaultState : defaultState;
  });

  it(`renders ${flippedSwitchName} switch as ${defaultState ? 'inactive' : 'active'} and the rest as ${defaultState ? 'active' : 'inactive'}`, function () {
    settingsElements.forEach((el) => {
      const switchState = el.name === flippedSwitchName;
      const $switch = subject().getElementSwitch(el.name);
      expect($switch).to.have.property('checked', switchState !== defaultState);
    });
  });

  it('renders settings panel as shown', function () {
    const $settingsPanel = subject().query('#settings-panel');

    expect($settingsPanel).to.exist;
  });

  it(`renders "Restore all" button as ${defaultState ? 'active' : 'inactive'}`, function () {
    expect(subject().query('#settings-panel button.link').disabled).to.equal(!defaultState);
  });

  it('renders news source selection form in correct state with correct number of elements', function () {
    const newsSourcesSelector = '.news-editions-select';
    const newsSourceSelector = '.news-edition-option';

    if (newsState) {
      expect(subject().query(newsSourcesSelector)).to.exist;
      expect(subject()
        .queryAll(`${newsSourcesSelector} ${newsSourceSelector}`))
        .to.have.length(allNewsLanguages.length);
    } else {
      expect(subject().query(newsSourcesSelector)).to.not.exist;
      expect(subject()
        .queryAll(`${newsSourcesSelector} ${newsSourceSelector}`)).to.have.length(0);
    }
  });

  it('sends correct telemetry signal', function () {
    const telemetryName = settingsElements[
      settingsElements.map(el => el.name).indexOf(flippedSwitchName)
    ].telemetryName;
    const telemetryState = defaultState ? 'off' : 'on';
    let count = 0;

    expect(subject().messagesByAction.has('sendTelemetry')).to.equal(true);

    const telemetrySignals = subject().messagesByAction.get('sendTelemetry');

    expect(telemetrySignals.length).to.be.above(0);

    count = telemetrySignals.filter(({ args: [arg] }) => (
      arg !== undefined
      && arg.type === 'home'
      && arg.view === 'settings'
      && arg.target === telemetryName
      && arg.action === 'click'
      && arg.state === telemetryState
    )).length;

    expect(count).to.equal(1);
  });

  it('sends correct message', function () {
    const messageName = settingsElements[
      settingsElements.map(el => el.name).indexOf(flippedSwitchName)
    ].message;

    expect(subject().messagesByAction.has(messageName)).to.equal(true);
    expect(subject().messagesByAction.get(messageName).length).to.equal(1);
  });
}

async function waitForSettingsPanel({
  subject
}) {
  subject().query('#settings-btn').click();
  await waitFor(() => subject().query('#settings-panel'));
}

function checkAllElements({
  defaultState,
  subject,
}) {
  allElements.filter(el => el.label).forEach((s) => {
    describe(`clicking on the ${s.name} switch`, function () {
      const flippedSwitchName = s.name;

      beforeEach(async function () {
        subject().startListening();
        subject().getElementSwitch(s.name).click();
        await waitFor(() => subject().query(s.selector) !== defaultState);
      });

      checkCommon({
        defaultState,
        flippedSwitchName,
        subject,
      });

      if (flippedSwitchName === 'background') {
        it(`${defaultState ? 'hides' : 'shows'} the settings area with background thumbnails`, function () {
          if (defaultState) {
            expect(subject().query('ul.background-selection-list')).to.not.exist;
          } else {
            expect(subject().query('ul.background-selection-list')).to.exist;
          }
        });
      }
    });
  });

  if (defaultState) {
    context('with DE as a default news source', function () {
      let newsSelect;

      beforeEach(function () {
        newsSelect = subject().getNewsSelect();
      });

      allNewsLanguages.forEach((language) => {
        describe(`clicking on ${language.toUpperCase()} news source`, function () {
          let isDeCurrentLang;

          beforeEach(async function () {
            isDeCurrentLang = language === 'de';
            subject().startListening();
            newsSelect.value = language;
            if (!isDeCurrentLang) {
              subject().testUtils.Simulate.change(newsSelect);
            }
            await waitFor(() => newsSelect.value === language);
          });

          it(`${isDeCurrentLang ? 'does not send any related' : 'sends correct'} telemetry signals`, function () {
            expect(subject().messagesByAction.has('sendTelemetry')).to.equal(!isDeCurrentLang);

            if (!isDeCurrentLang) {
              const telemetrySignals = subject().messagesByAction.get('sendTelemetry');
              let count = 0;

              expect(telemetrySignals.length).to.be.above(0);

              count = telemetrySignals.filter(({ args: [arg] }) => (
                arg !== undefined
                && arg.type === 'home'
                && arg.view === 'settings'
                && arg.target === 'news_language'
                && arg.action === 'click'
                && arg.state === language
              )).length;

              expect(count).to.equal(1);
            }
          });

          it(`${language === 'de' ? 'does not send any' : 'sends correct'} messages`, function () {
            if (language === 'de') {
              expect(subject().messagesByAction.has('updateTopNewsCountry')).to.equal(false);
              expect(subject().messagesByAction.has('getNews')).to.equal(false);
            } else {
              expect(subject().messagesByAction.has('updateTopNewsCountry')).to.equal(true);
              expect(subject().messagesByAction.get('updateTopNewsCountry').length).to.equal(1);

              expect(subject().messagesByAction.has('getNews')).to.equal(true);
              expect(subject().messagesByAction.get('getNews').length).to.equal(1);
            }
          });
        });
      });
    });
  }
}

export function checkSettingsUI({
  responseConfig = defaultConfig,
  defaultState = true,
  subject,
}) {
  describe(`when all elements are ${defaultState ? 'active or turned on' : 'inactive or turned off'}`, function () {
    before(async function () {
      subject().respondsWith(responseConfig);

      subject().respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: defaultState,
      });

      await subject().load();
      waitForSettingsPanel({
        subject,
      });
    });

    after(function () {
      subject().unload();
    });

    it('renders a header', function () {
      const $settingsHeader = subject().query('.settings-header');

      expect($settingsHeader).to.exist;
      expect($settingsHeader.textContent).to.equal('freshtab_app_settings_header');
    });

    it('renders correct number of elements with switches', function () {
      allElements.filter(el => el.label).length === subject().query('.settings-row .switch').length;
    });

    allElements.filter(el => el.label).forEach((el) => {
      describe(`renders ${el.name} element`, function () {
        it('with correct label`', function () {
          const $elLabel = subject().getElementLabel(el.name);
          expect($elLabel).to.exist;
        });

        it(`with existing switch turned ${defaultState ? 'on' : 'off'}`, function () {
          const $elSwitch = subject().getElementSwitch(el.name);
          expect($elSwitch).to.have.property('checked', defaultState);
        });
      });
    });

    it(`${defaultState ? 'renders' : 'does not render'} background selection`, function () {
      const $backgroundSelection = subject().query('ul.background-selection-list');

      if (defaultState) {
        expect($backgroundSelection).to.exist;
      } else {
        expect($backgroundSelection).to.not.exist;
      }
    });

    it(`renders most visited restore button as ${defaultState ? 'active' : 'inactive'}`, function () {
      const $restoreEl = subject().queryByI18n('freshtab_app_settings_most_visited_restore', 'button').querySelector('.link');
      expect($restoreEl.disabled).to.equal(!defaultState);
    });

    it(`${defaultState ? 'renders' : 'does not render'} news selection`, function () {
      const $newsSelectionArea = subject().query('.news-editions-select');
      const $newsSelectionElements = subject().queryAll('.news-editions-select .news-edition-option');

      if (defaultState) {
        expect($newsSelectionArea).to.exist;
        expect($newsSelectionElements).to.have.length(allNewsLanguages.length);
      } else {
        expect($newsSelectionArea).to.not.exist;
        expect($newsSelectionElements).to.have.length(0);
      }
    });
  });
}

export function checkSettingsInt({
  defaultState = true,
  responseConfig = defaultConfig,
  subject,
}) {
  describe(`for all areas being ${defaultState ? 'shown' : 'hidden'}`, function () {
    beforeEach(async function () {
      subject().respondsWith(responseConfig);

      if (defaultState) {
        subject().respondsWith({
          module: 'freshtab',
          action: 'checkForHistorySpeedDialsToRestore',
          response: true,
        });
      }

      await subject().load();
      waitForSettingsPanel({ subject });
    });

    afterEach(function () {
      subject().unload();
    });

    checkAllElements({
      defaultState,
      subject,
    });
  });
}

export function checkNotification({
  subject,
}) {
  const settingsPanelSelector = '#settings-panel';
  const notificationAreaSelector = '.notification';

  it('keeps settings panel closed', function () {
    expect(subject().query(settingsPanelSelector)).to.exist;
    expect(subject().query(settingsPanelSelector).className).to.not.contain('visible');
  });

  it('keeps notification area open', function () {
    expect(subject().query(notificationAreaSelector)).to.exist;
  });
}

export function checkMessages({
  expectedCount = 1,
  messageName,
  subject,
}) {
  it(`sends a ${messageName} message`, function () {
    expect(subject().messagesByAction.has(messageName)).to.equal(true);
    expect(subject().messagesByAction.get(messageName).length).to.equal(expectedCount);
  });
}

export function checkTelemetry({
  action,
  expectedCount = 1,
  element = '',
  subject,
  target,
  type,
  view = '',
}) {
  expect(subject().messagesByAction.has('sendTelemetry')).to.equal(true);
  const telemetrySignals = subject().messagesByAction.get('sendTelemetry');
  let count = 0;

  expect(telemetrySignals.length).to.be.above(0);

  if (element && view) {
    count = telemetrySignals.filter(({ args: [arg] }) => (
      arg !== undefined
      && arg.action === action
      && arg.element === element
      && arg.target === target
      && arg.type === type
      && arg.view === view
    )).length;
  } else if (view) {
    count = telemetrySignals.filter(({ args: [arg] }) => (
      arg !== undefined
      && arg.action === action
      && arg.target === target
      && arg.type === type
      && arg.view === view
    )).length;
  } else {
    count = telemetrySignals.filter(({ args: [arg] }) => (
      arg !== undefined
      && arg.action === action
      && arg.target === target
      && arg.type === type
    )).length;
  }

  expect(count).to.equal(expectedCount);
}

export const allBackgrounds = [
  { name: 'dark', bgSelector: 'body.theme-bg-dark', iconSelector: 'div[data-bg="bg-dark"]', className: 'theme-bg-dark' },
  { name: 'light', bgSelector: 'body.theme-bg-light', iconSelector: 'div[data-bg="bg-light"]', className: 'theme-bg-light' },
  { name: 'matterhorn', bgSelector: 'body.theme-bg-matterhorn', iconSelector: 'div[data-bg="bg-matterhorn"]', className: 'theme-bg-matterhorn' },
  { name: 'winter', bgSelector: 'body.theme-bg-winter', iconSelector: 'div[data-bg="bg-winter"]', className: 'theme-bg-winter' },
  { name: 'spring', bgSelector: 'body.theme-bg-spring', iconSelector: 'div[data-bg="bg-spring"]', className: 'theme-bg-spring' },
  { name: 'summer', bgSelector: 'body.theme-bg-summer', iconSelector: 'div[data-bg="bg-summer"]', className: 'theme-bg-summer' },
  { name: 'worldcup', bgSelector: 'body.theme-bg-worldcup', iconSelector: 'div[data-bg="bg-worldcup"]', className: 'theme-bg-worldcup' },
  { name: 'autumn', bgSelector: 'body.theme-bg-autumn', iconSelector: 'div[data-bg="bg-autumn"]', className: 'theme-bg-autumn' },
];
