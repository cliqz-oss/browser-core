import {
  clone,
  expect,
} from '../../core/test-helpers';
import {
  allNewsLanguages,
  defaultConfig,
  generateNewsResponse,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab news UI', function () {
  const newsResponse = generateNewsResponse();
  const newsAreaSelector = '#section-news';
  let subject;
  let configVisible;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyStats();

    configVisible = clone(defaultConfig);
    configVisible.response.componentsState.news.visible = true;
  });

  describe('area', function () {
    before(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getNews',
        response: newsResponse[0]
      });
    });

    describe('when set to be visible', function () {
      before(async function () {
        subject.respondsWith(configVisible);
        await subject.load({ iframeWidth: 1025 });
        return subject.query('#settings-btn').click();
      });

      after(function () {
        subject.unload();
      });

      it('has the visibility switch turned on', function () {
        const $switch = subject.queryByI18n('freshtab_app_settings_news_label')
          .querySelector('input.switch');
        expect($switch).to.have.property('checked', true);
      });

      it('has visible area with news', function () {
        expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('has all the expected selectors', function () {
        allNewsLanguages.forEach((lang) => {
          expect(subject.getNews(lang)).to.exist;
        });
      });

      it('has no extra elements (selectors)', function () {
        expect(subject.queryAll('.news-edition-option')).to.have.lengthOf(allNewsLanguages.length);
      });
    });

    describe('when set to not be visible', function () {
      before(async function () {
        const configNotVisible = clone(defaultConfig);
        configNotVisible.response.componentsState.news.visible = false;
        subject.respondsWith(configNotVisible);
        await subject.load({ iframeWidth: 1025 });
        return subject.query('#settings-btn').click();
      });

      after(function () {
        subject.unload();
      });

      it('has the visibility switch turned off', function () {
        const $switch = subject.queryByI18n('freshtab_app_settings_news_label')
          .querySelector('input.switch');
        expect($switch).to.have.property('checked', false);
      });

      it('does not have visible area with news', function () {
        expect(subject.query(newsAreaSelector)).to.not.exist;
      });
    });

    allNewsLanguages.forEach((lang) => {
      describe(`when set to use ${lang.toUpperCase()} sources`, function () {
        before(async function () {
          const configNewsDe = clone(defaultConfig);
          configNewsDe.response.componentsState.news.visible = true;
          configNewsDe.response.componentsState.news.preferedCountry = lang;
          subject.respondsWith(configNewsDe);
          await subject.load({ iframeWidth: 1025 });
          return subject.query('#settings-btn').click();
        });

        after(function () {
          subject.unload();
        });

        it(`has the ${lang.toUpperCase()} option selected`, function () {
          expect(subject.getNewsSelect().value).to.equal(lang);
        });
      });
    });
  });

  const resolutionAndTextLimit = {
    900: 190,
    1000: 140,
    1030: 130,
    1700: 180
  };

  const resolutions = Object.keys(resolutionAndTextLimit);

  resolutions.forEach(function (screenSize) {
    describe(`when rendered on screen of width ${screenSize}`, function () {
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (i) {
        describe(`with ${i + 3} news items`, function () {
          const amountOfNewsSelector = '.box';
          let amountOfItemsPerPage;
          let amountOfPages;
          let amountOfNewsItems;
          let intScreenSize;

          before(async function () {
            intScreenSize = parseInt(screenSize, 10);
            subject.respondsWith({
              module: 'freshtab',
              action: 'getNews',
              response: newsResponse[i]
            });

            subject.respondsWith(configVisible);
            await subject.load({ iframeWidth: intScreenSize });

            if (intScreenSize === 900) {
              amountOfItemsPerPage = 1;
            } else if (intScreenSize === 1000) {
              amountOfItemsPerPage = 2;
            } else if ((intScreenSize === 1030) || (intScreenSize === 1700)) {
              amountOfItemsPerPage = 3;
            }

            amountOfPages = Math.ceil(newsResponse[i].news.length / amountOfItemsPerPage);
            amountOfNewsItems = subject.queryAll(amountOfNewsSelector);
          });

          after(function () {
            subject.unload();
          });

          it('has correct amount of news pages', function () {
            const newsDashSelector = 'button.dash';
            const $newsDashes = subject.queryAll(newsDashSelector);

            /* Corner case: 3 news items on a large screen do not
               render button.dash items */
            if (((intScreenSize === 1030) || (intScreenSize === 1700))
              && ($newsDashes.length === 0)) {
              expect(1).to.equal(amountOfPages);
            } else {
              expect($newsDashes.length).to.equal(amountOfPages);
            }
          });

          it('has correct amount of news per page', function () {
            expect(amountOfNewsItems.length).to.equal(amountOfItemsPerPage);
          });

          describe('renders all news items', function () {
            it('with an existing and correct logo', function () {
              const logoSelector = '.box a .header .logo';
              const $logos = subject.queryAll(logoSelector);

              expect($logos.length).to.be.above(0);
              [...$logos].forEach(function (logo, count) {
                expect(subject.getComputedStyle(logo).backgroundImage)
                  .to.contain(newsResponse[i].news[count].logo.backgroundImage);
              });
            });

            it('with an existing and correct source domain', function () {
              const domainSelector = '.box a .header .url';
              const $domains = subject.queryAll(domainSelector);

              expect($domains.length).to.be.above(0);
              [...$domains].forEach(function (domain, count) {
                expect(domain)
                  .to.have.text(newsResponse[i].news[count].displayUrl);
              });
            });

            it('with an existing and correct title', function () {
              const titleSelector = '.box a .news-title';
              const $titles = subject.queryAll(titleSelector);

              expect($titles.length).to.be.above(0);
              [...$titles].forEach(function (title, count) {
                expect(title)
                  .to.have.text(newsResponse[i].news[count].title);
              });
            });

            it('with an existing and correct source link', function () {
              const linkSelector = '.box a';
              const $links = subject.queryAll(linkSelector);

              expect($links.length).to.be.above(0);
              [...$links].forEach(function (link, count) {
                expect(link.href)
                  .to.contain(newsResponse[i].news[count].url);
              });
            });

            it('with an existing and correct description with correct length', function () {
              const textSelector = '.box a .news-description';
              const $descriptions = subject.queryAll(textSelector);

              expect($descriptions.length).to.be.above(0);
              [...$descriptions].forEach(function (text, count) {
                /* Slicing removes ellipsis at the end */
                expect(newsResponse[i].news[count].description)
                  .to.contain(text.textContent.slice(0, text.textContent.length - 3));
                expect(text.textContent.slice(0, text.textContent.length - 3).length)
                  .lte(resolutionAndTextLimit[screenSize]);
              });
            });

            it('with an existing "Read more" text', function () {
              const readMoreSelector = '.box a .read-more-button';
              const $readMores = subject.queryAll(readMoreSelector);
              expect($readMores).to.exist;
            });
          });
        });
      });
    });
  });
});
