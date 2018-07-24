import {
  clearIntervals,
  clone,
  expect,
  waitFor
} from '../../core/test-helpers';
import {
  defaultConfig,
  generateNewsResponse,
  Subject
} from '../../core/test-helpers-freshtab';

describe('Fresh tab interactions with settings switches', function () {
  const settingsButtonSelector = '#settings-btn';
  const settingsPanelSelector = '#settings-panel';
  const backgroundAreaSelector = 'ul.background-selection-list';
  const mostVisitedAreaSelector = '#section-most-visited';
  const favoritesAreaSelector = '#section-favorites';
  const searchAreaSelector = '.search';
  const newsAreaSelector = '#section-news';
  let subject;
  let messages;
  let listener;
  let $cliqzThemeSwitch;
  let $backgroundSwitch;
  let $mostVisitedSwitch;
  let $favoritesSwitch;
  let $searchSwitch;
  let $newsSwitch;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithOneHistory();
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: generateNewsResponse()[6]
    });
  });

  afterEach(function () {
    clearIntervals();
  });

  describe('for all areas being hidden', function () {
    beforeEach(async function () {
      const withBlueBgConfig = clone(defaultConfig);
      withBlueBgConfig.response.isBlueBackgroundSupported = true;
      withBlueBgConfig.response.isBlueThemeSupported = true;
      subject.respondsWith(withBlueBgConfig);
      await subject.load();
      // Keep track of received messages
      messages = new Map();
      listener = function (msg) {
        if (!messages.has(msg.action)) {
          messages.set(msg.action, []);
        }

        messages.get(msg.action).push(msg);
      };
      subject.chrome.runtime.onMessage.addListener(listener);

      $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
      $backgroundSwitch = subject.getBackgroundSwitch();
      $mostVisitedSwitch = subject.getMostVisitedSwitch();
      $favoritesSwitch = subject.getFavoritesSwitch();
      $searchSwitch = subject.getSearchSwitch();
      $newsSwitch = subject.getNewsSwitch();

      subject.query(settingsButtonSelector).click();
      return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('clicking on the Cliqz theme switch', function () {
      beforeEach(function () {
        $cliqzThemeSwitch.click();
      });

      it('flips the theme selection switch to active', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        expect($backgroundSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($favoritesSwitch).to.have.property('checked', false);
        expect($searchSwitch).to.have.property('checked', false);
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('leaves all FT areas hidden', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
        expect(subject.query(newsAreaSelector)).to.not.exist;
        expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleBlueTheme" message', function () {
        expect(messages.has('toggleBlueTheme')).to.equal(true);
        expect(messages.get('toggleBlueTheme').length).to.equal(1);
      });

      it('sends a "settings > cliqz_theme > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'cliqz_theme' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the background selection switch', function () {
      beforeEach(function () {
        $backgroundSwitch.click();
        return waitFor(() => subject.query(backgroundAreaSelector));
      });

      it('flips the background selection switch to active', function () {
        expect($backgroundSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($favoritesSwitch).to.have.property('checked', false);
        expect($searchSwitch).to.have.property('checked', false);
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the settings area with background thumbnails', function () {
        expect(subject.query(backgroundAreaSelector)).to.exist;
      });

      it('changes background to blue', function () {
        expect(subject.query('body').className).to.contain('theme-bg-matterhorn');
      });

      it('leaves all FT areas hidden', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
        expect(subject.query(newsAreaSelector)).to.not.exist;
        expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "saveBackgroundImage" message', function () {
        expect(messages.has('saveBackgroundImage')).to.equal(true);
        expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      it('sends a "settings > background > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'background' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the most visited switch', function () {
      beforeEach(function () {
        $mostVisitedSwitch.click();
        return waitFor(() => subject.query(mostVisitedAreaSelector));
      });

      it('flips the most visited switch to active', function () {
        expect($mostVisitedSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
        expect($backgroundSwitch).to.have.property('checked', false);
        expect($favoritesSwitch).to.have.property('checked', false);
        expect($searchSwitch).to.have.property('checked', false);
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with most visited', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
        expect(subject.query(newsAreaSelector)).to.not.exist;
        expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > topsites > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'topsites' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the favorites switch', function () {
      beforeEach(function () {
        $favoritesSwitch.click();
        return waitFor(() => subject.query(favoritesAreaSelector));
      });

      it('flips the favorites switch to active', function () {
        expect($favoritesSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
        expect($backgroundSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($searchSwitch).to.have.property('checked', false);
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with favorites', function () {
        expect(subject.query(favoritesAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        expect(subject.query(newsAreaSelector)).to.not.exist;
        expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > favorites > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'favorites' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the search switch', function () {
      beforeEach(function () {
        $searchSwitch.click();
        return waitFor(() => subject.query(searchAreaSelector));
      });

      it('flips the search switch to active', function () {
        expect($searchSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
        expect($backgroundSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($favoritesSwitch).to.have.property('checked', false);
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with search', function () {
        expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('leaves other areas hidden', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
        expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > search_bar > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'search_bar' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the news switch', function () {
      beforeEach(function () {
        $newsSwitch.click();
        return waitFor(() => subject.query(newsAreaSelector));
      });

      it('flips the news switch to active', function () {
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
        expect($backgroundSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($favoritesSwitch).to.have.property('checked', false);
        expect($searchSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('shows the FT area with news', function () {
        expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('shows news sources selection', function () {
        expect(subject.getNewsDeLanguage()).to.exist;
        expect(subject.getNewsFrLanguage()).to.exist;
        expect(subject.getNewsIntlLanguage()).to.exist;
        expect(subject.getNewsDeTrEnLanguage()).to.exist;
        expect(subject.getNewsUsLanguage()).to.exist;
        expect(subject.getNewsGbLanguage()).to.exist;
      });

      it('leaves other areas hidden', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
        expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > news > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'news' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on all switches', function () {
      beforeEach(function () {
        $cliqzThemeSwitch.click();
        $backgroundSwitch.click();
        $mostVisitedSwitch.click();
        $favoritesSwitch.click();
        $searchSwitch.click();
        $newsSwitch.click();
        return waitFor(() => subject.query(newsAreaSelector));
      });

      it('shows all areas', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
        expect(subject.query(favoritesAreaSelector)).to.exist;
        expect(subject.query(searchAreaSelector)).to.exist;
        expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('shows the settings area with background thumbnails', function () {
        expect(subject.query(backgroundAreaSelector)).to.exist;
      });

      it('changes background to blue', function () {
        expect(subject.query('body').className).to.contain('theme-bg-matterhorn');
      });

      it('changes state of all switches', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
        expect($backgroundSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($favoritesSwitch).to.have.property('checked', true);
        expect($searchSwitch).to.have.property('checked', true);
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('sends four "toggleComponent" messages', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(4);
      });

      it('sends five "settings > XXX > click" telemetry signals', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            (
              s.args[0].target === 'background' ||
              s.args[0].target === 'topsites' ||
              s.args[0].target === 'favorites' ||
              s.args[0].target === 'search_bar' ||
              s.args[0].target === 'news'
            ) &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'on'
          );
        }).length;

        expect(count).to.equal(5);
      });

      it('sends a "saveBackgroundImage" message', function () {
        expect(messages.has('saveBackgroundImage')).to.equal(true);
        expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      describe('then closing and opening the panel', function () {
        beforeEach(async function () {
          subject.query('#settings-panel button.close').click();
          await waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'));
          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });

        it('keeps all switches state as active', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', true);
          expect($backgroundSwitch).to.have.property('checked', true);
          expect($mostVisitedSwitch).to.have.property('checked', true);
          expect($favoritesSwitch).to.have.property('checked', true);
          expect($searchSwitch).to.have.property('checked', true);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps showing all areas', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.exist;
          expect(subject.query(favoritesAreaSelector)).to.exist;
          expect(subject.query(searchAreaSelector)).to.exist;
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('keeps showing the settings area with background thumbnails', function () {
          expect(subject.query(backgroundAreaSelector)).to.exist;
        });

        it('keeps background as blue', function () {
          expect(subject.query('body').className).to.contain('theme-bg-matterhorn');
        });
      });
    });
  });

  describe('for all areas being visible', function () {
    beforeEach(async function () {
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

      await subject.load();
      // Keep track of received messages
      messages = new Map();
      listener = function (msg) {
        if (!messages.has(msg.action)) {
          messages.set(msg.action, []);
        }

        messages.get(msg.action).push(msg);
      };
      subject.chrome.runtime.onMessage.addListener(listener);

      $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
      $backgroundSwitch = subject.getBackgroundSwitch();
      $mostVisitedSwitch = subject.getMostVisitedSwitch();
      $favoritesSwitch = subject.getFavoritesSwitch();
      $searchSwitch = subject.getSearchSwitch();
      $newsSwitch = subject.getNewsSwitch();

      subject.query(settingsButtonSelector).click();
      return waitFor(() => subject.query(settingsPanelSelector));
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('clicking on the Cliqz theme switch', function () {
      beforeEach(function () {
        $cliqzThemeSwitch.click();
      });

      it('flips the theme selection switch to active', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        expect($backgroundSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($favoritesSwitch).to.have.property('checked', true);
        expect($searchSwitch).to.have.property('checked', true);
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('leaves all FT areas visible', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
        expect(subject.query(favoritesAreaSelector)).to.exist;
        expect(subject.query(newsAreaSelector)).to.exist;
        expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleBlueTheme" message', function () {
        expect(messages.has('toggleBlueTheme')).to.equal(true);
        expect(messages.get('toggleBlueTheme').length).to.equal(1);
      });

      it('sends a "settings > cliqz_theme > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'cliqz_theme' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the background selection switch', function () {
      beforeEach(function () {
        $backgroundSwitch.click();
        return waitFor(() => !subject.query(backgroundAreaSelector));
      });

      it('flips the background selection switch to inactive', function () {
        expect($backgroundSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($favoritesSwitch).to.have.property('checked', true);
        expect($searchSwitch).to.have.property('checked', true);
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the settings area with background thumbnails', function () {
        expect(subject.query(backgroundAreaSelector)).to.not.exist;
      });

      it('changes background to empty', function () {
        expect(subject.query('body').className).to.contain('theme-bg-default');
      });

      it('leaves all FT areas visible', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
        expect(subject.query(favoritesAreaSelector)).to.exist;
        expect(subject.query(newsAreaSelector)).to.exist;
        expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "saveBackgroundImage" message', function () {
        expect(messages.has('saveBackgroundImage')).to.equal(true);
        expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      it('sends a "settings > background > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'background' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the most visited switch', function () {
      beforeEach(function () {
        $mostVisitedSwitch.click();
        return waitFor(() => !subject.query(mostVisitedAreaSelector));
      });

      it('flips the most visited switch to inactive', function () {
        expect($mostVisitedSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
        expect($backgroundSwitch).to.have.property('checked', true);
        expect($favoritesSwitch).to.have.property('checked', true);
        expect($searchSwitch).to.have.property('checked', true);
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with most visited', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        expect(subject.query(favoritesAreaSelector)).to.exist;
        expect(subject.query(newsAreaSelector)).to.exist;
        expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > topsites > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'topsites' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the favorites switch', function () {
      beforeEach(function () {
        $favoritesSwitch.click();
        return waitFor(() => !subject.query(favoritesAreaSelector));
      });

      it('flips the favorites switch to inactive', function () {
        expect($favoritesSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($searchSwitch).to.have.property('checked', true);
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with favorites', function () {
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
        expect(subject.query(newsAreaSelector)).to.exist;
        expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > favorites > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'favorites' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the search switch', function () {
      beforeEach(function () {
        $searchSwitch.click();
        return waitFor(() => !subject.query(searchAreaSelector));
      });

      it('flips the search switch to inactive', function () {
        expect($searchSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($favoritesSwitch).to.have.property('checked', true);
        expect($newsSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with search', function () {
        expect(subject.query(searchAreaSelector)).to.not.exist;
      });

      it('leaves other areas visible', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
        expect(subject.query(favoritesAreaSelector)).to.exist;
        expect(subject.query(newsAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > search_bar > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'search_bar' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the news switch', function () {
      beforeEach(function () {
        $newsSwitch.click();
        return waitFor(() => !subject.query(newsAreaSelector));
      });

      it('flips the news switch to inactive', function () {
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('leaves other switches unchanged', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($mostVisitedSwitch).to.have.property('checked', true);
        expect($favoritesSwitch).to.have.property('checked', true);
        expect($searchSwitch).to.have.property('checked', true);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('hides the FT area with news', function () {
        expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('hides news sources selection', function () {
        expect(subject.getNewsDeLanguage()).to.not.exist;
        expect(subject.getNewsFrLanguage()).to.not.exist;
        expect(subject.getNewsIntlLanguage()).to.not.exist;
        expect(subject.getNewsDeTrEnLanguage()).to.not.exist;
        expect(subject.getNewsUsLanguage()).to.not.exist;
        expect(subject.getNewsGbLanguage()).to.not.exist;
      });

      it('leaves other areas visible', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
        expect(subject.query(favoritesAreaSelector)).to.exist;
        expect(subject.query(searchAreaSelector)).to.exist;
      });

      it('sends a "toggleComponent" message', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(1);
      });

      it('sends a "settings > news > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            s.args[0].target === 'news' &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on all switches', function () {
      beforeEach(function () {
        $cliqzThemeSwitch.click();
        $backgroundSwitch.click();
        $mostVisitedSwitch.click();
        $favoritesSwitch.click();
        $searchSwitch.click();
        $newsSwitch.click();
        return waitFor(() => !subject.query(newsAreaSelector));
      });

      it('hides all FT areas', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
        expect(subject.query(searchAreaSelector)).to.not.exist;
        expect(subject.query(newsAreaSelector)).to.not.exist;
      });

      it('hides the settings area with background thumbnails', function () {
        expect(subject.query(backgroundAreaSelector)).to.not.exist;
      });

      it('changes background to empty', function () {
        expect(subject.query('body').className).to.contain('theme-bg-default');
      });

      it('changes state of all switches', function () {
        expect($cliqzThemeSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($mostVisitedSwitch).to.have.property('checked', false);
        expect($favoritesSwitch).to.have.property('checked', false);
        expect($searchSwitch).to.have.property('checked', false);
        expect($newsSwitch).to.have.property('checked', false);
      });

      it('keeps the settings panel open', function () {
        expect(subject.query(settingsPanelSelector)).to.exist;
        expect(subject.query(settingsPanelSelector).className).to.contain('visible');
      });

      it('sends four "toggleComponent" messages', function () {
        expect(messages.has('toggleComponent')).to.equal(true);
        expect(messages.get('toggleComponent').length).to.equal(4);
      });

      it('sends five "settings > XXX > click" telemetry signals', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'settings' &&
            (
              s.args[0].target === 'background' ||
              s.args[0].target === 'topsites' ||
              s.args[0].target === 'favorites' ||
              s.args[0].target === 'search_bar' ||
              s.args[0].target === 'news'
            ) &&
            s.args[0].action === 'click' &&
            s.args[0].state === 'off'
          );
        }).length;

        expect(count).to.equal(5);
      });

      it('sends a "saveBackgroundImage" message', function () {
        expect(messages.has('saveBackgroundImage')).to.equal(true);
        expect(messages.get('saveBackgroundImage').length).to.equal(1);
      });

      describe('then closing and opening the panel', function () {
        beforeEach(async function () {
          subject.query('#settings-panel button.close').click();
          await waitFor(() => !subject.query(settingsPanelSelector).classList.contains('visible'));
          subject.query(settingsButtonSelector).click();
          return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
        });

        it('keeps all switches state as inactive', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', false);
        });

        it('keeps hiding the settings area with background thumbnails', function () {
          expect(subject.query(backgroundAreaSelector)).to.not.exist;
        });

        it('keeps background as empty', function () {
          expect(subject.query('body').className).to.contain('theme-bg-default');
        });

        it('keeps hiding all areas', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
          expect(subject.query(newsAreaSelector)).to.not.exist;
        });
      });
    });
  });

  describe('with only news area visible', function () {
    describe('and DE as default source', function () {
      beforeEach(async function () {
        const newsShownConfigDe = clone(defaultConfig);
        newsShownConfigDe.response.isBlueBackgroundSupported = true;
        newsShownConfigDe.response.isBlueThemeSupported = true;
        newsShownConfigDe.response.componentsState.news.visible = true;
        newsShownConfigDe.response.componentsState.news.preferedCountry = 'de';
        subject.respondsWith(newsShownConfigDe);

        await subject.load();
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
        $backgroundSwitch = subject.getBackgroundSwitch();
        $mostVisitedSwitch = subject.getMostVisitedSwitch();
        $favoritesSwitch = subject.getFavoritesSwitch();
        $searchSwitch = subject.getSearchSwitch();
        $newsSwitch = subject.getNewsSwitch();

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the international news source', function () {
        beforeEach(function () {
          subject.getNewsIntlLanguage().click();
          return waitFor(() => subject.getNewsIntlLanguage().checked);
        });

        it('changes news source selection to INTL', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', true);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(true);
          expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          expect(messages.has('getNews')).to.equal(true);
          expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'intl'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          subject.getNewsDeLanguage().click();
          return waitFor(() => subject.getNewsDeLanguage().checked);
        });

        it('keeps news source selection to DE', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', true);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(false);
          expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'intl'
            );
          }).length;

          expect(count).to.equal(0);
        });
      });
    });

    describe('and FR as default source', function () {
      beforeEach(async function () {
        const newsShownConfigFr = clone(defaultConfig);
        newsShownConfigFr.response.isBlueBackgroundSupported = true;
        newsShownConfigFr.response.isBlueThemeSupported = true;
        newsShownConfigFr.response.componentsState.news.visible = true;
        newsShownConfigFr.response.componentsState.news.preferedCountry = 'fr';
        subject.respondsWith(newsShownConfigFr);

        await subject.load();
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
        $backgroundSwitch = subject.getBackgroundSwitch();
        $mostVisitedSwitch = subject.getMostVisitedSwitch();
        $favoritesSwitch = subject.getFavoritesSwitch();
        $searchSwitch = subject.getSearchSwitch();
        $newsSwitch = subject.getNewsSwitch();

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the German news source', function () {
        beforeEach(function () {
          subject.getNewsDeLanguage().click();
          return waitFor(() => subject.getNewsDeLanguage().checked);
        });

        it('changes news source selection to DE', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', true);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(true);
          expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          expect(messages.has('getNews')).to.equal(true);
          expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'de'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          subject.getNewsFrLanguage().click();
          return waitFor(() => subject.getNewsFrLanguage().checked);
        });

        it('keeps news source selection to FR', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', true);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(false);
          expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'de'
            );
          }).length;

          expect(count).to.equal(0);
        });
      });
    });

    describe('and INTL as default source', function () {
      beforeEach(async function () {
        const newsShownConfigIntl = clone(defaultConfig);
        newsShownConfigIntl.response.isBlueBackgroundSupported = true;
        newsShownConfigIntl.response.isBlueThemeSupported = true;
        newsShownConfigIntl.response.componentsState.news.visible = true;
        newsShownConfigIntl.response.componentsState.news.preferedCountry = 'intl';
        subject.respondsWith(newsShownConfigIntl);

        await subject.load();
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
        $backgroundSwitch = subject.getBackgroundSwitch();
        $mostVisitedSwitch = subject.getMostVisitedSwitch();
        $favoritesSwitch = subject.getFavoritesSwitch();
        $searchSwitch = subject.getSearchSwitch();
        $newsSwitch = subject.getNewsSwitch();

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the French news source', function () {
        beforeEach(function () {
          subject.getNewsFrLanguage().click();
          return waitFor(() => subject.getNewsFrLanguage().checked);
        });

        it('changes news source selection to FR', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', true);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(true);
          expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          expect(messages.has('getNews')).to.equal(true);
          expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'fr'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          subject.getNewsIntlLanguage().click();
          return waitFor(() => subject.getNewsIntlLanguage().checked);
        });

        it('keeps news source selection to INTL', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', true);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(false);
          expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'fr'
            );
          }).length;

          expect(count).to.equal(0);
        });
      });
    });

    describe('and US as default source', function () {
      beforeEach(async function () {
        const newsShownConfigUs = clone(defaultConfig);
        newsShownConfigUs.response.isBlueBackgroundSupported = true;
        newsShownConfigUs.response.isBlueThemeSupported = true;
        newsShownConfigUs.response.componentsState.news.visible = true;
        newsShownConfigUs.response.componentsState.news.preferedCountry = 'us';
        subject.respondsWith(newsShownConfigUs);

        await subject.load();
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
        $backgroundSwitch = subject.getBackgroundSwitch();
        $mostVisitedSwitch = subject.getMostVisitedSwitch();
        $favoritesSwitch = subject.getFavoritesSwitch();
        $searchSwitch = subject.getSearchSwitch();
        $newsSwitch = subject.getNewsSwitch();

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the German news source', function () {
        beforeEach(function () {
          subject.getNewsDeLanguage().click();
          return waitFor(() => subject.getNewsDeLanguage().checked);
        });

        it('changes news source selection to DE', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', true);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(true);
          expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          expect(messages.has('getNews')).to.equal(true);
          expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'de'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          subject.getNewsUsLanguage().click();
          return waitFor(() => subject.getNewsUsLanguage().checked);
        });

        it('keeps news source selection to US', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', true);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(false);
          expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'de'
            );
          }).length;

          expect(count).to.equal(0);
        });
      });
    });

    describe('and GB as default source', function () {
      beforeEach(async function () {
        const newsShownConfigGb = clone(defaultConfig);
        newsShownConfigGb.response.isBlueBackgroundSupported = true;
        newsShownConfigGb.response.isBlueThemeSupported = true;
        newsShownConfigGb.response.componentsState.news.visible = true;
        newsShownConfigGb.response.componentsState.news.preferedCountry = 'gb';
        subject.respondsWith(newsShownConfigGb);

        await subject.load();
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
        $backgroundSwitch = subject.getBackgroundSwitch();
        $mostVisitedSwitch = subject.getMostVisitedSwitch();
        $favoritesSwitch = subject.getFavoritesSwitch();
        $searchSwitch = subject.getSearchSwitch();
        $newsSwitch = subject.getNewsSwitch();

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the US news source', function () {
        beforeEach(function () {
          subject.getNewsUsLanguage().click();
          return waitFor(() => subject.getNewsUsLanguage().checked);
        });

        it('changes news source selection to GB', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', true);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(true);
          expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          expect(messages.has('getNews')).to.equal(true);
          expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'us'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          subject.getNewsGbLanguage().click();
          return waitFor(() => subject.getNewsGbLanguage().checked);
        });

        it('keeps news source selection to GB', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', true);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(false);
          expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'us'
            );
          }).length;

          expect(count).to.equal(0);
        });
      });
    });

    describe('and DeTrEn as default source', function () {
      beforeEach(async function () {
        const newsShownConfigDeTrEn = clone(defaultConfig);
        newsShownConfigDeTrEn.response.isBlueBackgroundSupported = true;
        newsShownConfigDeTrEn.response.isBlueThemeSupported = true;
        newsShownConfigDeTrEn.response.componentsState.news.visible = true;
        newsShownConfigDeTrEn.response.componentsState.news.preferedCountry = 'de-tr-en';
        subject.respondsWith(newsShownConfigDeTrEn);

        await subject.load();
        // Keep track of received messages
        messages = new Map();
        listener = function (msg) {
          if (!messages.has(msg.action)) {
            messages.set(msg.action, []);
          }

          messages.get(msg.action).push(msg);
        };
        subject.chrome.runtime.onMessage.addListener(listener);

        $cliqzThemeSwitch = subject.getCliqzThemeSwitch();
        $backgroundSwitch = subject.getBackgroundSwitch();
        $mostVisitedSwitch = subject.getMostVisitedSwitch();
        $favoritesSwitch = subject.getFavoritesSwitch();
        $searchSwitch = subject.getSearchSwitch();
        $newsSwitch = subject.getNewsSwitch();

        subject.query(settingsButtonSelector).click();
        return waitFor(() => subject.query(settingsPanelSelector).classList.contains('visible'));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
        subject.unload();
      });

      describe('clicking on the GB news source', function () {
        beforeEach(function () {
          subject.getNewsGbLanguage().click();
          return waitFor(() => subject.getNewsGbLanguage().checked);
        });

        it('changes news source selection to GB', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', false);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', true);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('sends a "updateTopNewsCountry" and a "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(true);
          expect(messages.get('updateTopNewsCountry').length).to.equal(1);
          expect(messages.has('getNews')).to.equal(true);
          expect(messages.get('getNews').length).to.equal(1);
        });

        it('sends a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'gb'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });

      describe('clicking on the already selected news source', function () {
        beforeEach(function () {
          subject.getNewsDeTrEnLanguage().click();
          return waitFor(() => subject.getNewsDeTrEnLanguage().checked);
        });

        it('keeps news source selection to DeTrEn', function () {
          expect(subject.getNewsDeLanguage()).to.have.property('checked', false);
          expect(subject.getNewsFrLanguage()).to.have.property('checked', false);
          expect(subject.getNewsIntlLanguage()).to.have.property('checked', false);
          expect(subject.getNewsDeTrEnLanguage()).to.have.property('checked', true);
          expect(subject.getNewsUsLanguage()).to.have.property('checked', false);
          expect(subject.getNewsGbLanguage()).to.have.property('checked', false);
        });

        it('leaves other panel switches unchanged', function () {
          expect($cliqzThemeSwitch).to.have.property('checked', false);
          expect($backgroundSwitch).to.have.property('checked', false);
          expect($mostVisitedSwitch).to.have.property('checked', false);
          expect($favoritesSwitch).to.have.property('checked', false);
          expect($searchSwitch).to.have.property('checked', false);
          expect($newsSwitch).to.have.property('checked', true);
        });

        it('keeps the settings panel open', function () {
          expect(subject.query(settingsPanelSelector)).to.exist;
          expect(subject.query(settingsPanelSelector).className).to.contain('visible');
        });

        it('keeps the FT area with news visible', function () {
          expect(subject.query(newsAreaSelector)).to.exist;
        });

        it('leaves other areas hidden', function () {
          expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
          expect(subject.query(favoritesAreaSelector)).to.not.exist;
          expect(subject.query(searchAreaSelector)).to.not.exist;
        });

        it('does not send any "updateTopNewsCountry" and "getNews" messages', function () {
          expect(messages.has('updateTopNewsCountry')).to.equal(false);
          expect(messages.has('getNews')).to.equal(false);
        });

        it('does not send a "settings > news_language > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'settings' &&
              s.args[0].target === 'news_language' &&
              s.args[0].action === 'click' &&
              s.args[0].state === 'gb'
            );
          }).length;

          expect(count).to.equal(0);
        });
      });
    });
  });
});
