/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { getCleanHost, parse } from '../core/url';
import logos from '../core/services/logos';
import background from '../core/base/background';
import { getMessage } from '../core/i18n';
import News from './news';

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
  requiresServices: ['logos'],
  /**
    @method init
    @param settings
  */
  init(settings, browser) {
    this.news = new News(browser);
  },

  unload() {},

  events: {},

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
  },
});
