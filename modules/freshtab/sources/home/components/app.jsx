/* global window */
/* global document */
import React from 'react';
import { getDefaultWallpaper } from '../../wallpapers';
import config from '../../config';
import cliqz from '../cliqz';
import SpeedDialsRow from './speed-dials-row';
import Urlbar from './urlbar/index';
import UrlbarWithResults from './urlbar/urlbar-with-results';
import News from './news';
import Settings from './settings';
import MessageCenter from './message-center';
import t from '../i18n';
import UndoDialRemoval from './undo-dial-removal';
import HistoryTitle from './history-title';
import { historyClickSignal, settingsClickSignal, homeConfigsStatusSignal,
  sendHomeUnloadSignal, sendHomeBlurSignal, sendHomeFocusSignal } from '../services/telemetry/home';
import localStorage from '../services/storage';
import { deleteUndoSignal, undoCloseSignal } from '../services/telemetry/speed-dial';
import { settingsRestoreTopSitesSignal, settingsComponentsToggleSignal, newsSelectionChangeSignal } from '../services/telemetry/settings';
import ModulesDeveloperModal from './modules-developer-modal';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    cliqz.setStorage({
      setState: this.setState.bind(this)
    });

    this.state = {
      config: {
        componentsState: {
          historyDials: {},
          customDials: {},
          search: {},
          news: {},
          background: {},
          blueTheme: false,
        }
      },
      dials: {
        history: [],
        custom: [],
        isLoaded: false,
      },
      offers: [],
      news: {
        version: '',
        data: [],
      },
      results: [],
      removedDials: [],
      messages: {},
      isSettingsOpen: false,
      isOverlayOpen: false,
      modules: {},
      focusNews: false,
      hasHistorySpeedDialsToRestore: false,
      isOfferMenuOpen: false,
      isOfferInfoOpen: false,
    };

    window.state = this.state;

    this.getSpeedDials = this.getSpeedDials.bind(this);
    this.addSpeedDial = this.addSpeedDial.bind(this);
    this.removeSpeedDial = this.removeSpeedDial.bind(this);
    this.updateSpeedDial = this.updateSpeedDial.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.undoRemoval = this.undoRemoval.bind(this);
    this.closeUndo = this.closeUndo.bind(this);
    this.toggleComponent = this.toggleComponent.bind(this);
    this.toggleBlueTheme = this.toggleBlueTheme.bind(this);
    this.toggleBackground = this.toggleBackground.bind(this);
    this.submitFeedbackForm = this.submitFeedbackForm.bind(this);
  }

  componentDidMount() {
    window.addEventListener('click', this.handleClick);
    cliqz.freshtab.getTabIndex().then((tabIndex) => {
      this.tabIndex = tabIndex;
      window.addEventListener('beforeunload', () => sendHomeUnloadSignal({ tabIndex }));
      window.addEventListener('blur', () => sendHomeBlurSignal({ tabIndex }));
      window.addEventListener('focus', () => sendHomeFocusSignal({ tabIndex }));
    });

    Promise.all([
      this.getNews(),
      this.getConfig(),
      this.getSpeedDials(),
    ]).then(() => {
      this.onFinishedLoading();
    });
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleClick);
    window.removeEventListener('beforeunload', sendHomeUnloadSignal);
    window.removeEventListener('blur', sendHomeBlurSignal);
    window.removeEventListener('focus', sendHomeFocusSignal);
  }

  onHistoryClick() {
    historyClickSignal();
  }

  onDeveloperModulesOpen = async () => {
    try {
      const response = await this.getCliqzStatus();

      this.setState({
        modules: {
          isOpen: true,
          error: null,
          items: response,
        }
      });
    } catch (error) {
      this.setState({
        modules: {
          isOpen: true,
          error: error.message,
          items: [],
        }
      });
    }
  }

  onDeveloperModulesClose = () => {
    this.setState({
      modules: {
        isOpen: false,
        error: null,
        items: [],
      }
    });
  }

  onDeveloperModuleStateChange = async (moduleId, { isEnabled }) => {
    if (isEnabled) {
      await cliqz.core.enableModule(moduleId);
    } else {
      await cliqz.core.disableModule(moduleId);
    }

    this.onDeveloperModulesOpen();
  }

  onMessageClicked(message) {
    const url = message.cta_url;
    let action;
    if (url.startsWith('home-action')) {
      action = url.split(':')[1];
      if (action === 'settings') {
        this.toggleSettings();
      }
      if (action === 'settings&news') {
        this.toggleSettings();
        this.focusNews();
      }
      if (action === 'openImportDialog') {
        this.freshtab.openImportDialog();
      }
    } else {
      window.location = url;
    }
  }

  onBackgroundImageChanged(bg, index) {
    cliqz.freshtab.saveBackgroundImage(bg, index);
    this.updateTheme(bg);

    // TODO: state object is too deep - we should squash it
    this.setState(prevState => ({
      config: {
        ...prevState.config,
        componentsState: {
          ...prevState.config.componentsState,
          background: {
            ...prevState.config.componentsState.background,
            image: bg
          }
        }
      }
    }));
  }

  onNewsSelectionChanged(country) {
    newsSelectionChangeSignal(country);
    cliqz.freshtab.updateTopNewsCountry(country);

    // TODO: state object is too deep - we should squash it
    this.setState(prevState => ({
      focusNews: false,
      config: {
        ...prevState.config,
        componentsState: {
          ...prevState.config.componentsState,
          news: {
            ...prevState.config.componentsState.news,
            preferedCountry: country
          }
        }
      }
    }));

    this.getNews();
  }

  onFinishedLoading() {
    homeConfigsStatusSignal(this.state, this.tabIndex);
  }

  getConfig() {
    return this.freshtab.getConfig().then((freshtabConfig) => {
      const bgImage = freshtabConfig.componentsState.background.image;
      this.updateTheme(bgImage);
      this.setState({ config: freshtabConfig, messages: freshtabConfig.messages });
    });
  }

  async getSpeedDials() {
    // TODO Backend should return only visible dials
    const dials = await this.freshtab.getSpeedDials();
    this.setState({
      dials: {
        ...dials,
        isLoaded: true,
      },
    });
  }

  getNews() {
    // TODO backend should return news only if they are visible
    return this.freshtab.getNews().then((data) => {
      this.setState({
        news: {
          version: data.version,
          data: data.news,
        }
      });
    });
  }

  getCliqzStatus() {
    return cliqz.core.status().then((res) => {
      if (!res || !res.modules) {
        throw new Error('Exception occured while getting Cliqz status', res);
      }

      return Object.keys(res.modules)
        .filter(key => key !== 'core')
        .sort()
        .map(key => ({
          name: res.modules[key].name,
          isEnabled: res.modules[key].isEnabled,
          loadingTime: res.modules[key].loadingTime || 0 }));
    });
  }

  /*
   * theme is also set inside of home.html
   */
  updateTheme(bg) {
    localStorage.setItem('theme', bg);
    const classList = document.body.classList;

    if (classList.contains(`theme-${bg}`)) {
      return;
    }

    document.body.className.split(' ').forEach((className) => {
      if (className.indexOf('theme-') === 0) {
        classList.remove(className);
      }
    });
    classList.add(`theme-${bg}`);
  }


  restoreHistorySpeedDials() {
    settingsRestoreTopSitesSignal();
    return this.freshtab.resetAllHistory()
      .then(dials => this.setState({
        dials: { ...dials, isLoaded: true },
        // keep only custom dials
        removedDials: this.state.removedDials.filter(d => d.custom),
        hasHistorySpeedDialsToRestore: false,
      }));
  }

  get recentlyRemovedDial() {
    const len = this.state.removedDials.length;
    if (len === 0) {
      return {};
    }
    return this.state.removedDials[len - 1];
  }

  toggleSettings() {
    if (!this.state.isSettingsOpen) {
      settingsClickSignal();
    } else {
      this.setState({
        focusNews: false,
      });
    }

    this.setState({
      isSettingsOpen: !this.state.isSettingsOpen,
    });

    this.freshtab.checkForHistorySpeedDialsToRestore()
      .then(has => this.setState({ hasHistorySpeedDialsToRestore: has }));
  }

  focusNews() {
    this.setState({
      focusNews: true,
    });
  }

  getOfferInfoOpen = () => this.state.isOfferInfoOpen;
  setOfferInfoOpen = (state) => {
    this.setState({
      isOfferInfoOpen: state
    });
  }
  getOfferMenuOpen = () => this.state.isOfferMenuOpen;
  setOfferMenuOpen = (state) => {
    this.setState({
      isOfferMenuOpen: state
    });
  }

  handleClick(el) {
    if (this.urlbarElem) {
      this.urlbarElem.textInput.style.visibility = 'visible';
    }
    const settingsPanel = document.querySelector('#settings-panel');
    if (!settingsPanel.contains(el.target) &&
      el.target.id !== 'settings-btn' &&
      el.target.className !== 'cta-btn' &&
      el.target.className !== 'close' &&
      el.target.id !== 'undo-notification-close' &&
      el.target.id !== 'undo-close' &&
      this.state.isSettingsOpen) {
      this.setState({ isSettingsOpen: false });
    }
    const middleboxPanel = document.querySelector('.offer-unit');
    if (middleboxPanel && !middleboxPanel.contains(el.target) &&
        el.target.className !== 'why-info') {
      this.setState({
        isOfferMenuOpen: false,
        isOfferInfoOpen: false,
      });
    }
  }
  removeSpeedDial(dial, index) {
    const isCustom = dial.custom;
    const dialType = isCustom ? 'custom' : 'history';
    const newItems = this.state.dials[dialType].filter(item => item !== dial);

    this.setState({
      dials: {
        ...this.state.dials,
        [dialType]: newItems
      }
    });

    this.freshtab.removeSpeedDial(dial);

    this.setState({
      removedDials: [
        ...this.state.removedDials,
        {
          ...dial,
          removedAt: index,
        },
      ]
    });
  }

  updateDials(dial, index, update = false) {
    const dialType = dial.custom ? 'custom' : 'history';
    const oldDials = this.state.dials[dialType];
    let dials;

    if (index === undefined) {
      dials = [
        ...oldDials,
        dial,
      ];
    } else {
      dials = [
        ...oldDials.slice(0, index),
        dial,
        ...oldDials.slice(update ? index + 1 : index),
      ];
    }

    this.setState({
      dials: {
        ...this.state.dials,
        [dialType]: dials,
      },
    });
  }

  addSpeedDial(dial, index) {
    this.updateDials(dial, index, false);
  }

  updateSpeedDial(newDial, index) {
    this.updateDials(newDial, index, true);
  }

  undoRemoval() {
    const speedDial = this.state.removedDials.pop();

    deleteUndoSignal(speedDial);

    if (speedDial.custom) {
      this._reAddSpeedDial.call(this, speedDial);
    } else {
      cliqz.freshtab.revertHistorySpeedDial(speedDial.url);
      this.addSpeedDial(speedDial, speedDial.removedAt);
    }
  }

  _reAddSpeedDial(dial) {
    const index = dial.removedAt;
    this.addSpeedDial(dial, index);
    const url = dial.url;
    const title = dial.displayTitle;
    cliqz.freshtab.addSpeedDial({ url, title }, index).then(() => {
      const newItems = this.state.removedDials.filter(item => item !== dial);
      this.setState({
        removedDials: newItems,
      });
    });
  }

  closeUndo() {
    undoCloseSignal();
    this.setState({
      removedDials: []
    });
  }

  toggleComponent(component) {
    cliqz.freshtab.toggleComponent(component);
    const freshtabConfig = this.state.config;
    const componentState = freshtabConfig.componentsState[component];
    settingsComponentsToggleSignal(component, componentState.visible);
    this.setState({
      config: {
        ...freshtabConfig,
        componentsState: {
          ...freshtabConfig.componentsState,
          [component]: {
            ...componentState,
            visible: !componentState.visible
          }
        },
      },
    });
  }

  toggleBlueTheme() {
    const oldState = this.state.config.blueTheme;
    settingsComponentsToggleSignal('cliqzTheme', oldState);
    cliqz.freshtab.toggleBlueTheme();
    this.setState({
      config: {
        ...this.state.config,
        blueTheme: !this.state.config.blueTheme
      },
    });
  }

  _hasNoBg() {
    return this.state.config.componentsState.background.image === config.constants.NO_BG;
  }

  toggleBackground() {
    const oldState = this.state.config.componentsState.background.image;
    const isOn = (oldState !== config.constants.NO_BG);
    settingsComponentsToggleSignal('background', isOn);
    let newBg;
    if (this._hasNoBg()) {
      newBg = getDefaultWallpaper();
    } else {
      newBg = config.constants.NO_BG;
    }
    this.onBackgroundImageChanged(newBg);
  }

  submitFeedbackForm(vote, comments) {
    cliqz.freshtab.sendUserFeedback({
      data: {
        target: 'myoffrz',
        vote,
        comments
      }
    });
  }

  get shouldShowMiddleUrlBar() {
    const searchConfig = this.state.config.componentsState.search;
    return searchConfig.visible && (!searchConfig.mode || searchConfig.mode === 'urlbar');
  }

  get shouldShowTopUrlBar() {
    const searchConfig = this.state.config.componentsState.search;
    return searchConfig.visible && searchConfig.mode === 'search';
  }

  get shouldShowDeveloperModulesIcon() {
    return this.state.config.developer === true;
  }

  render() {
    return (
      <div>
        <div
          id="app"
        >
          <UndoDialRemoval
            dial={this.recentlyRemovedDial}
            undoRemoval={this.undoRemoval}
            closeUndo={this.closeUndo}
            isSettingsOpen={this.state.isSettingsOpen}
            visible={this.state.removedDials.length > 0}
          />
          <MessageCenter
            position="top"
            locale={this.state.config.locale}
            messages={this.state.messages}
            handleLinkClick={msg => this.onMessageClicked(msg)}
          />
          <aside className="aside">
            {this.state.config.isHistoryEnabled &&
              <a
                href={config.settings.NEW_TAB_URL}
                id="cliqz-home"
                title={t('cliqz_tab_button')}
                tabIndex="-1"
              >
                Home
              </a>
            }
            {this.state.config.isHistoryEnabled &&
              <a
                href={config.settings.HISTORY_URL}
                id="cliqz-history"
                title={t('history_button')}
                tabIndex="-1"
                onClick={() => this.onHistoryClick()}
              >
                History
              </a>
            }
          </aside>
          <section id="main-content">
            <div className="fixed-container" tabIndex="-1">
              {this.shouldShowTopUrlBar &&
                <section id="section-url-bar">
                  <UrlbarWithResults
                    ref={(c) => { this.urlbarElem = c; }}
                    visible={this.state.config.componentsState.search.visible}
                    results={this.state.results}
                    showOverlay={this.showOverlay}
                    hideOverlay={this.hideOverlay}
                  />
                </section>
              }
              <section id="section-top" />
              { this.state.config.componentsState.historyDials.visible &&
                <section id="section-most-visited">
                  <HistoryTitle dials={this.state.dials} />

                  <SpeedDialsRow
                    dials={this.state.dials.history}
                    type="history"
                    removeSpeedDial={this.removeSpeedDial}
                    addSpeedDial={this.addSpeedDial}
                    getSpeedDials={this.getSpeedDials}
                    showPlaceholder
                  />
                </section>
              }
              { this.state.config.componentsState.customDials.visible &&
                <section id="section-favorites">
                  <div className="dial-header with-line">
                    {t('app_speed_dials_row_custom')}
                  </div>

                  <SpeedDialsRow
                    dials={this.state.dials.custom}
                    type="custom"
                    addSpeedDial={this.addSpeedDial}
                    removeSpeedDial={this.removeSpeedDial}
                    updateSpeedDial={this.updateSpeedDial}
                  />
                </section>
              }

              <section id="section-middle">
                {this.shouldShowMiddleUrlBar &&
                  <div id="section-url-bar">
                    <Urlbar
                      ref={(c) => { this.urlbarElem = c; }}
                      visible={this.state.config.componentsState.search.visible}
                    />
                  </div>
                }

                <MessageCenter
                  position="middle"
                  locale={this.state.config.locale}
                  fullWidth={this.shouldShowTopUrlBar}
                  messages={this.state.messages}
                  handleLinkClick={msg => this.onMessageClicked(msg)}
                  submitFeedbackForm={this.submitFeedbackForm}
                  getOfferInfoOpen={this.getOfferInfoOpen}
                  setOfferInfoOpen={this.setOfferInfoOpen}
                  getOfferMenuOpen={this.getOfferMenuOpen}
                  setOfferMenuOpen={this.setOfferMenuOpen}
                />

              </section>

              { this.state.config.componentsState.news.visible &&
                <section id="section-news">
                  <News
                    news={this.state.news}
                    newsLanguage={this.state.config.componentsState.news.preferedCountry}
                  />
                </section>
              }
              <section id="section-bottom" />
            </div>
            {this.shouldShowDeveloperModulesIcon &&
              <ModulesDeveloperModal
                modules={this.state.modules.items}
                isOpen={this.state.modules.isOpen}
                error={this.state.modules.error}
                closeAction={this.onDeveloperModulesClose}
                moduleStateChangeAction={this.onDeveloperModuleStateChange}
              />
            }
          </section>

          <aside className="aside">
            <Settings
              wallpapers={this.state.config.wallpapers}
              onBackgroundImageChanged={(bg, index) => this.onBackgroundImageChanged(bg, index)}
              onNewsSelectionChanged={country => this.onNewsSelectionChanged(country)}
              toggleComponent={this.toggleComponent}
              toggleBlueTheme={this.toggleBlueTheme}
              blueTheme={this.state.config.blueTheme}
              isBlueThemeSupported={this.state.config.isBlueThemeSupported}
              toggleBackground={this.toggleBackground}
              isOpen={this.state.isSettingsOpen}
              focusNews={this.state.focusNews}
              componentsState={this.state.config.componentsState}
              hasHistorySpeedDialsToRestore={this.state.hasHistorySpeedDialsToRestore}
              toggle={() => this.toggleSettings()}
              restoreHistorySpeedDials={() => this.restoreHistorySpeedDials()}
            />
            {this.state.isSettingsOpen ||
              <button
                id="settings-btn"
                title={t('cliqz_tab_settings_button')}
                tabIndex="-1"
                onClick={() => this.toggleSettings()}
              >
                Settings
              </button>
            }
            {this.shouldShowDeveloperModulesIcon &&
              <button
                id="cliqz-modules-btn"
                title={t('cliqz_modules_button')}
                tabIndex="-1"
                onClick={this.onDeveloperModulesOpen}
              >
                {t('cliqz_modules_button')}
              </button>
            }
          </aside>
        </div>
      </div>
    );
  }
}

export default App;
