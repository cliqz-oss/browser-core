import {
  clone,
  clearIntervals,
  Subject,
  defaultConfig,
} from './helpers';

describe('Fresh tab settings panel UI', function () {
  const settingsRowSelector = '#settings-panel div.settings-row';
  const settingsButtonSelector = '#settings-btn';
  const settingsHeaderSelector = 'div.settings-header h1';
  const cliqzThemeTxt = 'Cliqz Theme';
  const bgLabelTxt = 'freshtab.app.settings.background.label';
  const mostVisitedLabelTxt = 'freshtab.app.settings.most-visited.label';
  const favoritesLabelTxt = 'freshtab.app.settings.favorites.label';
  const searchOptionsTxt = 'freshtab.app.settings.search.label';
  const newsOptionsTxt = 'freshtab.app.settings.news.label';
  const newsSourceSelector = 'div.radio';
  let subject;
  let allSettingsRows;

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
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });
  });

  after(function () {
    clearIntervals();
  });

  context('when blue theme is not enabled', function () {
    context('and when blue background is not enabled', function () {
      let noBlueConfig;

      before(function () {
        noBlueConfig = clone(defaultConfig);
        noBlueConfig.response.isBlueThemeSupported = false;
        noBlueConfig.response.componentsState.background.image = 'bg-default';
        subject.respondsWith(noBlueConfig);

        return subject.load().then(() => {
          subject.query(settingsButtonSelector).click();
        });
      });

      after(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 5 areas', function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows.length).to.equal(5);
      });

      it('does not render "Cliqz theme" options', function () {
        const cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt);
        chai.expect(cliqzThemeSwitch).to.not.exist;
      });

      describe('renders background options', function () {
        it('successfully', function () {
          const backgroundOptions = subject.queryByI18n(bgLabelTxt);
          chai.expect(backgroundOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabel = subject.queryByI18n(bgLabelTxt).querySelector('span.label');
          chai.expect(backgroundLabel).to.exist;
          chai.expect(backgroundLabel).to.have.text(bgLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const backgroundSwitch = subject.queryByI18n(bgLabelTxt).querySelector('input.switch');
          chai.expect(backgroundSwitch).to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited options', function () {
        let mostVisitedOptions;

        before(function () {
          mostVisitedOptions = subject.queryByI18n(mostVisitedLabelTxt);
        });

        it('successfully', function () {
          chai.expect(mostVisitedOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabel = subject.queryByI18n(mostVisitedLabelTxt).querySelector('span.label');
          chai.expect(mostVisitedLabel).to.exist;
          chai.expect(mostVisitedLabel).to.have.text(mostVisitedLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt).querySelector('input.switch');
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          chai.expect(mostVisitedOptions.querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites options', function () {
        it('successfully', function () {
          const favoritesOptions = subject.queryByI18n(favoritesLabelTxt);
          chai.expect(favoritesOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabel = subject.queryByI18n(favoritesLabelTxt).querySelector('span.label');
          chai.expect(favoritesLabel).to.exist;
          chai.expect(favoritesLabel).to.have.text(favoritesLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const favoritesSwitch = subject.queryByI18n(favoritesLabelTxt).querySelector('input.switch');
          chai.expect(favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search options', function () {
        it('successfully', function () {
          const searchOptions = subject.queryByI18n(searchOptionsTxt);
          chai.expect(searchOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabel = subject.queryByI18n(searchOptionsTxt).querySelector('span.label');
          chai.expect(searchLabel).to.exist;
          chai.expect(searchLabel).to.have.text(searchOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const searchSwitch = subject.queryByI18n(searchOptionsTxt).querySelector('input.switch');
          chai.expect(searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news options', function () {
        it('successfully', function () {
          const newsOptions = subject.queryByI18n(newsOptionsTxt);
          chai.expect(newsOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabel = subject.queryByI18n(newsOptionsTxt).querySelector('span.label');
          chai.expect(newsLabel).to.exist;
          chai.expect(newsLabel).to.have.text(newsOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const newsSwitch = subject.queryByI18n(newsOptionsTxt).querySelector('input.switch');
          chai.expect(newsSwitch).to.have.property('checked', false);
        });

        it('without source options', function () {
          const newsSourceItems = subject.queryByI18n(newsOptionsTxt)
            .querySelectorAll(newsSourceSelector);
          chai.expect(newsSourceItems.length).to.equal(0);
        });
      });
    });

    context('and when blue background is enabled', function () {
      before(function () {
        const blueBgConfig = clone(defaultConfig);
        blueBgConfig.response.isBlueThemeSupported = false;
        blueBgConfig.response.isBlueBackgroundSupported = true;
        blueBgConfig.response.componentsState.background.image = 'bg-blue'
        subject.respondsWith(blueBgConfig);
        return subject.load().then(() => {
          subject.query(settingsButtonSelector).click();
        });
      });

      after(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 5 areas', function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows.length - 1).to.equal(5);
      });

      it('does not render "Cliqz theme" options', function () {
        const cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt);
        chai.expect(cliqzThemeSwitch).to.not.exist;
      });

      describe('renders background options', function () {

        it('successfully', function () {
          const backgroundOptions = subject.queryByI18n(bgLabelTxt);
          chai.expect(backgroundOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabel = subject.queryByI18n(bgLabelTxt).querySelector('span.label');
          chai.expect(backgroundLabel).to.exist;
          chai.expect(backgroundLabel).to.have.text(bgLabelTxt);
        });

        it('with an existing switch turned on', function () {
          const backgroundSwitch = subject.queryByI18n(bgLabelTxt).querySelector('input.switch');
          chai.expect(backgroundSwitch).to.have.property('checked', true);
        });

        it('with background choices shown', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(3);
        });
      });

      describe('renders most visited options', function () {
        let mostVisitedOptions;

        before(function () {
          mostVisitedOptions = subject.queryByI18n(mostVisitedLabelTxt);
        });

        it('successfully', function () {
          chai.expect(mostVisitedOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabel = subject.queryByI18n(mostVisitedLabelTxt).querySelector('span.label');
          chai.expect(mostVisitedLabel).to.exist;
          chai.expect(mostVisitedLabel).to.have.text(mostVisitedLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt).querySelector('input.switch');
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          chai.expect(mostVisitedOptions.querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites options', function () {
        it('successfully', function () {
          const favoritesOptions = subject.queryByI18n(favoritesLabelTxt);
          chai.expect(favoritesOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabel = subject.queryByI18n(favoritesLabelTxt).querySelector('span.label');
          chai.expect(favoritesLabel).to.exist;
          chai.expect(favoritesLabel).to.have.text(favoritesLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const favoritesSwitch = subject.queryByI18n(favoritesLabelTxt).querySelector('input.switch');
          chai.expect(favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search options', function () {
        it('successfully', function () {
          const searchOptions = subject.queryByI18n(searchOptionsTxt);
          chai.expect(searchOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabel = subject.queryByI18n(searchOptionsTxt).querySelector('span.label');
          chai.expect(searchLabel).to.exist;
          chai.expect(searchLabel).to.have.text(searchOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const searchSwitch = subject.queryByI18n(searchOptionsTxt).querySelector('input.switch');
          chai.expect(searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news options', function () {
        it('successfully', function () {
          const newsOptions = subject.queryByI18n(newsOptionsTxt);
          chai.expect(newsOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabel = subject.queryByI18n(newsOptionsTxt).querySelector('span.label');
          chai.expect(newsLabel).to.exist;
          chai.expect(newsLabel).to.have.text(newsOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const newsSwitch = subject.queryByI18n(newsOptionsTxt).querySelector('input.switch');
          chai.expect(newsSwitch).to.have.property('checked', false);
        });

        it('without source options', function () {
          const newsSourceItems = subject.queryByI18n(newsOptionsTxt)
            .querySelectorAll(newsSourceSelector);
          chai.expect(newsSourceItems.length).to.equal(0);
        });
      });
    });
  });

  context('when blue theme is enabled', function () {
    context('and when blue background is not enabled', function () {
      before(function () {
        const blueThemeConfig = clone(defaultConfig);
        blueThemeConfig.response.isBlueThemeSupported = true;
        blueThemeConfig.response.blueTheme = true;
        blueThemeConfig.response.componentsState.background.image = 'bg-default';
        subject.respondsWith(blueThemeConfig);
        return subject.load().then(() => {
          subject.query(settingsButtonSelector).click();
        });
      });

      after(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 6 areas', function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows.length).to.equal(6);
      });

      describe('renders Cliqz theme area', function () {

        it('successfully', function () {
          const cliqzThemeOptions = subject.queryByI18n(cliqzThemeTxt);
          chai.expect(cliqzThemeOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const cliqzThemeLabel = subject.queryByI18n(cliqzThemeTxt).querySelector('span.label');
          chai.expect(cliqzThemeLabel).to.exist;
          chai.expect(cliqzThemeLabel).to.have.text(cliqzThemeTxt);
        });

        it('with an existing switch turned on', function () {
          const cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
          chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        });
      });

      describe('renders background options', function () {
        it('successfully', function () {
          const backgroundOptions = subject.queryByI18n(bgLabelTxt);
          chai.expect(backgroundOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabel = subject.queryByI18n(bgLabelTxt).querySelector('span.label');
          chai.expect(backgroundLabel).to.exist;
          chai.expect(backgroundLabel).to.have.text(bgLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const backgroundSwitch = subject.queryByI18n(bgLabelTxt).querySelector('input.switch');
          chai.expect(backgroundSwitch).to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited options', function () {
        let mostVisitedOptions;

        before(function () {
          mostVisitedOptions = subject.queryByI18n(mostVisitedLabelTxt);
        });

        it('successfully', function () {
          chai.expect(mostVisitedOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabel = subject.queryByI18n(mostVisitedLabelTxt).querySelector('span.label');
          chai.expect(mostVisitedLabel).to.exist;
          chai.expect(mostVisitedLabel).to.have.text(mostVisitedLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt).querySelector('input.switch');
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          chai.expect(mostVisitedOptions.querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites options', function () {


        it('successfully', function () {
          const favoritesOptions = subject.queryByI18n(favoritesLabelTxt);
          chai.expect(favoritesOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabel = subject.queryByI18n(favoritesLabelTxt).querySelector('span.label');
          chai.expect(favoritesLabel).to.exist;
          chai.expect(favoritesLabel).to.have.text(favoritesLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const favoritesSwitch = subject.queryByI18n(favoritesLabelTxt).querySelector('input.switch');
          chai.expect(favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search options', function () {
        it('successfully', function () {
          const searchOptions = subject.queryByI18n(searchOptionsTxt);
          chai.expect(searchOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabel = subject.queryByI18n(searchOptionsTxt).querySelector('span.label');
          chai.expect(searchLabel).to.exist;
          chai.expect(searchLabel).to.have.text(searchOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const searchSwitch = subject.queryByI18n(searchOptionsTxt).querySelector('input.switch');
          chai.expect(searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news options', function () {
        it('successfully', function () {
          const newsOptions = subject.queryByI18n(newsOptionsTxt);
          chai.expect(newsOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabel = subject.queryByI18n(newsOptionsTxt).querySelector('span.label');
          chai.expect(newsLabel).to.exist;
          chai.expect(newsLabel).to.have.text(newsOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const newsSwitch = subject.queryByI18n(newsOptionsTxt).querySelector('input.switch');
          chai.expect(newsSwitch).to.have.property('checked', false);
        });

        it('without source options', function () {
          const newsSourceItems = subject.queryByI18n(newsOptionsTxt)
            .querySelectorAll(newsSourceSelector);
          chai.expect(newsSourceItems.length).to.equal(0);
        });
      });
    });

    context('and when blue background is enabled', function () {
      before(function () {
        const blueBgThemeConfig = clone(defaultConfig);
        blueBgThemeConfig.response.isBlueBackgroundSupported = true;
        blueBgThemeConfig.response.isBlueThemeSupported = true;
        blueBgThemeConfig.response.blueTheme = true;
        blueBgThemeConfig.response.componentsState.background.image = 'bg-blue';
        subject.respondsWith(blueBgThemeConfig);
        return subject.load().then(() => {
          subject.query(settingsButtonSelector).click();
        });
      });

      after(function () {
        subject.unload();
      });

      it('has an existing and correct header text', function () {
        const settingsHeaderItem = subject.query(settingsHeaderSelector);
        chai.expect(settingsHeaderItem).to.exist;
        chai.expect(settingsHeaderItem).to.have.text('freshtab.app.settings.header');
      });

      it('has 7 areas', function () {
        allSettingsRows = subject.queryAll(settingsRowSelector);
        chai.expect(allSettingsRows.length).to.equal(7);
      });

      describe('renders Cliqz theme area', function () {

        it('successfully', function () {
          const cliqzThemeOptions = subject.queryByI18n(cliqzThemeTxt);
          chai.expect(cliqzThemeOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const cliqzThemeLabel = subject.queryByI18n(cliqzThemeTxt).querySelector('span.label');
          chai.expect(cliqzThemeLabel).to.exist;
          chai.expect(cliqzThemeLabel).to.have.text(cliqzThemeTxt);
        });

        it('with an existing switch turned on', function () {
          const cliqzThemeSwitch = subject.queryByI18n(cliqzThemeTxt).querySelector('input.switch');
          chai.expect(cliqzThemeSwitch).to.have.property('checked', true);
        });
      });

      describe('renders background options', function () {
        it('successfully', function () {
          const backgroundOptions = subject.queryByI18n(bgLabelTxt);
          chai.expect(backgroundOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const backgroundLabel = subject.queryByI18n(bgLabelTxt).querySelector('span.label');
          chai.expect(backgroundLabel).to.exist;
          chai.expect(backgroundLabel).to.have.text(bgLabelTxt);
        });

        it('with an existing switch turned on', function () {
          const backgroundSwitch = subject.queryByI18n(bgLabelTxt).querySelector('input.switch');
          chai.expect(backgroundSwitch).to.have.property('checked', true);
        });

        it('with background choices not hidden', function () {
          chai.expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(3);
        });
      });

      describe('renders most visited options', function () {
        let mostVisitedOptions;

        before(function () {
          mostVisitedOptions = subject.queryByI18n(mostVisitedLabelTxt);
        });

        it('successfully', function () {
          chai.expect(mostVisitedOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const mostVisitedLabel = subject.queryByI18n(mostVisitedLabelTxt).querySelector('span.label');
          chai.expect(mostVisitedLabel).to.exist;
          chai.expect(mostVisitedLabel).to.have.text(mostVisitedLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const mostVisitedSwitch = subject.queryByI18n(mostVisitedLabelTxt).querySelector('input.switch');
          chai.expect(mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          chai.expect(mostVisitedOptions.querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites options', function () {
        it('successfully', function () {
          const favoritesOptions = subject.queryByI18n(favoritesLabelTxt);
          chai.expect(favoritesOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const favoritesLabel = subject.queryByI18n(favoritesLabelTxt).querySelector('span.label');
          chai.expect(favoritesLabel).to.exist;
          chai.expect(favoritesLabel).to.have.text(favoritesLabelTxt);
        });

        it('with an existing switch turned off', function () {
          const favoritesSwitch = subject.queryByI18n(favoritesLabelTxt).querySelector('input.switch');
          chai.expect(favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search options', function () {
        it('successfully', function () {
          const searchOptions = subject.queryByI18n(searchOptionsTxt);
          chai.expect(searchOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const searchLabel = subject.queryByI18n(searchOptionsTxt).querySelector('span.label');
          chai.expect(searchLabel).to.exist;
          chai.expect(searchLabel).to.have.text(searchOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const searchSwitch = subject.queryByI18n(searchOptionsTxt).querySelector('input.switch');
          chai.expect(searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news options', function () {
        it('successfully', function () {
          const newsOptions = subject.queryByI18n(newsOptionsTxt);
          chai.expect(newsOptions).to.exist;
        });

        it('with an existing and correct label', function () {
          const newsLabel = subject.queryByI18n(newsOptionsTxt).querySelector('span.label');
          chai.expect(newsLabel).to.exist;
          chai.expect(newsLabel).to.have.text(newsOptionsTxt);
        });

        it('with an existing switch turned off', function () {
          const newsSwitch = subject.queryByI18n(newsOptionsTxt).querySelector('input.switch');
          chai.expect(newsSwitch).to.have.property('checked', false);
        });

        it('without source options', function () {
          const newsSourceItems = subject.queryByI18n(newsOptionsTxt)
            .querySelectorAll(newsSourceSelector);
          chai.expect(newsSourceItems.length).to.equal(0);
        });
      });
    });
  });
});
