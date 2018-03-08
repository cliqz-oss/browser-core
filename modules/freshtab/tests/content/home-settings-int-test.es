import {
  clone,
  clearIntervals,
  waitFor,
  Subject,
  defaultConfig,
} from './helpers';

describe('Fresh tab interactions with settings switches', function () {
  const settingsButtonSelector = '#settings-btn';
  const settingsPanelSelector = '#settings-panel';
  const backgroundAreaSelector = 'ul.background-selection-list';
  const mostVisitedAreaSelector = '#section-most-visited';
  const favoritesAreaSelector = '#section-favorites';
  const searchAreaSelector = 'div.search';
  const newsAreaSelector = '#section-news';
  const cliqzThemeTxt = 'Cliqz Theme';
  const bgLabelTxt = 'freshtab.app.settings.background.label';
  const mostVisitedLabelTxt = 'freshtab.app.settings.most-visited.label';
  const favoritesLabelTxt = 'freshtab.app.settings.favorites.label';
  const searchOptionsTxt = 'freshtab.app.settings.search.label';
  const newsOptionsTxt = 'freshtab.app.settings.news.label';
  let subject;
  let messages;
  let listener;
  let cliqzThemeSwitch;
  let backgroundSwitch;
  let mostVisitedSwitch;
  let favoritesSwitch;
  let searchSwitch;
  let newsSwitch;

  beforeEach(function () {
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
        history: [
          {
            title: 'https://this.test.title',
            id: 'this.test.id',
            url: 'https://this.test.domain',
            displayTitle: 't0',
            custom: false,
            logo: {
              text: '0',
              backgroundColor: 'c3043e',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #c3043e;color:#fff;'
            }
          }
        ],
        custom: []
      },
    });
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: [
          {
            title: 'Rise in acid attacks prompts calls for widespread first aid training',
            description: 'Doctors are calling for widespread public first aid training on how to immediately help victims of an acid attack following an increase in the number of attacks.',
            displayUrl: 'itv.com',
            logo: {
              backgroundColor: '333333',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg)',
              text: 'it',
              color: '#fff',
              buttonsClass: 'cliqz-brands-button-10',
              style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/itv/$.svg); text-indent: -10em;'
            },
            url: 'http://www.itv.com/news/2017-08-03/rise-in-acid-attacks-prompts-calls-for-widespread-first-aid-training/',
            type: 'topnews'
          },
          {
            title: 'Trump Says U.S.‘Losing’ Afghan War in Tense Meeting With Generals',
            description: 'President Donald Trump has become increasingly frustrated with his advisers tasked with crafting a new U.S. strategy in Afghanistan and recently suggested firing the war\'s top military commander during a tense meeting at the White House, according to senior administration officials.',
            displayUrl: 'nbcnews.com',
            logo:
            {
              backgroundColor: '333333',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/nbcnews/$.svg)',
              text: 'nb',
              color: '#fff',
              buttonsClass: 'cliqz-brands-button-10',
              style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/nbcnews/$.svg); text-indent: -10em;'
            },
            url: 'http://www.nbcnews.com/news/us-news/trump-says-u-s-losing-afghan-war-tense-meeting-generals-n789006',
            type: 'topnews'
          },
          {
            title: 'Gene editing could wipe out inherited diseases',
            description: 'The highly controversial procedure shows gene editing could prevent thousands of conditions being passed down through generations.',
            displayUrl: 'news.sky.com',
            logo: {
              backgroundColor: '333333',
              backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/sky/$.svg)',
              text: 'sk',
              color: '#fff',
              buttonsClass: 'cliqz-brands-button-10',
              style: 'background-color: #333333;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1473867650984/logos/sky/$.svg); text-indent: -10em;'
            },
            url: 'http://news.sky.com/story/scientists-edit-genes-in-human-embryos-to-prevent-inherited-diseases-10971228',
            type: 'topnews'
          }
        ]
      }
    });
  });

  afterEach(function () {
    clearIntervals();
  });

  describe('for all areas being hidden', function () {
    beforeEach(function () {
      const withBlueBgConfig = clone(defaultConfig);
      withBlueBgConfig.response.isBlueBackgroundSupported = true;
      withBlueBgConfig.response.isBlueThemeSupported = true;
      withBlueBgConfig.response.componentsState.background.image = 'bg-default';
      subject.respondsWith(withBlueBgConfig);
      return subject.load().then(() => {
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
        backgroundSwitch = subject.queryByI18n(bgLabelTxt)
          .querySelector('input.switch');
        mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt)
          .querySelector('input.switch');
        favoritesSwitch = subject.queryByI18n(favoritesLabelTxt)
          .querySelector('input.switch');
        searchSwitch = subject.queryByI18n(searchOptionsTxt)
          .querySelector('input.switch');
        newsSwitch = subject.queryByI18n(newsOptionsTxt)
          .querySelector('input.switch');

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('clicking on the Cliqz theme switch', function () {
      beforeEach(function () {
        cliqzThemeSwitch.click();
      });

      it('flips the theme selection switch to active', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(backgroundSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('leaves all FT areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleBlueTheme" message', function () {
        chai.expect(messages.has('toggleBlueTheme')).to.equal(true);
        chai.expect(messages.get('toggleBlueTheme').length).to.equal(1);
      });

      it('sends a "settings > cliqz_theme > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'cliqz_theme') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the background selection switch', function () {
      beforeEach(function () {
        backgroundSwitch.click();
        return waitFor(() => subject.query(backgroundAreaSelector));
      });

      it('flips the background selection switch to active', function () {
        chai.expect(backgroundSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the settings area with background thumbnails', function () {
        chai.expect(subject.query(backgroundAreaSelector)).to.exist;
      });

      it('changes background to blue', function () {
        chai.expect(subject.query('body').className).to.contain('theme-bg-blue');
      });

      it('leaves all FT areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "saveBackgroundImage" message', function () {
        chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
        chai.expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      it('sends a "settings > background > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'background') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the most visited switch', function () {
      beforeEach(function () {
        mostVisitedSwitch.click();
        return waitFor(() => subject.query(mostVisitedAreaSelector));
      });

      it('flips the most visited switch to active', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
        chai.expect(backgroundSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with most visited', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > topsites > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'topsites') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the favorites switch', function () {
      beforeEach(function () {
        favoritesSwitch.click();
        return waitFor(() => subject.query(favoritesAreaSelector));
      });

      it('flips the favorites switch to active', function () {
        chai.expect(favoritesSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
        chai.expect(backgroundSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with favorites', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > favorites > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'favorites') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the search switch', function () {
      beforeEach(function () {
        searchSwitch.click();
        return waitFor(() => subject.query(searchAreaSelector));
      });

      it('flips the search switch to active', function () {
        chai.expect(searchSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
        chai.expect(backgroundSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with search', function () {
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > search_bar > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'search_bar') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the news switch', function () {
      beforeEach(function () {
        newsSwitch.click();
        return waitFor(() => subject.query(newsAreaSelector));
      });

      it('flips the news switch to active', function () {
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
        chai.expect(backgroundSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with news', function () {
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('shows news sources seletion', function () {
        const newsDeLanguageSelector = '#news-radio-selector-2';
        const newsFrLanguageSelector = '#news-radio-selector-3';
        const newsIntlLanguageSelector = '#news-radio-selector-4';
        const newsDeLanguage = subject.query(newsDeLanguageSelector);
        const newsFrLanguage = subject.query(newsFrLanguageSelector);
        const newsIntlLanguage = subject.query(newsIntlLanguageSelector);

        chai.expect(newsDeLanguage).to.exist;
        chai.expect(newsFrLanguage).to.exist;
        chai.expect(newsIntlLanguage).to.exist;
      });

      it('leaves other areas hidden', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > news > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'news') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on all switches', function () {
      beforeEach(function () {
        cliqzThemeSwitch.click();
        backgroundSwitch.click();
        mostVisitedSwitch.click();
        favoritesSwitch.click();
        searchSwitch.click();
        newsSwitch.click();
        return waitFor(() => subject.query(newsAreaSelector));
      });

      it('shows all areas', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('shows the settings area with background thumbnails', function () {
        chai.expect(subject.query(backgroundAreaSelector)).to.exist;
      });

      it('changes background to blue', function () {
        chai.expect(subject.query('body').className).to.contain('theme-bg-blue');
      });

      it('changes state of all switches', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        chai.expect(backgroundSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('sends four "toggleComponent" messages', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(4);
      });

      it('sends five "settings > XXX > click" telemetry signals', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (
                (item.args[0].target === 'background') ||
                (item.args[0].target === 'topsites') ||
                (item.args[0].target === 'favorites') ||
                (item.args[0].target === 'search_bar') ||
                (item.args[0].target === 'news')
              ) &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'on')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(5);
      });

      it('sends a "saveBackgroundImage" message', function () {
        chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
        chai.expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      describe('then closing and opening the panel', function () {
        beforeEach(function () {
          subject.query('button.close').click();
          return waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'))
            .then(() => {
              subject.query(settingsButtonSelector).click();
              return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
            });
        });

        it('keeps all switches state as active', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
          chai.expect(backgroundSwitch).to.have.property('checked', true);
          chai.expect(mostVisitedSwitch).to.have.property('checked', true);
          chai.expect(favoritesSwitch).to.have.property('checked', true);
          chai.expect(searchSwitch).to.have.property('checked', true);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps showing all areas', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.exist;
          chai.expect(subject.query(searchAreaSelector)).to.exist;
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('keeps showing the settings area with background thumbnails', function () {
          chai.expect(subject.query(backgroundAreaSelector)).to.exist;
        });

        it('keeps background as blue', function () {
          chai.expect(subject.query('body').className).to.contain('theme-bg-blue');
        });
      });
    });
  });

  describe('for all areas being visible', function () {
    beforeEach(function () {
      const allVisibleConfig = clone(defaultConfig);
      allVisibleConfig.response.blueTheme = true;
      allVisibleConfig.response.isBlueBackgroundSupported = true;
      allVisibleConfig.response.isBlueThemeSupported = true;
      allVisibleConfig.response.componentsState.background.image = 'bg-blue';
      allVisibleConfig.response.componentsState.historyDials.visible = true;
      allVisibleConfig.response.componentsState.customDials.visible = true;
      allVisibleConfig.response.componentsState.search.visible = true;
      allVisibleConfig.response.componentsState.news.visible = true;
      subject.respondsWith(allVisibleConfig);

      return subject.load().then(() => {
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
        backgroundSwitch = subject.queryByI18n(bgLabelTxt)
          .querySelector('input.switch');
        mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt)
          .querySelector('input.switch');
        favoritesSwitch = subject.queryByI18n(favoritesLabelTxt)
          .querySelector('input.switch');
        searchSwitch = subject.queryByI18n(searchOptionsTxt)
          .querySelector('input.switch');
        newsSwitch = subject.queryByI18n(newsOptionsTxt)
          .querySelector('input.switch');
        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector));
      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('clicking on the Cliqz theme switch', function () {
      beforeEach(function () {
        cliqzThemeSwitch.click();
      });

      it('flips the theme selection switch to active', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(backgroundSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('leaves all FT areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleBlueTheme" message', function () {
        chai.expect(messages.has('toggleBlueTheme')).to.equal(true);
        chai.expect(messages.get('toggleBlueTheme').length).to.equal(1);
      });

      it('sends a "settings > cliqz_theme > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'cliqz_theme') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the background selection switch', function () {
      beforeEach(function () {
        backgroundSwitch.click();
        return waitFor(() => !subject.query(backgroundAreaSelector));
      });

      it('flips the background selection switch to inactive', function () {
        chai.expect(backgroundSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the settings area with background thumbnails', function () {
        chai.expect(subject.query(backgroundAreaSelector)).to.not.exist;
      });

      it('changes background to empty', function () {
        chai.expect(subject.query('body').className).to.contain('theme-bg-default');
      });

      it('leaves all FT areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "saveBackgroundImage" message', function () {
        chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
        chai.expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      it('sends a "settings > background > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'background') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the most visited switch', function () {
      beforeEach(function () {
        mostVisitedSwitch.click();
        return waitFor(() => !subject.query(mostVisitedAreaSelector));
      });

      it('flips the most visited switch to inactive', function () {
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        chai.expect(backgroundSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with most visited', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > topsites > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'topsites') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the favorites switch', function () {
      beforeEach(function () {
        favoritesSwitch.click();
        return waitFor(() => !subject.query(favoritesAreaSelector));
      });

      it('flips the favorites switch to inactive', function () {
        chai.expect(favoritesSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with favorites', function () {
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > favorites > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'favorites') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the search switch', function () {
      beforeEach(function () {
        searchSwitch.click();
        return waitFor(() => !subject.query(searchAreaSelector));
      });

      it('flips the search switch to inactive', function () {
        chai.expect(searchSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with search', function () {
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > search_bar > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'search_bar') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the news switch', function () {
      beforeEach(function () {
        newsSwitch.click();
        return waitFor(() => !subject.query(newsAreaSelector));
      });

      it('flips the news switch to inactive', function () {
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(mostVisitedSwitch).to.have.property('checked', true);
        chai.expect(favoritesSwitch).to.have.property('checked', true);
        chai.expect(searchSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with news', function () {
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('hides news sources selection', function () {
        const newsDeLanguageSelector = '#news-radio-selector-2';
        const newsFrLanguageSelector = '#news-radio-selector-3';
        const newsIntlLanguageSelector = '#news-radio-selector-4';
        const newsDeLanguage = subject.query(newsDeLanguageSelector);
        const newsFrLanguage = subject.query(newsFrLanguageSelector);
        const newsIntlLanguage = subject.query(newsIntlLanguageSelector);

        chai.expect(newsDeLanguage).to.not.exist;
        chai.expect(newsFrLanguage).to.not.exist;
        chai.expect(newsIntlLanguage).to.not.exist;
      });

      it('leaves other areas visible', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        chai.expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > news > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (item.args[0].target === 'news') &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on all switches', function () {
      beforeEach(function () {
        cliqzThemeSwitch.click();
        backgroundSwitch.click();
        mostVisitedSwitch.click();
        favoritesSwitch.click();
        searchSwitch.click();
        newsSwitch.click();
        return waitFor(() => !subject.query(newsAreaSelector));
      });

      it('hides all FT areas', function () {
        chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
        chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        chai.expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('hides the settings area with background thumbnails', function () {
        chai.expect(subject.query(backgroundAreaSelector)).to.not.exist;
      });

      it('changes background to empty', function () {
        chai.expect(subject.query('body').className).to.contain('theme-bg-default');
      });

      it('changes state of all switches', function () {
        chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        chai.expect(favoritesSwitch).to.have.property('checked', false);
        chai.expect(searchSwitch).to.have.property('checked', false);
        chai.expect(newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        chai.expect(subject.query(settingsPanelSelector)).to.exist;
        chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('sends four "toggleComponent" messages', function () {
        chai.expect(messages.has('toggleComponent')).to.equal(true);
        chai.expect(messages.get('toggleComponent').length).to.equal(4);
      });

      it('sends five "settings > XXX > click" telemetry signals', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'settings') &&
              (
                (item.args[0].target === 'background') ||
                (item.args[0].target === 'topsites') ||
                (item.args[0].target === 'favorites') ||
                (item.args[0].target === 'search_bar') ||
                (item.args[0].target === 'news')
              ) &&
              (item.args[0].action === 'click') &&
              (item.args[0].state === 'off')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(5);
      });

      it('sends a "saveBackgroundImage" message', function () {
        chai.expect(messages.has('saveBackgroundImage')).to.equal(true);
        chai.expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      describe('then closing and opening the panel', function () {
        beforeEach(function () {
          subject.query('button.close').click();
          return waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'))
            .then(() => {
              subject.query(settingsButtonSelector).click();
              return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
            });
        });

        it('keeps all switches state as inactive', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', false);
        });

        it('keeps hiding the settings area with background thumbnails', function () {
          chai.expect(subject.query(backgroundAreaSelector)).to.not.exist;
        });

        it('keeps background as empty', function () {
          chai.expect(subject.query('body').className).to.contain('theme-bg-default');
        });

        it('keeps hiding all areas', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
          chai.expect(subject.query(newsAreaSelector)).to.not.exist;
        });
      });
    });
  });

  describe('with only news area visible', function () {
    const newsDeLanguageSelector = '#news-radio-selector-2';
    const newsFrLanguageSelector = '#news-radio-selector-3';
    const newsIntlLanguageSelector = '#news-radio-selector-4';
    let newsDeLanguage;
    let newsFrLanguage;
    let newsIntlLanguage;

    describe('and DE as default source', function () {
      beforeEach(function () {
        const newsShownConfigDe = clone(defaultConfig);
        newsShownConfigDe.response.isBlueBackgroundSupported = true;
        newsShownConfigDe.response.isBlueThemeSupported = true;
        newsShownConfigDe.response.componentsState.background.image = 'bg-default';
        newsShownConfigDe.response.componentsState.news.visible = true;
        newsShownConfigDe.response.componentsState.news.preferedCountry = 'de';
        subject.respondsWith(newsShownConfigDe);

        return subject.load().then(() => {
          // Keep track of received messages
          messages = new Map();
          listener = function (msg) {
            if (!messages.has(msg.action)) {
              messages.set(msg.action, []);
            }

            messages.get(msg.action).push(msg);
          };
          subject.chrome.runtime.onMessage.addListener(listener);

          cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
          backgroundSwitch = subject.queryByI18n(bgLabelTxt)
            .querySelector('input.switch');
          mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt)
            .querySelector('input.switch');
          favoritesSwitch = subject.queryByI18n(favoritesLabelTxt)
            .querySelector('input.switch');
          searchSwitch = subject.queryByI18n(searchOptionsTxt)
            .querySelector('input.switch');
          newsSwitch = subject.queryByI18n(newsOptionsTxt)
            .querySelector('input.switch');

          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the international news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsFrLanguage = subject.query(newsFrLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsIntlLanguageSelector).click();
          return waitFor(() => newsIntlLanguage.checked);
        });

        it('changes news source selection to INTL', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', false);
          chai.expect(newsFrLanguage).to.have.property('checked', false);
          chai.expect(newsIntlLanguage).to.have.property('checked', true);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          chai.expect(messages.has('updateTopNewsCountry')).to.equal(true);
          chai.expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          chai.expect(messages.has('getNews')).to.equal(true);
          chai.expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'settings') &&
                (item.args[0].target === 'news_language') &&
                (item.args[0].action === 'click') &&
                (item.args[0].state === 'intl')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.true;
          chai.expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsFrLanguage = subject.query(newsFrLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsDeLanguageSelector).click();
          return waitFor(() => newsDeLanguage.checked);
        });

        it('keeps news source selection to DE', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', true);
          chai.expect(newsFrLanguage).to.have.property('checked', false);
          chai.expect(newsIntlLanguage).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          chai.expect(messages.has('updateTopNewsCountry')).to.equal(false);
          chai.expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'settings') &&
                (item.args[0].target === 'news_language') &&
                (item.args[0].action === 'click') &&
                (item.args[0].state === 'intl')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.false;
          chai.expect(count).to.equal(0);
        });
      });
    });

    describe('and FR as default source', function () {
      beforeEach(function () {
        const newsShownConfigFr = clone(defaultConfig);
        newsShownConfigFr.response.isBlueBackgroundSupported = true;
        newsShownConfigFr.response.isBlueThemeSupported = true;
        newsShownConfigFr.response.componentsState.background.image = 'bg-default';
        newsShownConfigFr.response.componentsState.news.visible = true;
        newsShownConfigFr.response.componentsState.news.preferedCountry = 'fr';
        subject.respondsWith(newsShownConfigFr);

        return subject.load().then(() => {
          // Keep track of received messages
          messages = new Map();
          listener = function (msg) {
            if (!messages.has(msg.action)) {
              messages.set(msg.action, []);
            }

            messages.get(msg.action).push(msg);
          };
          subject.chrome.runtime.onMessage.addListener(listener);

          cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
          backgroundSwitch = subject.queryByI18n(bgLabelTxt)
            .querySelector('input.switch');
          mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt)
            .querySelector('input.switch');
          favoritesSwitch = subject.queryByI18n(favoritesLabelTxt)
            .querySelector('input.switch');
          searchSwitch = subject.queryByI18n(searchOptionsTxt)
            .querySelector('input.switch');
          newsSwitch = subject.queryByI18n(newsOptionsTxt)
            .querySelector('input.switch');

          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the German news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsFrLanguage = subject.query(newsFrLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsDeLanguageSelector).click();
          return waitFor(() => newsDeLanguage.checked);
        });

        it('changes news source selection to DE', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', true);
          chai.expect(newsFrLanguage).to.have.property('checked', false);
          chai.expect(newsIntlLanguage).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          chai.expect(messages.has('updateTopNewsCountry')).to.equal(true);
          chai.expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          chai.expect(messages.has('getNews')).to.equal(true);
          chai.expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'settings') &&
                (item.args[0].target === 'news_language') &&
                (item.args[0].action === 'click') &&
                (item.args[0].state === 'de')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.true;
          chai.expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsFrLanguage = subject.query(newsFrLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsFrLanguageSelector).click();
          return waitFor(() => newsFrLanguage.checked);
        });

        it('keeps news source selection to FR', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', false);
          chai.expect(newsFrLanguage).to.have.property('checked', true);
          chai.expect(newsIntlLanguage).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          chai.expect(messages.has('updateTopNewsCountry')).to.equal(false);
          chai.expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'settings') &&
                (item.args[0].target === 'news_language') &&
                (item.args[0].action === 'click') &&
                (item.args[0].state === 'de')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.false;
          chai.expect(count).to.equal(0);
        });
      });
    });

    describe('and INTL as default source', function () {
      beforeEach(function () {
        const newsShownConfigIntl = clone(defaultConfig);
        newsShownConfigIntl.response.isBlueBackgroundSupported = true;
        newsShownConfigIntl.response.isBlueThemeSupported = true;
        newsShownConfigIntl.response.componentsState.background.image = 'bg-default';
        newsShownConfigIntl.response.componentsState.news.visible = true;
        newsShownConfigIntl.response.componentsState.news.preferedCountry = 'intl';
        subject.respondsWith(newsShownConfigIntl);

        return subject.load().then(() => {
          // Keep track of received messages
          messages = new Map();
          listener = function (msg) {
            if (!messages.has(msg.action)) {
              messages.set(msg.action, []);
            }

            messages.get(msg.action).push(msg);
          };
          subject.chrome.runtime.onMessage.addListener(listener);

          cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
          backgroundSwitch = subject.queryByI18n(bgLabelTxt)
            .querySelector('input.switch');
          mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt)
            .querySelector('input.switch');
          favoritesSwitch = subject.queryByI18n(favoritesLabelTxt)
            .querySelector('input.switch');
          searchSwitch = subject.queryByI18n(searchOptionsTxt)
            .querySelector('input.switch');
          newsSwitch = subject.queryByI18n(newsOptionsTxt)
            .querySelector('input.switch');

          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the French news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsFrLanguage = subject.query(newsFrLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsFrLanguageSelector).click();
          return waitFor(() => newsFrLanguage.checked);
        });

        it('changes news source selection to FR', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', false);
          chai.expect(newsFrLanguage).to.have.property('checked', true);
          chai.expect(newsIntlLanguage).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          chai.expect(messages.has('updateTopNewsCountry')).to.equal(true);
          chai.expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          chai.expect(messages.has('getNews')).to.equal(true);
          chai.expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'settings') &&
                (item.args[0].target === 'news_language') &&
                (item.args[0].action === 'click') &&
                (item.args[0].state === 'fr')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.true;
          chai.expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          newsDeLanguage = subject.query(newsDeLanguageSelector);
          newsFrLanguage = subject.query(newsFrLanguageSelector);
          newsIntlLanguage = subject.query(newsIntlLanguageSelector);
          subject.query(newsIntlLanguageSelector).click();
          return waitFor(() => newsIntlLanguage.checked);
        });

        it('keeps news source selection to INTL', function () {
          chai.expect(newsDeLanguage).to.have.property('checked', false);
          chai.expect(newsFrLanguage).to.have.property('checked', false);
          chai.expect(newsIntlLanguage).to.have.property('checked', true);
        });

        it('leaves other panel switches unchanged', function () {
          chai.expect(cliqzThemeSwitch).to.have.property('checked', false);
          chai.expect(backgroundSwitch).to.have.property('checked', false);
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
          chai.expect(favoritesSwitch).to.have.property('checked', false);
          chai.expect(searchSwitch).to.have.property('checked', false);
          chai.expect(newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          chai.expect(subject.query(settingsPanelSelector)).to.exist;
          chai.expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          chai.expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          chai.expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          chai.expect(subject.query(favoritesAreaSelector)).to.not.exist;
          chai.expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          chai.expect(messages.has('updateTopNewsCountry')).to.equal(false);
          chai.expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'settings') &&
                (item.args[0].target === 'news_language') &&
                (item.args[0].action === 'click') &&
                (item.args[0].state === 'fr')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.false;
          chai.expect(count).to.equal(0);
        });
      });
    });
  });
});
