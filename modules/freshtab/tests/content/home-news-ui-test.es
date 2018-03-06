import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject
} from './helpers';

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
  url: `http://news${i}.com`,
  type: 'topnews'
});

describe('Fresh tab news UI', function () {
  const newsAreaSelector = '#section-news';
  const newsResponse = [
    {
      version: 0,
      news: [0, 1, 2].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(newsItem)
    },

    {
      version: 0,
      news: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(newsItem)
    },
  ];
  let subject;
  let configVisible;

  before(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      },
    });

    configVisible = clone(defaultConfig);
    configVisible.response.componentsState.news.visible = true;
  });

  after(function () {
    clearIntervals();
  });

  describe('area', function () {
    const getNewsDeLanguage = () => subject.query('#news-radio-selector-2');
    const getNewsDeTrEnLanguage = () => subject.query('#news-radio-selector-5');
    const getNewsFrLanguage = () => subject.query('#news-radio-selector-3');
    const getNewsIntlLanguage = () => subject.query('#news-radio-selector-4');
    const getNewsUsLanguage = () => subject.query('#news-radio-selector-6');
    const getNewsGbLanguage = () => subject.query('#news-radio-selector-7');

    before(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getNews',
        response: newsResponse[0]
      });
    });

    describe('when set to be visible', function () {
      before(function () {
        subject.respondsWith(configVisible);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the visibility switch turned on', function () {
        const newsSwitch = subject.queryByI18n('freshtab.app.settings.news.label')
          .querySelector('input.switch');
        expect(newsSwitch).to.have.property('checked', true);
      });

      it('has visible area with news', function () {
        expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('has all the expected selectors', function () {
        expect(getNewsDeLanguage()).to.exist;
        expect(getNewsDeTrEnLanguage()).to.exist;
        expect(getNewsFrLanguage()).to.exist;
        expect(getNewsIntlLanguage()).to.exist;
        expect(getNewsUsLanguage()).to.exist;
        expect(getNewsGbLanguage()).to.exist;
      });

      it('has no extra elements (selectors)', function () {
        expect(subject.queryAll('.radio')).to.have.lengthOf(6);
      });
    });

    describe('when set to not be visible', function () {
      before(function () {
        const configNotVisible = clone(defaultConfig);
        configNotVisible.response.componentsState.news.visible = false;
        subject.respondsWith(configNotVisible);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the visibility switch turned off', function () {
        const newsSwitch = subject.queryByI18n('freshtab.app.settings.news.label')
          .querySelector('input.switch');
        expect(newsSwitch).to.have.property('checked', false);
      });

      it('does not have visible area with news', function () {
        expect(subject.query(newsAreaSelector)).to.not.exist;
      });
    });

    describe('when set to use German sources', function () {
      before(function () {
        const configNewsDe = clone(defaultConfig);
        configNewsDe.response.componentsState.news.visible = true;
        configNewsDe.response.componentsState.news.preferedCountry = 'de';
        subject.respondsWith(configNewsDe);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the German option selected', function () {
        expect(getNewsDeLanguage()).to.have.property('checked', true);
        expect(getNewsDeTrEnLanguage()).to.have.property('checked', false);
        expect(getNewsFrLanguage()).to.have.property('checked', false);
        expect(getNewsIntlLanguage()).to.have.property('checked', false);
        expect(getNewsUsLanguage()).to.have.property('checked', false);
        expect(getNewsGbLanguage()).to.have.property('checked', false);
      });
    });

   describe('when set to use German sources translated into English', function () {
      before(function () {
        const configNewsDe = clone(defaultConfig);
        configNewsDe.response.componentsState.news.visible = true;
        configNewsDe.response.componentsState.news.preferedCountry = 'de-tr-en';
        subject.respondsWith(configNewsDe);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the German translated option selected', function () {
        expect(getNewsDeLanguage()).to.have.property('checked', false);
        expect(getNewsDeTrEnLanguage()).to.have.property('checked', true);
        expect(getNewsFrLanguage()).to.have.property('checked', false);
        expect(getNewsIntlLanguage()).to.have.property('checked', false);
        expect(getNewsUsLanguage()).to.have.property('checked', false);
        expect(getNewsGbLanguage()).to.have.property('checked', false);
      });
    });

    describe('when set to use French sources', function () {
      before(function () {
        const configNewsFr = clone(defaultConfig);
        configNewsFr.response.componentsState.news.visible = true;
        configNewsFr.response.componentsState.news.preferedCountry = 'fr';
        subject.respondsWith(configNewsFr);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the French option selected', function () {
        expect(getNewsDeLanguage()).to.have.property('checked', false);
        expect(getNewsDeTrEnLanguage()).to.have.property('checked', false);
        expect(getNewsFrLanguage()).to.have.property('checked', true);
        expect(getNewsIntlLanguage()).to.have.property('checked', false);
        expect(getNewsUsLanguage()).to.have.property('checked', false);
        expect(getNewsGbLanguage()).to.have.property('checked', false);
      });
    });

    describe('when set to use international sources', function () {
      before(function () {
        const configNewsIntl = clone(defaultConfig);
        configNewsIntl.response.componentsState.news.visible = true;
        configNewsIntl.response.componentsState.news.preferedCountry = 'intl';
        subject.respondsWith(configNewsIntl);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the international option selected', function () {
        expect(getNewsDeLanguage()).to.have.property('checked', false);
        expect(getNewsDeTrEnLanguage()).to.have.property('checked', false);
        expect(getNewsFrLanguage()).to.have.property('checked', false);
        expect(getNewsIntlLanguage()).to.have.property('checked', true);
        expect(getNewsUsLanguage()).to.have.property('checked', false);
        expect(getNewsGbLanguage()).to.have.property('checked', false);
      });
    });

    describe('when set to use US sources', function () {
      before(function () {
        const configNewsUs = clone(defaultConfig);
        configNewsUs.response.componentsState.news.visible = true;
        configNewsUs.response.componentsState.news.preferedCountry = 'us';
        subject.respondsWith(configNewsUs);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the US option selected', function () {
        expect(getNewsDeLanguage()).to.have.property('checked', false);
        expect(getNewsDeTrEnLanguage()).to.have.property('checked', false);
        expect(getNewsFrLanguage()).to.have.property('checked', false);
        expect(getNewsIntlLanguage()).to.have.property('checked', false);
        expect(getNewsUsLanguage()).to.have.property('checked', true);
        expect(getNewsGbLanguage()).to.have.property('checked', false);
      });
    });

    describe('when set to use UK sources', function () {
      before(function () {
        const configNewsGb = clone(defaultConfig);
        configNewsGb.response.componentsState.news.visible = true;
        configNewsGb.response.componentsState.news.preferedCountry = 'gb';
        subject.respondsWith(configNewsGb);
        return subject.load({ iframeWidth: 1025 });
      });

      after(function () {
        subject.unload();
      });

      it('has the UK option selected', function () {
        expect(getNewsDeLanguage()).to.have.property('checked', false);
        expect(getNewsDeTrEnLanguage()).to.have.property('checked', false);
        expect(getNewsFrLanguage()).to.have.property('checked', false);
        expect(getNewsIntlLanguage()).to.have.property('checked', false);
        expect(getNewsUsLanguage()).to.have.property('checked', false);
        expect(getNewsGbLanguage()).to.have.property('checked', true);
      });
    });
  });

  const resolutionAndTextLimit = {
    900: 160,
    1000: 110,
    1030: 100,
  };
  const resolutions = Object.keys(resolutionAndTextLimit);

  resolutions.forEach(function (screenSize) {
    describe(`when rendered on screen of width ${screenSize}`, function () {
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (i) {
        describe(`with ${i + 3} news items`, function () {
          const amountOfNewsSelector = 'div.box';
          let amountOfItemsPerPage;
          let amountOfPages;
          let amountOfNewsItems;
          let intScreenSize;

          before(function () {
            intScreenSize = parseInt(screenSize, 10);
            subject.respondsWith({
              module: 'freshtab',
              action: 'getNews',
              response: newsResponse[i]
            });

            subject.respondsWith(configVisible);

            return subject.load({ iframeWidth: intScreenSize }).then(() => {
              if (intScreenSize === 900) {
                amountOfItemsPerPage = 1;
              } else if (intScreenSize === 1000) {
                amountOfItemsPerPage = 2;
              } else if (intScreenSize === 1030) {
                amountOfItemsPerPage = 3;
              }

              amountOfPages = Math.ceil(newsResponse[i].news.length / amountOfItemsPerPage);
              amountOfNewsItems = subject.queryAll(amountOfNewsSelector);
            });
          });

          after(function () {
            subject.unload();
          });

          it('has correct amount of news pages', function () {
            const amountOfPagesSelector = 'button.dash';
            const amountOfPagesItems = subject.queryAll(amountOfPagesSelector);

            /* Corner case: 3 news items on a large screen do not
               render button.dash items */
            if ((intScreenSize === 1030) && (amountOfPagesItems.length === 0)) {
              expect(1).to.equal(amountOfPages);
            } else {
              expect(amountOfPagesItems.length).to.equal(amountOfPages);
            }
          });

          it('has correct amount of news per page', function () {
            expect(amountOfNewsItems.length).to.equal(amountOfItemsPerPage);
          });

          describe('renders all news items', function () {
            it('with an existing and correct logo', function () {
              const newsLogoSelector = 'div.box a div.header div.logo';
              const newsLogoItems = subject.queryAll(newsLogoSelector);

              expect(newsLogoItems.length).to.be.above(0);
              [...newsLogoItems].forEach(function (logo, count) {
                expect(subject.getComputedStyle(logo).backgroundImage)
                  .to.contain(newsResponse[i].news[count].logo.backgroundImage);
              });
            });

            it('with an existing and correct source domain', function () {
              const newsDomainSelector = 'div.box a div.header div.url';
              const newsDomainItems = subject.queryAll(newsDomainSelector);

              expect(newsDomainItems.length).to.be.above(0);
              [...newsDomainItems].forEach(function (domain, count) {
                expect(domain)
                  .to.have.text(newsResponse[i].news[count].displayUrl);
              });
            });

            it('with an existing and correct title', function () {
              const newsTitleSelector = 'div.box a div.news-title';
              const newsTitleItems = subject.queryAll(newsTitleSelector);

              expect(newsTitleItems.length).to.be.above(0);
              [...newsTitleItems].forEach(function (title, count) {
                expect(title)
                  .to.have.text(newsResponse[i].news[count].title);
              });
            });

            it('with an existing and correct source link', function () {
              const newsLinkSelector = 'div.box a';
              const newsLinkItems = subject.queryAll(newsLinkSelector);

              expect(newsLinkItems.length).to.be.above(0);
              [...newsLinkItems].forEach(function (link, count) {
                expect(link.href)
                  .to.contain(newsResponse[i].news[count].url);
              });
            });

            it('with an existing and correct description', function () {
              const newsTextSelector = 'div.box a div.news-description';
              const newsTextItems = subject.queryAll(newsTextSelector);

              expect(newsTextItems.length).to.be.above(0);
              [...newsTextItems].forEach(function (text, count) {
                /* Slicing removes ellipsis at the end */
                expect(newsResponse[i].news[count].description)
                  .to.contain(text.textContent.slice(0, text.textContent.length - 3));
              });
            });

            it('with a description of correct length', function () {
              const newsTextSelector = 'div.box a div.news-description';
              const newsTextItems = subject.queryAll(newsTextSelector);

              expect(newsTextItems.length).to.be.above(0);
              [...newsTextItems].forEach(function (text) {
                /* Slicing removes ellipsis at the end */
                expect(text.textContent.slice(0, text.textContent.length - 3).length)
                .lte(resolutionAndTextLimit[screenSize]);
              });
            });

            it('with an existing "Read more" text', function () {
              const newsReadMoreSelector = 'div.box a div.read-more-button';
              const newsReadMoreItems = subject.queryAll(newsReadMoreSelector);
              expect(newsReadMoreItems).to.exist;
            });
          });
        });
      });
    });
  });
});
