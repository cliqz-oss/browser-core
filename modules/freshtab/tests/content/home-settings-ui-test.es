import {
  clearIntervals,
  clone,
  expect
} from '../../core/test-helpers';
import {
  defaultConfig,
  Subject
} from '../../core/test-helpers-freshtab';

describe('Fresh tab settings panel UI', function () {
  const settingsRowSelector = '#settings-panel .settings-row';
  const settingsButtonSelector = '#settings-btn';
  const newsSourceSelector = '.radio';
  let subject;
  let $allSettingsRows;
  let $settingsHeader;
  let $cliqzThemeLabel;
  let $cliqzThemeSetting;
  let $cliqzThemeSwitch;
  let $backgroundSetting;
  let $backgroundLabel;
  let $backgroundSwitch;
  let $mostVisitedSetting;
  let $mostVisitedLabel;
  let $mostVisitedSwitch;
  let $favoritesSetting;
  let $favoritesLabel;
  let $favoritesSwitch;
  let $searchSetting;
  let $searchLabel;
  let $searchSwitch;
  let $newsSetting;
  let $newsLabel;
  let $newsSwitch;
  let $newsSources;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
  });

  after(function () {
    clearIntervals();
  });

  context('when blue theme is not enabled', function () {
    context('and when blue background is not enabled', function () {
      let noBlueConfig;

      before(async function () {
        noBlueConfig = clone(defaultConfig);
        noBlueConfig.response.isBlueThemeSupported = false;
        subject.respondsWith(noBlueConfig);

        await subject.load();
        subject.query(settingsButtonSelector).click();
      });

      after(function () {
        subject.unload();
      });

      it('has an existing header', function () {
        $settingsHeader = subject.query('.settings-header h1');
        expect($settingsHeader).to.exist;
        expect($settingsHeader).to.have.text('freshtab.app.settings.header');
      });

      it('has 5 areas', function () {
        $allSettingsRows = subject.queryAll(settingsRowSelector);
        expect($allSettingsRows.length).to.equal(5);
      });

      it('does not render "Cliqz theme" settings', function () {
        $cliqzThemeSetting = subject.getCliqzThemeSettings();
        expect($cliqzThemeSetting).to.not.exist;
      });

      describe('renders background settings', function () {
        it('successfully', function () {
          $backgroundSetting = subject.getBackgroundSettings();
          expect($backgroundSetting).to.exist;
        });

        it('with an existing label', function () {
          $backgroundLabel = subject.getBackgroundSettings().querySelector('.label');
          expect($backgroundLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $backgroundSwitch = subject.getBackgroundSwitch();
          expect($backgroundSwitch).to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited settings', function () {
        it('successfully', function () {
          $mostVisitedSetting = subject.getMostVisitedSettings();
          expect($mostVisitedSetting).to.exist;
        });

        it('with an existing label', function () {
          $mostVisitedLabel = subject.getMostVisitedSettings().querySelector('.label');
          expect($mostVisitedLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $mostVisitedSwitch = subject.getMostVisitedSwitch();
          expect($mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          expect(subject.getMostVisitedSettings().querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites settings', function () {
        it('successfully', function () {
          $favoritesSetting = subject.getMostVisitedSettings();
          expect($favoritesSetting).to.exist;
        });

        it('with an existing label', function () {
          $favoritesLabel = subject.getFavoritesSettings().querySelector('.label');
          expect($favoritesLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $favoritesSwitch = subject.getFavoritesSwitch();
          expect($favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search settings', function () {
        it('successfully', function () {
          $searchSetting = subject.getSearchSettings();
          expect($searchSetting).to.exist;
        });

        it('with an existing label', function () {
          $searchLabel = subject.getSearchSettings().querySelector('.label');
          expect($searchLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $searchSwitch = subject.getSearchSwitch();
          expect($searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news settings', function () {
        it('successfully', function () {
          $newsSetting = subject.getNewsSettings();
          expect($newsSetting).to.exist;
        });

        it('with an existing label', function () {
          $newsLabel = subject.getNewsSettings().querySelector('.label');
          expect($newsLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $newsSwitch = subject.getNewsSwitch();
          expect($newsSwitch).to.have.property('checked', false);
        });

        it('without source settings', function () {
          $newsSources = subject.getNewsSettings().querySelectorAll(newsSourceSelector);
          expect($newsSources.length).to.equal(0);
        });
      });
    });

    context('and when blue background is enabled', function () {
      before(async function () {
        const blueBgConfig = clone(defaultConfig);
        blueBgConfig.response.isBlueThemeSupported = false;
        blueBgConfig.response.isBlueBackgroundSupported = true;
        blueBgConfig.response.componentsState.background.image = 'bg-blue';
        subject.respondsWith(blueBgConfig);
        await subject.load();
        subject.query(settingsButtonSelector).click();
      });

      after(function () {
        subject.unload();
      });

      it('has an existing header', function () {
        $settingsHeader = subject.query('.settings-header h1');
        expect($settingsHeader).to.exist;
        expect($settingsHeader).to.have.text('freshtab.app.settings.header');
      });

      it('has 5 areas', function () {
        $allSettingsRows = subject.queryAll(settingsRowSelector);
        expect($allSettingsRows.length - 1).to.equal(5);
      });

      it('does not render "Cliqz theme" settings', function () {
        $cliqzThemeSetting = subject.getCliqzThemeSettings();
        expect($cliqzThemeSetting).to.not.exist;
      });

      describe('renders background settings', function () {
        it('successfully', function () {
          $backgroundSetting = subject.getBackgroundSettings();
          expect($backgroundSetting).to.exist;
        });

        it('with an existing label', function () {
          $backgroundLabel = subject.getBackgroundSettings().querySelector('.label');
          expect($backgroundLabel).to.exist;
        });

        it('with an existing switch turned on', function () {
          $backgroundSwitch = subject.getBackgroundSwitch();
          expect($backgroundSwitch).to.have.property('checked', true);
        });

        it('with background choices shown', function () {
          expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(5);
        });
      });

      describe('renders most visited settings', function () {
        it('successfully', function () {
          $mostVisitedSetting = subject.getMostVisitedSettings();
          expect($mostVisitedSetting).to.exist;
        });

        it('with an existing label', function () {
          $mostVisitedLabel = subject.getMostVisitedSettings().querySelector('.label');
          expect($mostVisitedLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $mostVisitedSwitch = subject.getMostVisitedSwitch();
          expect($mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          expect(subject.getMostVisitedSettings().querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites settings', function () {
        it('successfully', function () {
          $favoritesSetting = subject.getMostVisitedSettings();
          expect($favoritesSetting).to.exist;
        });

        it('with an existing label', function () {
          $favoritesLabel = subject.getFavoritesSettings().querySelector('.label');
          expect($favoritesLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $favoritesSwitch = subject.getFavoritesSwitch();
          expect($favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search settings', function () {
        it('successfully', function () {
          $searchSetting = subject.getSearchSettings();
          expect($searchSetting).to.exist;
        });

        it('with an existing label', function () {
          $searchLabel = subject.getSearchSettings().querySelector('.label');
          expect($searchLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $searchSwitch = subject.getSearchSwitch();
          expect($searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news settings', function () {
        it('successfully', function () {
          $newsSetting = subject.getNewsSettings();
          expect($newsSetting).to.exist;
        });

        it('with an existing label', function () {
          $newsLabel = subject.getNewsSettings().querySelector('.label');
          expect($newsLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $newsSwitch = subject.getNewsSwitch();
          expect($newsSwitch).to.have.property('checked', false);
        });

        it('without source settings', function () {
          $newsSources = subject.getNewsSettings().querySelectorAll(newsSourceSelector);
          expect($newsSources.length).to.equal(0);
        });
      });
    });
  });

  context('when blue theme is enabled', function () {
    context('and when blue background is not enabled', function () {
      before(async function () {
        const blueThemeConfig = clone(defaultConfig);
        blueThemeConfig.response.isBlueThemeSupported = true;
        blueThemeConfig.response.blueTheme = true;
        subject.respondsWith(blueThemeConfig);
        await subject.load();
        subject.query(settingsButtonSelector).click();
      });

      after(function () {
        subject.unload();
      });

      it('has an existing header', function () {
        $settingsHeader = subject.query('.settings-header h1');
        expect($settingsHeader).to.exist;
        expect($settingsHeader).to.have.text('freshtab.app.settings.header');
      });

      it('has 6 areas', function () {
        $allSettingsRows = subject.queryAll(settingsRowSelector);
        expect($allSettingsRows.length).to.equal(6);
      });

      describe('renders "Cliqz theme" settings', function () {
        it('successfully', function () {
          $cliqzThemeSetting = subject.getCliqzThemeSettings();
          expect($cliqzThemeSetting).to.exist;
        });

        it('with an existing and correct label', function () {
          $cliqzThemeLabel = subject.getCliqzThemeSettings().querySelector('.label');
          expect($cliqzThemeLabel).to.exist;
        });

        it('with an existing switch turned on', function () {
          $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
          expect($cliqzThemeSwitch).to.have.property('checked', true);
        });
      });

      describe('renders background settings', function () {
        it('successfully', function () {
          $backgroundSetting = subject.getBackgroundSettings();
          expect($backgroundSetting).to.exist;
        });

        it('with an existing label', function () {
          $backgroundLabel = subject.getBackgroundSettings().querySelector('.label');
          expect($backgroundLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $backgroundSwitch = subject.getBackgroundSwitch();
          expect($backgroundSwitch).to.have.property('checked', false);
        });

        it('with background choices hidden', function () {
          expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(0);
        });
      });

      describe('renders most visited settings', function () {
        it('successfully', function () {
          $mostVisitedSetting = subject.getMostVisitedSettings();
          expect($mostVisitedSetting).to.exist;
        });

        it('with an existing label', function () {
          $mostVisitedLabel = subject.getMostVisitedSettings().querySelector('.label');
          expect($mostVisitedLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $mostVisitedSwitch = subject.getMostVisitedSwitch();
          expect($mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          expect(subject.getMostVisitedSettings().querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites settings', function () {
        it('successfully', function () {
          $favoritesSetting = subject.getMostVisitedSettings();
          expect($favoritesSetting).to.exist;
        });

        it('with an existing label', function () {
          $favoritesLabel = subject.getFavoritesSettings().querySelector('.label');
          expect($favoritesLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $favoritesSwitch = subject.getFavoritesSwitch();
          expect($favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search settings', function () {
        it('successfully', function () {
          $searchSetting = subject.getSearchSettings();
          expect($searchSetting).to.exist;
        });

        it('with an existing label', function () {
          $searchLabel = subject.getSearchSettings().querySelector('.label');
          expect($searchLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $searchSwitch = subject.getSearchSwitch();
          expect($searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news settings', function () {
        it('successfully', function () {
          $newsSetting = subject.getNewsSettings();
          expect($newsSetting).to.exist;
        });

        it('with an existing label', function () {
          $newsLabel = subject.getNewsSettings().querySelector('.label');
          expect($newsLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $newsSwitch = subject.getNewsSwitch();
          expect($newsSwitch).to.have.property('checked', false);
        });

        it('without source settings', function () {
          $newsSources = subject.getNewsSettings().querySelectorAll(newsSourceSelector);
          expect($newsSources.length).to.equal(0);
        });
      });
    });

    context('and when blue background is enabled', function () {
      before(async function () {
        const blueBgThemeConfig = clone(defaultConfig);
        blueBgThemeConfig.response.isBlueBackgroundSupported = true;
        blueBgThemeConfig.response.isBlueThemeSupported = true;
        blueBgThemeConfig.response.blueTheme = true;
        blueBgThemeConfig.response.componentsState.background.image = 'bg-blue';
        subject.respondsWith(blueBgThemeConfig);
        await subject.load();
        subject.query(settingsButtonSelector).click();
      });

      after(function () {
        subject.unload();
      });

      it('has an existing header', function () {
        $settingsHeader = subject.query('.settings-header h1');
        expect($settingsHeader).to.exist;
        expect($settingsHeader).to.have.text('freshtab.app.settings.header');
      });

      it('has 7 areas', function () {
        $allSettingsRows = subject.queryAll(settingsRowSelector);
        expect($allSettingsRows.length).to.equal(7);
      });

      describe('renders "Cliqz theme" settings', function () {
        it('successfully', function () {
          $cliqzThemeSetting = subject.getCliqzThemeSettings();
          expect($cliqzThemeSetting).to.exist;
        });

        it('with an existing and correct label', function () {
          $cliqzThemeLabel = subject.getCliqzThemeSettings().querySelector('.label');
          expect($cliqzThemeLabel).to.exist;
        });

        it('with an existing switch turned on', function () {
          $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
          expect($cliqzThemeSwitch).to.have.property('checked', true);
        });
      });

      describe('renders background settings', function () {
        it('successfully', function () {
          $backgroundSetting = subject.getBackgroundSettings();
          expect($backgroundSetting).to.exist;
        });

        it('with an existing label', function () {
          $backgroundLabel = subject.getBackgroundSettings().querySelector('.label');
          expect($backgroundLabel).to.exist;
        });

        it('with an existing switch turned on', function () {
          $backgroundSwitch = subject.getBackgroundSwitch();
          expect($backgroundSwitch).to.have.property('checked', true);
        });

        it('with background choices shown', function () {
          expect(subject
            .queryAll('ul.background-selection-list li').length).to.equal(5);
        });
      });

      describe('renders most visited settings', function () {
        it('successfully', function () {
          $mostVisitedSetting = subject.getMostVisitedSettings();
          expect($mostVisitedSetting).to.exist;
        });

        it('with an existing label', function () {
          $mostVisitedLabel = subject.getMostVisitedSettings().querySelector('.label');
          expect($mostVisitedLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $mostVisitedSwitch = subject.getMostVisitedSwitch();
          expect($mostVisitedSwitch).to.have.property('checked', false);
        });

        it('with an existing restore button', function () {
          expect(subject.getMostVisitedSettings().querySelector('button.link')).to.exist;
        });
      });

      describe('renders favorites settings', function () {
        it('successfully', function () {
          $favoritesSetting = subject.getMostVisitedSettings();
          expect($favoritesSetting).to.exist;
        });

        it('with an existing label', function () {
          $favoritesLabel = subject.getFavoritesSettings().querySelector('.label');
          expect($favoritesLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $favoritesSwitch = subject.getFavoritesSwitch();
          expect($favoritesSwitch).to.have.property('checked', false);
        });
      });

      describe('renders search settings', function () {
        it('successfully', function () {
          $searchSetting = subject.getSearchSettings();
          expect($searchSetting).to.exist;
        });

        it('with an existing label', function () {
          $searchLabel = subject.getSearchSettings().querySelector('.label');
          expect($searchLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $searchSwitch = subject.getSearchSwitch();
          expect($searchSwitch).to.have.property('checked', false);
        });
      });

      describe('renders news settings', function () {
        it('successfully', function () {
          $newsSetting = subject.getNewsSettings();
          expect($newsSetting).to.exist;
        });

        it('with an existing label', function () {
          $newsLabel = subject.getNewsSettings().querySelector('.label');
          expect($newsLabel).to.exist;
        });

        it('with an existing switch turned off', function () {
          $newsSwitch = subject.getNewsSwitch();
          expect($newsSwitch).to.have.property('checked', false);
        });

        it('without source settings', function () {
          $newsSources = subject.getNewsSettings().querySelectorAll(newsSourceSelector);
          expect($newsSources.length).to.equal(0);
        });
      });
    });
  });
});
