/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
import ModulesDeveloperModal from './modules-developer-modal';
import Pagination from './pagination';
import AsideLeft from './aside-left';
import AsideRight from './aside-right';

/**
 * Hardcoded components' heights depending on the browser window's width.
 * Copied from: modules/freshtab/sources/styles/_configs.scss
 *
 * Format:
 *   'component name' : [[<browser width treshold>, <component height>]...]
 */
const COMPONENT_SIZES = {
  logo: [[0, 46], [920, 66], [1600, 86]],
  search: [[0, 34 * 2], [920, 48 * 2], [1600, 63 * 2]],
  historyDials: [[0, 110 + 12], [920, 125 + 12], [1600, 140 + 12]],
  customDials: [[0, 110 + 20], [920, 125 + 20], [1600, 140 + 20]],
  stats: [[0, 175 + 18], [650, 185 + 18], [920, 175 + 18], [1024, 195 + 18], [1600, 175 + 18]],
  news: [[0, 175], [650, 185], [920, 175], [1024, 195], [1600, 175]],
};

const getVisibleComponents = ({ componentsState }) =>
  Object.keys(componentsState).filter(key => componentsState[key].visible);

class App extends React.Component {
  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    const visibleComponents = getVisibleComponents(props.config);
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
      logoVisible: this.isLogoVisible(visibleComponents),
      isModalOpen: false,
      isOverlayOpen: false,
      isSettingsOpen: false,
      modules: {},
      removedDials: [],
      results: [],
      stats: {},
      tooltipShown: false,
      visibleComponents,
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
    window.addEventListener('resize', this.handleResize);

    document.body.addEventListener('dragover', event => event.preventDefault());
    document.body.addEventListener('drop', (event) => {
      this.onCustomBackgroundImageUploaded(event.dataTransfer.files[0]);
      event.preventDefault();
    });

    await Promise.all([
      this.getSpeedDials(),
      this.getNews(),
      this.getStats(),
    ]).then(() => {
      this.onFinishedLoading();
    });

    if (this.state.config.tooltip === 'tooltip-settings') {
      setTimeout(() => {
        this.setState({ tooltipShown: true });
        sendTooltipShowSignal();
      }, 5000);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleClick);
    window.removeEventListener('beforeunload', sendHomeUnloadSignal);
    window.removeEventListener('blur', sendHomeBlurSignal);
    window.removeEventListener('focus', sendHomeFocusSignal);
    window.removeEventListener('resize', this.handleResize);
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

  getActualSize(clientWidth, component) {
    let searchHeight = 0;
    COMPONENT_SIZES[component].some(([stopPoint, size]) => {
      if (clientWidth < stopPoint) {
        return true;
      }
      searchHeight = size;
      return false;
    });
    return searchHeight;
  }

  isLogoVisible(components) {
    const { clientHeight, clientWidth, scrollHeight } = window.document.documentElement;
    if (scrollHeight > clientHeight) {
      return false;
    }

    const requiredHeight = components
      .reduce(
        (height, component) => height + this.getActualSize(clientWidth, component),
        this.getActualSize(clientWidth, 'logo')
      );

    return clientHeight >= requiredHeight;
  }

  handleResize = () => {
    this.setState(({ visibleComponents }) => ({
      logoVisible: this.isLogoVisible(visibleComponents),
    }));
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

  resizeCustomBackground(src) {
    const MAX_WIDTH = 2500;
    const MAX_HEIGHT = 1600;
    const image = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return new Promise((resolve, reject) => {
      image.onload = () => {
        let { width, height } = image;
        if (width > MAX_WIDTH) {
          height = Math.floor((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.floor((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.onerror = reject;

      image.src = src;
    });
  }

  async onCustomBackgroundImageUploaded(file) {
    let fileSrc;
    const customWallpapers = [];

    if (!file || file.type.split('/')[0] !== 'image') {
      return;
    }

    try {
      fileSrc = URL.createObjectURL(file);
      const src = await this.resizeCustomBackground(fileSrc);
      await cliqz.freshtab.saveCustomBackgroundImage(src);
      customWallpapers.push({
        alias: 'custom-background',
        isDefault: false,
        name: config.constants.CUSTOM_BG,
        src,
        thumbnailSrc: src,
      });
    } finally {
      URL.revokeObjectURL(fileSrc);
    }

    let index = 0;
    this.setState((prevState) => {
      const wallpapers = prevState.config.wallpapers
        .filter(w => w.name !== config.constants.CUSTOM_BG)
        .concat(customWallpapers);

      index = wallpapers.length - 1;
      const newState = {
        config: {
          ...prevState.config,
          wallpapers,
          componentsState: {
            ...prevState.config.componentsState,
            background: {
              ...prevState.config.componentsState.background,
              image: config.constants.CUSTOM_BG,
              index,
            }
          }
        }
      };
      cliqz.freshtab.saveBackgroundImage(config.constants.CUSTOM_BG, index);
      this.setCustomBackground(config.constants.CUSTOM_BG, newState.config);
      return newState;
    });
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

    if (bgImage === config.constants.CUSTOM_BG) {
      this.setCustomBackground(bgImage, freshtabConfig);
    } else if ((bgImage !== config.constants.NO_BG)
      && (Object.keys(config.backgrounds[product]).indexOf(bgImage) === -1)) {
      // Fall back to default background if current config contains
      // non-existing name of the background
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
    const { history, custom } = await this.freshtab.getSpeedDials();

    this.setState({
      dials: {
        history,
        custom,
        isLoaded: true,
      },
    });
  }

  getNews = async () => {
    // TODO backend should return news only if they are visible
    const data = await this.freshtab.getNews();

    this.setState({
      news: {
        version: data.version,
        data: data.news,
      }
    });
  }

  getStats() {
    return this.freshtab.getStats()
      .then(data => this.setState({ stats: data }));
  }

  setCustomBackground = (bg, freshtabConfig) => {
    const wallpapers = (freshtabConfig || this.state.config).wallpapers;
    if (bg === config.constants.CUSTOM_BG) {
      const customWallpaper = wallpapers
        .find(w => w.name === config.constants.CUSTOM_BG);
      if (!customWallpaper) {
        return false;
      }
      document.body.style.backgroundImage = `url(${customWallpaper.src})`;
      localStorage.setItem('customBgSrc', customWallpaper.src);
    } else {
      document.body.style.backgroundImage = '';
      localStorage.removeItem('customBgSrc');
    }
    return true;
  }

  /*
   * theme is also set inside of home.html
   */
  updateTheme(bg) {
    const { CUSTOM_BG } = config.constants;
    const classList = document.body.classList;

    localStorage.setItem('theme', bg);
    if (bg !== CUSTOM_BG) {
      localStorage.removeItem('customBgSrc');
    }

    if (classList.contains(`theme-${bg}`) && bg !== CUSTOM_BG) {
      return;
    }
    this.setCustomBackground(bg);

    document.body.className.split(' ').forEach((className) => {
      if (className.indexOf('theme-') === 0) {
        classList.remove(className);
      }
    });
    classList.add(`theme-${bg}`);
  }

  resetStatistics() {
    this.freshtab.resetStatistics();

    this.setState((prevState) => {
      const { data = [] } = prevState.stats;
      const nextData = data.map(item => Object.assign(item, {
        val: item.val.replace(/\d+/g, '0')
      }));

      return {
        data: nextData
      };
    });
  }

  async restoreHistorySpeedDials() {
    settingsRestoreTopSitesSignal();
    await this.freshtab.resetAllHistory();
    this.setState({
      removedDials: [],
      hasHistorySpeedDialsToRestore: false
    });
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

  toggleSettings = async () => {
    if (!this.state.isSettingsOpen) {
      settingsClickSignal();
    }

    this.setState(prevState => ({
      isSettingsOpen: !prevState.isSettingsOpen
    }));

    this.closeTooltip();

    const has = await this.freshtab.checkForHistorySpeedDialsToRestore();
    this.setState({ hasHistorySpeedDialsToRestore: has });
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

  undoRemoval = () => {
    const dial = this.state.removedDials.pop();
    const { custom, url, displayTitle: title, removedAt: index } = dial;

    deleteUndoSignal({ custom });

    if (custom) {
      cliqz.freshtab.addSpeedDial({ url, title }, index);
    } else {
      cliqz.freshtab.revertHistorySpeedDial(url);
    }
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

    this.handleResize();
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

  isHumanWebActive = async (consent) => {
    // Use this function to get humanweb status
    // as well as update consent.
    if (consent) {
      return cliqz.freshtab.setHumanWeb(consent);
    }
    return cliqz.freshtab.isHumanWebEnabled();
  }

  get classes() {
    return `
      product-${this.state.config.product.toLowerCase()}
      ${this.state.logoVisible ? '' : 'no-logo'}
    `;
  }

  render() {
    const {
      config: freshtabConfig,
      dials,
      modules,
      news,
      stats,
      visibleComponents,
    } = this.state;
    const { isLoaded: isDialLoaded } = dials;
    const { data: newsData } = news;

    return (
      <>
        <div
          id="app"
          className={this.classes}
        >
          <AppContext.Provider value={this.state}>
            <UndoDialRemoval
              closeUndo={this.closeUndo}
              dial={this.recentlyRemovedDial}
              isSettingsOpen={this.state.isSettingsOpen}
              undoRemoval={this.undoRemoval}
              visible={this.state.removedDials.length > 0}
            />

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
                <section id="section-top-space" className="content-section" />

                <section id="section-top" className="content-section">
                  {this.shouldShowTopUrlBar && (
                    <section id="section-url-bar">
                      <UrlbarWithResults
                        hideOverlay={this.hideOverlay}
                        product={freshtabConfig.product}
                        ref={(c) => { this.urlbarElem = c; }}
                        results={this.state.results}
                        isHumanWebActive={this.isHumanWebActive}
                        isAutofocusEnabled={freshtabConfig.isAutofocusEnabled}
                        isAMO={freshtabConfig.isAMO}
                        showOverlay={this.showOverlay}
                        toggleComponent={this.toggleComponent}
                        visible={visibleComponents.includes('search')}
                      />
                    </section>
                  )}
                  {this.shouldShowMiddleUrlBar && (
                    <div id="section-url-bar">
                      <Urlbar
                        product={freshtabConfig.product}
                        ref={(c) => { this.urlbarElem = c; }}
                        visible={visibleComponents.includes('search')}
                      />
                    </div>
                  )}
                  {visibleComponents.includes('historyDials') && (
                    <section id="section-most-visited" className="content-section">
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
                            currentPage={this.state.dials.page}
                            dials={this.state.dials.history}
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
                  {visibleComponents.includes('customDials') && (
                    <section id="section-favorites" className="content-section">
                      {isDialLoaded && (
                        <React.Fragment>
                          <div className="dial-header with-line">
                            {t('app_speed_dials_row_custom')}
                          </div>

                          <SpeedDialsRow
                            dials={this.state.dials.custom}
                            removeSpeedDial={this.removeSpeedDial}
                            type="custom"
                            updateModalState={isOpen => this.updateModalState(isOpen)}
                          />
                        </React.Fragment>
                      )}
                    </section>
                  )}
                </section>

                <section id="section-middle" className="content-section">
                  {this.shouldShowStats && (
                    <div id="section-stats">
                      {Object.keys(stats).length !== 0 && (
                        <Stats
                          stats={this.state.stats}
                          toggleComponent={this.toggleComponent}
                        />
                      )}
                    </div>
                  )}
                  {visibleComponents.includes('news') && (
                    <section id="section-news" className="content-section">
                      {newsData.length > 0 && (
                        <News
                          isModalOpen={this.state.isModalOpen}
                          news={this.state.news}
                          newsLanguage={freshtabConfig.componentsState.news.preferedCountry}
                        />
                      )}
                    </section>
                  )}
                </section>

                <section id="section-bottom-space" className="content-section" />
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
              onCustomBackgroundImageUploaded={file => this.onCustomBackgroundImageUploaded(file)}
              onDeveloperModulesOpen={this.onDeveloperModulesOpen}
              onNewsSelectionChanged={country => this.onNewsSelectionChanged(country)}
              resetStatistics={() => this.resetStatistics()}
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
      </>
    );
  }
}

export default App;
