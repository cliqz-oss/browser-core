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
import Tooltip from './tooltip';
import MessageCenter from './message-center';
import AppContext from './app-context';
import t from '../i18n';
import UndoDialRemoval from './undo-dial-removal';
import HistoryTitle from './history-title';
import { historyClickSignal, settingsClickSignal, homeConfigsStatusSignal,
  sendHomeUnloadSignal, sendHomeBlurSignal, sendHomeFocusSignal,
  sendTooltipShowSignal, sendTooltipExploreSignal, sendTooltipLaterSignal, sendTooltipCloseSignal } from '../services/telemetry/home';
import localStorage from '../services/storage';
import { deleteUndoSignal, undoCloseSignal } from '../services/telemetry/speed-dial';
import { settingsRestoreTopSitesSignal, settingsComponentsToggleSignal, newsSelectionChangeSignal } from '../services/telemetry/settings';
import Timer from '../services/loading-performance';
import ModulesDeveloperModal from './modules-developer-modal';
import Pagination from './pagination';
import AsideLeft from './aside-left';
import AsideRight from './aside-right';
import ProfilerComponent from './profiler';

const getVisibleComponents = ({ componentsState }) =>
  Object.keys(componentsState).filter(key => componentsState[key].visible);

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
      news: {
        data: [],
        version: '',
      },
      hasHistorySpeedDialsToRestore: false,
      isModalOpen: false,
      isOverlayOpen: false,
      isSettingsOpen: false,
      messages: props.config.messages,
      modules: {},
      removedDials: [],
      results: [],
      stats: {},
      tooltipShown: false,
      visibleComponents: getVisibleComponents(props.config),
    };
    this.timer = new Timer(cliqz.core.sendTelemetry);

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

    await Promise.all([
      this.getSpeedDials(),
      this.getNews(),
      this.getStats(),
    ]).then(() => {
      this.onFinishedLoading();
    });

    if (Object.keys(this.state.messages).length === 0
      && this.state.config.tooltip === 'tooltip-settings') {
      setTimeout(() => {
        this.setState({ tooltipShown: true });
        sendTooltipShowSignal();
      }, 5000);
    }
  }

  async componentDidUpdate() {
    this.tryToSendTelemetry();
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleClick);
    window.removeEventListener('beforeunload', sendHomeUnloadSignal);
    window.removeEventListener('blur', sendHomeBlurSignal);
    window.removeEventListener('focus', sendHomeFocusSignal);
  }

  tryToSendTelemetry = () => {
    /* Send telemetry only for visible components
     * if all their timers have been updated */
    let areAllTimersUpdated = true;
    let timersToCheck;

    if (this.state.config.isBetaVersion) {
      timersToCheck = this.timer.renderTimers;
    } else {
      timersToCheck = this.timer.dataTimers;
    }

    this.state.visibleComponents.forEach((c) => {
      if (c in timersToCheck && timersToCheck[c] === -1) {
        areAllTimersUpdated = false;
      }
    });

    if (areAllTimersUpdated) {
      this.timer.updateTotalTimer({ name: 'app' });
      this.timer.sendTelemetry();
    }
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

  getSpeedDials = async () => {
    // TODO Backend should return only visible dials
    const { speedDialsTimers, ...dials } = await this.freshtab.getSpeedDials();

    this.timer.updateDataTimer({ name: 'customDials', value: speedDialsTimers.customDials });
    this.timer.updateDataTimer({ name: 'historyDials', value: speedDialsTimers.historyDials });

    this.setState({
      dials: {
        ...dials,
        isLoaded: true,
      },
    });
  }

  getNews = async () => {
    // TODO backend should return news only if they are visible
    const data = await this.freshtab.getNews();
    this.timer.updateDataTimer({ name: 'news' });

    this.setState({
      news: {
        version: data.version,
        data: data.news,
      }
    });
  }

  getStats() {
    return this.freshtab.getStats().then((data) => {
      this.timer.updateDataTimer({ name: 'stats' });

      this.setState({ stats: data });
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

  toggleSettings = () => {
    if (!this.state.isSettingsOpen) {
      settingsClickSignal();
    }

    this.setState(prevState => ({
      isSettingsOpen: !prevState.isSettingsOpen
    }));

    this.closeTooltip();

    this.freshtab.checkForHistorySpeedDialsToRestore()
      .then(has => this.setState({ hasHistorySpeedDialsToRestore: has }));
  }

  handleClick = (el) => {
    if (this.urlbarElem) {
      this.urlbarElem.textInput.style.visibility = 'visible';
    }
    const settingsPanel = document.querySelector('#settings-panel');
    if (settingsPanel && !settingsPanel.contains(el.target)
      && el.target.id !== 'settings-btn'
      && el.target.className !== 'cta-btn'
      && el.target.className !== 'close'
      && el.target.id !== 'undo-notification-close'
      && el.target.id !== 'undo-close'
      && el.target.id !== 'explore'
      && this.state.isSettingsOpen) {
      this.setState({ isSettingsOpen: false });
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
    this.setState((prevState) => {
      const newConfigState = {
        ...prevState.config,
        componentsState: {
          ...prevState.config.componentsState,
          [component]: {
            ...componentState,
            visible: !componentState.visible
          }
        },
      };
      return {
        config: newConfigState,
        visibleComponents: getVisibleComponents(newConfigState),
      };
    });
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
      && this.state.visibleComponents.includes('stats');
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

  skipTooltip = () => {
    sendTooltipLaterSignal();
    this.setState(state => ({
      tooltipShown: false,
      config: {
        ...state.config,
        tooltip: '',
      }
    }));

    cliqz.freshtab.markTooltipAsSkipped();
  }

  closeTooltipWithSignal = () => {
    sendTooltipCloseSignal();
    this.closeTooltip();
  }

  onTooltipExploreClick = () => {
    sendTooltipExploreSignal();
    this.toggleSettings();
  }

  closeTooltip = () => {
    this.setState({ tooltipShown: false });
    cliqz.freshtab.saveMessageDismission({ id: 'tooltip-settings' });
  }

  render() {
    const {
      config: freshtabConfig,
      dials,
      messages,
      modules,
      news,
      stats,
      visibleComponents,
    } = this.state;
    const { isLoaded: isDialLoaded } = dials;
    const { data: newsData } = news;
    const hasMessage = Object.keys(messages).length > 0;

    return (
      <ProfilerComponent
        id="app"
        isEnabled={freshtabConfig.isBetaVersion}
        timer={this.timer}
      >
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

              {hasMessage && (
                <MessageCenter
                  handleLinkClick={msg => this.onMessageClicked(msg)}
                  messages={this.state.messages}
                  position="top"
                />
              )}
              {hasMessage && (
                <MessageCenter
                  messages={this.state.messages}
                  positioning={freshtabConfig.cliqzPostPosition}
                  position="post"
                />
              )}

              {freshtabConfig.tooltip === 'tooltip-settings' && (
                <Tooltip
                  isOpen={this.state.tooltipShown}
                  title={t('tooltip_title')}
                  description={t('tooltip_description')}
                  explore={t('tooltip_try_now_button')}
                  later={t('tooltip_later_button')}
                  handleExploreClick={this.onTooltipExploreClick}
                  handleLaterClick={this.skipTooltip}
                  closeTooltip={this.closeTooltipWithSignal}
                />
              )}
              {freshtabConfig.isHistoryEnabled && (
                <AsideLeft
                  historyUrl={freshtabConfig.HISTORY_URL}
                  isHistoryEnabled={freshtabConfig.isHistoryEnabled}
                  newTabUrl={config.settings.NEW_TAB_URL}
                  onHistoryClick={() => historyClickSignal()}
                />
              )}
              <section id="main-content">
                <div className="fixed-container" tabIndex="-1">
                  <section id="section-top-space" />

                  <section id="section-top">
                    {this.shouldShowTopUrlBar && (
                      <section id="section-url-bar">
                        <UrlbarWithResults
                          hideOverlay={this.hideOverlay}
                          product={freshtabConfig.product}
                          ref={(c) => { this.urlbarElem = c; }}
                          results={this.state.results}
                          shouldShowReminder={false}
                          showOverlay={this.showOverlay}
                          toggleComponent={this.toggleComponent}
                          visible={visibleComponents.includes('search')}
                        />
                      </section>
                    )}
                    {this.shouldShowMiddleUrlBar && (
                      <div id="section-url-bar">
                        <ProfilerComponent
                          id="search"
                          isEnabled={freshtabConfig.isBetaVersion}
                          timer={this.timer}
                        >
                          <Urlbar
                            product={freshtabConfig.product}
                            ref={(c) => { this.urlbarElem = c; }}
                            visible={visibleComponents.includes('search')}
                          />
                        </ProfilerComponent>
                      </div>
                    )}
                    <ProfilerComponent
                      id="historyDials"
                      isEnabled={freshtabConfig.isBetaVersion}
                      timer={this.timer}
                    >
                      {visibleComponents.includes('historyDials') && (
                        <section id="section-most-visited">
                          {isDialLoaded && (
                            <React.Fragment>
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
                            </React.Fragment>
                          )}
                        </section>
                      )}
                    </ProfilerComponent>
                    <ProfilerComponent
                      id="customDials"
                      isEnabled={freshtabConfig.isBetaVersion}
                      timer={this.timer}
                    >
                      {visibleComponents.includes('customDials') && (
                        <section id="section-favorites">
                          {isDialLoaded && (
                            <React.Fragment>
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
                            </React.Fragment>
                          )}
                        </section>
                      )}
                    </ProfilerComponent>
                  </section>

                  <section id="section-middle-space" />

                  <section id="section-middle">
                    {this.shouldShowStats && (
                      <div id="section-stats">
                        {Object.keys(stats).length !== 0 && (
                          <ProfilerComponent
                            id="stats"
                            isEnabled={freshtabConfig.isBetaVersion}
                            timer={this.timer}
                          >
                            <Stats
                              stats={this.state.stats}
                              toggleComponent={this.toggleComponent}
                            />
                          </ProfilerComponent>
                        )}
                      </div>
                    )}
                    {visibleComponents.includes('news') && (
                      <section id="section-news">
                        {newsData.length > 0 && (
                          <ProfilerComponent
                            id="news"
                            isEnabled={freshtabConfig.isBetaVersion}
                            timer={this.timer}
                          >
                            <News
                              isModalOpen={this.state.isModalOpen}
                              news={this.state.news}
                              newsLanguage={freshtabConfig.componentsState.news.preferedCountry}
                            />
                          </ProfilerComponent>
                        )}
                      </section>
                    )}
                  </section>

                  <section id="section-bottom-space" />
                </div>
                {modules.isOpen && (
                  <ModulesDeveloperModal
                    closeAction={this.onDeveloperModulesClose}
                    error={modules.error}
                    isOpen={modules.isOpen}
                  />
                )}
              </section>

              <AsideRight
                onBackgroundImageChanged={(bg, index) => this.onBackgroundImageChanged(bg, index)}
                onDeveloperModulesOpen={this.onDeveloperModulesOpen}
                onNewsSelectionChanged={country => this.onNewsSelectionChanged(country)}
                restoreHistorySpeedDials={() => this.restoreHistorySpeedDials()}
                shouldShowSearchSwitch={!this.shouldShowTopUrlBar}
                config={freshtabConfig}
                isSettingsOpen={this.state.isSettingsOpen}
                hasHistorySpeedDialsToRestore={this.state.hasHistorySpeedDialsToRestore}
                toggleBackground={this.toggleBackground}
                toggleBlueTheme={this.toggleBlueTheme}
                toggleComponent={this.toggleComponent}
                toggleSettings={() => this.toggleSettings()}
              />
            </AppContext.Provider>
          </div>
        </div>
      </ProfilerComponent>
    );
  }
}

export default App;
