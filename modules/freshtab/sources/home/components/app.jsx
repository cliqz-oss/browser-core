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
import Stats from './stats';
import MessageCenter from './message-center';
import AppContext from './app-context';
import t from '../i18n';
import UndoDialRemoval from './undo-dial-removal';
import HistoryTitle from './history-title';
import { historyClickSignal, settingsClickSignal, homeConfigsStatusSignal,
  sendHomeUnloadSignal, sendHomeBlurSignal, sendHomeFocusSignal } from '../services/telemetry/home';
import localStorage from '../services/storage';
import { deleteUndoSignal, undoCloseSignal } from '../services/telemetry/speed-dial';
import { settingsRestoreTopSitesSignal, settingsComponentsToggleSignal, newsSelectionChangeSignal } from '../services/telemetry/settings';
import ModulesDeveloperModal from './modules-developer-modal';
import Pagination from './pagination';
import AsideLeft from './aside-left';
import AsideRight from './aside-right';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    this.state = {
      config: this.getConfigWithBGImage(props.config),
      dials: {
        custom: [],
        history: [],
        isLoaded: false,
      },
      offers: [],
      news: {
        data: [],
        version: '',
      },
      hasHistorySpeedDialsToRestore: false,
      isModalOpen: false,
      isOfferInfoOpen: false,
      isOfferMenuOpen: false,
      isOverlayOpen: false,
      isSettingsOpen: false,
      messages: props.config.messages,
      modules: {},
      removedDials: [],
      results: [],
      stats: {},
    };

    const self = this;
    cliqz.setStorage({
      setState: this.setState.bind(this),
      get state() {
        return self.state;
      }
    });
  }

  async componentDidMount() {
    this.updateTheme(this.state.config.componentsState.background.image);

    /* tabindex is now returned by getconfig, so as to avoid double message passing */
    const tabIndex = this.state.config.tabIndex;
    this.tabIndex = tabIndex;
    window.addEventListener('click', this.handleClick);
    window.addEventListener('beforeunload', () => sendHomeUnloadSignal({ tabIndex }));
    window.addEventListener('blur', () => sendHomeBlurSignal({ tabIndex }));
    window.addEventListener('focus', () => sendHomeFocusSignal({ tabIndex }));

    Promise.all([
      this.getSpeedDials(),
      this.getNews(),
      this.getStats(),
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

  onDeveloperModulesOpen = async () => {
    try {
      this.setState({
        modules: {
          isOpen: true,
          error: null,
        }
      });
    } catch (error) {
      this.setState({
        modules: {
          isOpen: true,
          error: error.message,
        }
      });
    }
  }

  onDeveloperModulesClose = () => {
    this.setState({
      modules: {
        isOpen: false,
        error: null,
      }
    });
  }

  onMessageClicked(message) {
    const url = message.cta_url;
    let action;
    if (url.startsWith('home-action')) {
      action = url.split(':')[1];
      if (action === 'settings') {
        this.toggleSettings();
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

  getConfigWithBGImage(freshtabConfig) {
    let bgImage = freshtabConfig.componentsState.background.image;
    const { product } = freshtabConfig;

    // Fall back to default background if current config contains
    // non-existing name of the background
    if ((bgImage !== config.constants.NO_BG)
      && (Object.keys(config.backgrounds[product]).indexOf(bgImage) === -1)) {
      bgImage = getDefaultWallpaper(product);
    }

    return {
      ...freshtabConfig,
      componentsState: {
        ...freshtabConfig.componentsState,
        background: {
          ...freshtabConfig.componentsState.background,
          image: bgImage
        }
      }
    };
  }

  getConfig() {
    return this.freshtab.getConfig().then((freshtabConfig) => {
      const bgImageConfig = this.getConfigWithBGImage(freshtabConfig);

      this.updateTheme(bgImageConfig.componentsState.background.image);
      this.setState({ config: bgImageConfig, messages: freshtabConfig.messages });
    });
  }

  getSpeedDials = async () => {
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

  getStats() {
    return this.freshtab.getStats().then((data) => {
      this.setState({ stats: data });
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
          loadingTime: res.modules[key].loadingTime || 0
        }));
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
      .then(dials => this.setState(prevState => ({
        dials: { ...dials, isLoaded: true },
        // keep only custom dials
        removedDials: prevState.removedDials.filter(d => d.custom),
        hasHistorySpeedDialsToRestore: false,
      })));
  }

  get recentlyRemovedDial() {
    const len = this.state.removedDials.length;
    if (len === 0) {
      return {};
    }
    return this.state.removedDials[len - 1];
  }

  updateModalState(val) {
    this.setState({ isModalOpen: val });
  }

  toggleSettings() {
    if (!this.state.isSettingsOpen) {
      settingsClickSignal();
    }

    this.setState(prevState => ({
      isSettingsOpen: !prevState.isSettingsOpen,
    }));

    this.freshtab.checkForHistorySpeedDialsToRestore()
      .then(has => this.setState({ hasHistorySpeedDialsToRestore: has }));
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

  handleClick = (el) => {
    if (this.urlbarElem) {
      this.urlbarElem.textInput.style.visibility = 'visible';
    }
    const settingsPanel = document.querySelector('#settings-panel');
    if (!settingsPanel.contains(el.target)
      && el.target.id !== 'settings-btn'
      && el.target.className !== 'cta-btn'
      && el.target.className !== 'close'
      && el.target.id !== 'undo-notification-close'
      && el.target.id !== 'undo-close'
      && this.state.isSettingsOpen) {
      this.setState({ isSettingsOpen: false });
    }
    const middleboxPanel = document.querySelector('.offer-unit');
    if (middleboxPanel && !middleboxPanel.contains(el.target)
        && el.target.className !== 'why-info') {
      this.setState({
        isOfferMenuOpen: false,
        isOfferInfoOpen: false,
      });
    }
  }

  removeSpeedDial = (dial, index) => {
    const isCustom = dial.custom;
    const dialType = isCustom ? 'custom' : 'history';
    const newItems = this.state.dials[dialType].filter(item => item !== dial);

    this.setState(prevState => ({
      dials: {
        ...prevState.dials,
        [dialType]: newItems
      }
    }));

    this.freshtab.removeSpeedDial(dial);

    this.setState(prevState => ({
      removedDials: [
        ...prevState.removedDials,
        {
          ...dial,
          removedAt: index,
        },
      ]
    }));
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

    this.setState(prevState => ({
      dials: {
        ...prevState.dials,
        [dialType]: dials,
      },
    }));
  }

  addSpeedDial = (dial, index) => {
    this.updateDials(dial, index, false);
  }

  updateSpeedDial = (newDial, index) => {
    this.updateDials(newDial, index, true);
  }

  undoRemoval = () => {
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
      this.setState(prevState => ({
        removedDials: prevState.removedDials.filter(item => item !== dial),
      }));
    });
  }

  closeUndo = () => {
    undoCloseSignal();
    this.setState({
      removedDials: []
    });
  }

  toggleComponent = (component) => {
    cliqz.freshtab.toggleComponent(component);

    const componentState = this.state.config.componentsState[component];
    settingsComponentsToggleSignal(component, componentState.visible);
    this.setState(prevState => ({
      config: {
        ...prevState.config,
        componentsState: {
          ...prevState.config.componentsState,
          [component]: {
            ...componentState,
            visible: !componentState.visible
          }
        },
      },
    }));
  }

  toggleBlueTheme = () => {
    const oldState = this.state.config.blueTheme;
    settingsComponentsToggleSignal('cliqzTheme', oldState);
    cliqz.freshtab.toggleBlueTheme();
    this.setState(prevState => ({
      config: {
        ...prevState.config,
        blueTheme: !prevState.config.blueTheme
      },
    }));
  }

  _hasNoBg() {
    return this.state.config.componentsState.background.image === config.constants.NO_BG;
  }

  toggleBackground = () => {
    const oldState = this.state.config.componentsState.background.image;
    const isOn = (oldState !== config.constants.NO_BG);
    settingsComponentsToggleSignal('background', isOn);
    let newBg;
    if (this._hasNoBg()) {
      newBg = getDefaultWallpaper(this.state.config.product);
    } else {
      newBg = config.constants.NO_BG;
    }
    this.onBackgroundImageChanged(newBg);
  }

  submitFeedbackForm = (vote, comments) => {
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
    return searchConfig.mode === 'search';
  }

  get shouldShowStats() {
    return this.state.config.isStatsSupported
      && this.state.config.componentsState.stats.visible;
  }

  onHistoryPageChanged = ({ page, shouldAnimate }) => {
    this.setState(prevState => ({
      dials: {
        ...prevState.dials,
        page,
        shouldAnimate,
      },
    }));
  }

  render() {
    /* Make sure all config has been received till then show blank screen(maybe loader in future) */
    if (!this.state.config.product) {
      return (
        <div>
          <div id="app" />
        </div>
      );
    }
    return (
      <div>
        <div
          id="app"
        >
          <AppContext.Provider value={this.state}>
            <UndoDialRemoval
              closeUndo={this.closeUndo}
              dial={this.recentlyRemovedDial}
              isSettingsOpen={this.state.isSettingsOpen}
              undoRemoval={this.undoRemoval}
              visible={this.state.removedDials.length > 0}
            />
            <MessageCenter
              handleLinkClick={msg => this.onMessageClicked(msg)}
              messages={this.state.messages}
              position="top"
            />
            <MessageCenter
              messages={this.state.messages}
              positioning={this.state.config.cliqzPostPosition}
              position="post"
            />
            <AsideLeft
              historyUrl={this.state.config.HISTORY_URL}
              isHistoryEnabled={this.state.config.isHistoryEnabled}
              newTabUrl={config.settings.NEW_TAB_URL}
              onHistoryClick={() => historyClickSignal()}
            />

            <section id="main-content">
              <div className="fixed-container" tabIndex="-1">
                <section id="section-top-space" />

                <section id="section-top">
                  {this.shouldShowTopUrlBar
                    && (
                      <section id="section-url-bar">
                        <UrlbarWithResults
                          hideOverlay={this.hideOverlay}
                          product={this.state.config.product}
                          ref={(c) => { this.urlbarElem = c; }}
                          results={this.state.results}
                          shouldShowReminder={
                            this.state.config.componentsState.searchReminder.visible
                          }
                          showOverlay={this.showOverlay}
                          toggleComponent={this.toggleComponent}
                          visible={this.state.config.componentsState.search.visible}
                        />
                      </section>
                    )
                  }
                  {this.shouldShowMiddleUrlBar
                    && (
                      <div id="section-url-bar">
                        <Urlbar
                          product={this.state.config.product}
                          ref={(c) => { this.urlbarElem = c; }}
                          visible={this.state.config.componentsState.search.visible}
                        />
                      </div>
                    )
                  }
                  { this.state.config.componentsState.historyDials.visible
                    && (
                      <section id="section-most-visited">
                        <Pagination
                          contentType="history"
                          currentPage={this.state.dials.page}
                          isModalOpen={this.state.isModalOpen}
                          items={this.state.dials.history}
                          onChangePage={this.onHistoryPageChanged}
                        />
                        <HistoryTitle dials={this.state.dials} />

                        <SpeedDialsRow
                          addSpeedDial={this.addSpeedDial}
                          currentPage={this.state.dials.page}
                          dials={this.state.dials.history}
                          getSpeedDials={this.getSpeedDials}
                          removeSpeedDial={this.removeSpeedDial}
                          shouldAnimate={this.state.dials.shouldAnimate}
                          showPlaceholder
                          type="history"
                          updateModalState={isOpen => this.updateModalState(isOpen)}
                        />
                      </section>
                    )
                  }
                  { this.state.config.componentsState.customDials.visible
                    && (
                      <section id="section-favorites">
                        <div className="dial-header with-line">
                          {t('app_speed_dials_row_custom')}
                        </div>

                        <SpeedDialsRow
                          addSpeedDial={this.addSpeedDial}
                          dials={this.state.dials.custom}
                          removeSpeedDial={this.removeSpeedDial}
                          type="custom"
                          updateModalState={isOpen => this.updateModalState(isOpen)}
                          updateSpeedDial={this.updateSpeedDial}
                        />
                      </section>
                    )
                  }
                </section>

                <section id="section-middle-space" />

                <section id="section-middle">
                  { this.shouldShowStats
                    && (
                      <div id="section-stats">
                        <Stats
                          stats={this.state.stats}
                          toggleComponent={this.toggleComponent}
                        />
                      </div>
                    )
                  }
                  { this.state.config.componentsState.news.visible
                    && (
                      <section id="section-news">
                        <News
                          isModalOpen={this.state.isModalOpen}
                          news={this.state.news}
                          newsLanguage={this.state.config.componentsState.news.preferedCountry}
                        />
                      </section>
                    )
                  }
                </section>

                <section id="section-bottom-space" />
              </div>

              <ModulesDeveloperModal
                closeAction={this.onDeveloperModulesClose}
                error={this.state.modules.error}
                isOpen={this.state.modules.isOpen}
              />
            </section>

            <AsideRight
              onBackgroundImageChanged={(bg, index) => this.onBackgroundImageChanged(bg, index)}
              onDeveloperModulesOpen={this.onDeveloperModulesOpen}
              onNewsSelectionChanged={country => this.onNewsSelectionChanged(country)}
              restoreHistorySpeedDials={() => this.restoreHistorySpeedDials()}
              shouldShowDeveloperModulesIcon={this.shouldShowDeveloperModulesIcon}
              shouldShowSearchSwitch={!this.shouldShowTopUrlBar}
              state={this.state}
              toggleBackground={this.toggleBackground}
              toggleBlueTheme={this.toggleBlueTheme}
              toggleComponent={this.toggleComponent}
              toggleSettings={() => this.toggleSettings()}
            />
          </AppContext.Provider>
        </div>
      </div>
    );
  }
}

export default App;
