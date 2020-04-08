/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { getCleanHost, parse } from '../core/url';
import { setTimeout, clearTimeout } from '../core/timers';
import Logger from '../core/logger';
import logos from '../core/services/logos';
import background from '../core/base/background';
import inject from '../core/kord/inject';
import { getMessage } from '../core/i18n';
import News from './news';
import { hashUrl, getProduct, getRandomDelay } from './helpers';

const logger = Logger.get('news', { level: 'log' });

const NEWS_EDITIONS = [
  {
    value: 'de',
    text: 'news_language_de',
  },
  {
    value: 'de-tr-en',
    text: 'news_language_de_tr_en',
  },
  {
    value: 'fr',
    text: 'news_language_fr',
  },
  {
    value: 'intl',
    text: 'news_language_en',
  },
  {
    value: 'us',
    text: 'news_language_us',
  },
  {
    value: 'gb',
    text: 'news_language_gb',
  },
  {
    value: 'es',
    text: 'news_language_es',
  },
  {
    value: 'it',
    text: 'news_language_it',
  },
];

/**
  @namespace <News>
  @class Background
 */
export default background({
  hpnv2: inject.module('hpnv2'),
  telemetry: inject.service('telemetry', ['isEnabled']),
  requiresServices: ['logos', 'telemetry'],
  /**
    @method init
    @param settings
  */
  init(settings, browser) {
    this.news = new News(browser);
    this._timerIds = new Set();
  },

  unload() {
    for (const timer of this._timerIds) {
      clearTimeout(timer);
    }
    this._timerIds.clear();
  },

  events: {
    'ui:enter': function pressEnterHandler(result) {
      const product = getProduct(result);
      const isPrivateResult = result.isPrivateResult || result.isPrivateMode;
      if (!product || isPrivateResult) return;

      this.actions.sendUrlHash({
        url: result.url,
        action: 'click',
        product,
      });
    },
    'ui:click-on-url': function clickOnUrlHandler(result) {
      const product = getProduct(result);
      const isPrivateResult = result.isPrivateResult || result.isPrivateMode;
      if (!product || isPrivateResult) return;

      this.actions.sendUrlHash({
        url: result.url,
        action: 'click',
        product,
      });
    },
  },

  actions: {
    async getNews() {
      const edition = this.actions.getLanguage();
      const { newsList = [], topNewsVersion = 0 } = await this.news.getNews();

      return {
        version: topNewsVersion,
        news: newsList.map(r => ({
          title: r.title_hyphenated || r.title,
          description: r.description,
          displayUrl: getCleanHost(parse(r.url)) || r.title,
          domain: r.domain,
          logo: logos.getLogoDetails(r.url),
          url: r.url,
          type: r.type,
          breaking_label: r.breaking_label,
          edition,
          imageUrl: r.media,
        })),
      };
    },

    setLanguage(language) {
      this.news.setLanguage(language);
    },

    getLanguage() {
      return this.news.getLanguage();
    },

    async getAvailableLanguages() {
      const currentEdition = await this.actions.getLanguage();
      return NEWS_EDITIONS.map(edition => ({
        code: edition.value,
        name: getMessage(edition.text),
        isSelected: edition.value === currentEdition,
      }));
    },
    async sendUrlHash({ url, action, product }) {
      const PRODUCTS = ['HBR', 'NSD', 'ATN', 'SmartCliqz'];
      const DISALLOWED_PRODUCTS = ['HBR'];
      const SUPPORTED_ACTIONS = ['click', 'hover'];

      const isNewsProduct = PRODUCTS.includes(product);
      const isDisallowed = DISALLOWED_PRODUCTS.includes(product);
      const isSupportedAction = SUPPORTED_ACTIONS.includes(action);
      const isTelemetryEnabled = this.telemetry.isEnabled();

      if (
        !isNewsProduct
        || isDisallowed
        || !isSupportedAction
        || !isTelemetryEnabled
      ) return;

      const payload = {
        article_id: hashUrl(url),
        product,
        action,
      };
      const msg = { action: 'news-api', method: 'POST', payload };

      const timer = setTimeout(() => {
        this._timerIds.delete(timer);
        this.hpnv2.action('send', msg).catch((err) => {
          logger.debug('Failed to send the following signal via hpnv2:');
          logger.debug(msg);
          logger.debug(err);
        });
      }, getRandomDelay());
      this._timerIds.add(timer);
    },
  },
});
