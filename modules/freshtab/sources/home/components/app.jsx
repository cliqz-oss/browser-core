/* global window */
/* global document */
import React from 'react';
import CONFIG from '../../../core/config';
import cliqz from '../cliqz';
import SpeedDialsRow from './speed-dials-row';
import Urlbar from './urlbar';
import UrlbarWithResults from './urlbar-with-results';
import News from './news';
import Settings from './settings';
import MessageCenter from './message-center';
import OfferMiddleMessages from './middle-messages-offers';
import t from '../i18n';
import UndoDialRemoval from './undo-dial-removal';
import Tooltip from './tooltip';
import { historyClickSignal, settingsClickSignal, homeConfigsStatusSignal, worldcupClickSignal,
  sendHomeUnloadSignal, sendHomeBlurSignal, sendHomeFocusSignal } from '../services/telemetry/home';
import localStorage from '../services/storage';
import { deleteUndoSignal, undoCloseSignal } from '../services/telemetry/speed-dial';
import { settingsRestoreTopSitesSignal, settingsComponentsToggleSignal, newsSelectionChangeSignal } from '../services/telemetry/settings';
import { DEFAULT_BG, FALLBACK_BG, NO_BG } from '../services/background-image';
import { TOOLTIP_WORLDCUP_GROUP, TOOLTIP_WORLDCUP_KNOCKOUT } from '../../constants';
import { messageSkipSignal } from '../services/telemetry/worldcup';


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
          isBrowser: false
        }
      },
      dials: {
        history: [],
        custom: []
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
      focusNews: false,
      hasHistorySpeedDialsToRestore: false,
    };

    window.state = this.state;

    this.getSpeedDials = this.getSpeedDials.bind(this);
    this.addSpeedDial = this.addSpeedDial.bind(this);
    this.removeSpeedDial = this.removeSpeedDial.bind(this);
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
      this.getOffers()
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

  onWorldcupClick() {
    worldcupClickSignal();
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

  onBackgroundImageChanged(bg) {
    cliqz.freshtab.saveBackgroundImage(bg);
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
    return this.freshtab.getConfig().then((config) => {
      const bgImage = config.componentsState.background.image;
      this.updateTheme(bgImage);
      this.setState({ config, messages: config.messages });
    });
  }

  getSpeedDials() {
    // TODO Backend should return only visible dials
    return this.freshtab.getSpeedDials().then(dials => this.setState({ dials }));
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

  getOffers() {
    return this.freshtab.getOffers().then((offers = []) => {
      this.setState({ offers });
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
        dials,
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

  addSpeedDial(dial, index) {
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
        ...oldDials.slice(index),
      ];
    }

    this.setState({
      dials: {
        ...this.state.dials,
        [dialType]: dials,
      },
    });
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
    cliqz.freshtab.addSpeedDial(dial.url, index).then(() => {
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
    const config = this.state.config;
    const componentState = config.componentsState[component];
    settingsComponentsToggleSignal(component, componentState.visible);
    this.setState({
      config: {
        ...config,
        componentsState: {
          ...config.componentsState,
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

  hideTooltip = (id) => {
    this.setState({ config: { ...this.state.config, tooltip: '' } });
    messageSkipSignal(id);
    cliqz.freshtab.markTooltipAsSkipped();
  }

  _hasNoBg() {
    return this.state.config.componentsState.background.image === NO_BG;
  }

  toggleBackground() {
    const oldState = this.state.config.componentsState.background.image;
    const isOn = (oldState !== NO_BG);
    settingsComponentsToggleSignal('background', isOn);
    let newBg;
    if (this._hasNoBg()) {
      newBg = this.state.config.isBlueBackgroundSupported ? DEFAULT_BG : FALLBACK_BG;
    } else {
      newBg = NO_BG;
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

  get shouldShowWorldCupIcon() {
    const currentDate = this.state.config.currentDate;
    const minDate = '20180610';
    const maxDate = '20180717';

    if (currentDate >= minDate && currentDate < maxDate) {
      return true;
    }
    return false;
  }

  render() {
    return (
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
          {(this.state.config.isHistoryEnabled || this.shouldShowWorldCupIcon) &&
            <a href={CONFIG.settings.NEW_TAB_URL} id="cliqz-home">
              Home
            </a>
          }
          {this.state.config.isHistoryEnabled &&
            <a
              href={CONFIG.settings.HISTORY_URL}
              id="cliqz-history"
              onClick={() => this.onHistoryClick()}
            >
                History
            </a>
          }
          {this.shouldShowWorldCupIcon &&
            <a
              href={`${CONFIG.settings.WORLDCUP_URL}?lang=${this.state.config.locale}`}
              id="cliqz-worldcup"
              tabIndex="-1"
              onClick={() => this.onWorldcupClick()}
            >
              World Cup
              { this.state.config.tooltip === TOOLTIP_WORLDCUP_GROUP &&

              <Tooltip
                id="group"
                title={t('app_group_tooltip_hdr')}
                description={t('app_group_tooltip_txt')}
                mainBtn={{
                  id: 'explore',
                  text: t('app_worldcup_tooltip_btn1'),
                  url: `${CONFIG.settings.WORLDCUP_URL}?lang=${this.state.config.locale}`,
                }}
                secondaryBtn={{
                  id: 'later',
                  text: t('app_worldcup_tooltip_btn2'),
                  onClick: () => this.hideTooltip('group.later'),
                }}
              />
              }
              { this.state.config.tooltip === TOOLTIP_WORLDCUP_KNOCKOUT &&

              <Tooltip
                id="knockout"
                title={t('app_knockout_tooltip_hdr')}
                description={t('app_knockout_tooltip_txt')}
                mainBtn={{
                  id: 'explore',
                  text: t('app_worldcup_tooltip_btn1'),
                  url: `${CONFIG.settings.WORLDCUP_URL}?lang=${this.state.config.locale}`,
                }}
                secondaryBtn={{
                  id: 'later',
                  text: t('app_worldcup_tooltip_btn2'),
                  onClick: () => this.hideTooltip('knockout.later'),
                }}
              />
              }
            </a>
          }
        </aside>
        <section id="main-content">
          <div className="fixed-container">
            {this.shouldShowTopUrlBar &&
              <section id="section-url-bar">
                <UrlbarWithResults
                  ref={(c) => { this.urlbarElem = c; }}
                  visible={this.state.config.componentsState.search.visible}
                  results={this.state.results}
                />
              </section>
            }
            <section id="section-top" />
            { this.state.config.componentsState.historyDials.visible &&
              <section id="section-most-visited">
                <div className="dial-header">
                  {this.state.dials.history.length > 0 && t('app_speed_dials_row_history')}
                </div>
                <SpeedDialsRow
                  dials={this.state.dials.history}
                  type="history"
                  removeSpeedDial={this.removeSpeedDial}
                  addSpeedDial={this.addSpeedDial}
                  getSpeedDials={this.getSpeedDials}
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

              {(this.state.offers.length === 0) &&
                <MessageCenter
                  position="middle"
                  locale={this.state.config.locale}
                  messages={this.state.messages}
                  handleLinkClick={msg => this.onMessageClicked(msg)}
                />
              }

              {(this.state.offers.length > 0) &&
                <OfferMiddleMessages
                  offers={this.state.offers}
                  submitFeedbackForm={this.submitFeedbackForm}
                />
              }

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
        </section>
        <aside className="aside">
          <Settings
            onBackgroundImageChanged={bg => this.onBackgroundImageChanged(bg)}
            onNewsSelectionChanged={country => this.onNewsSelectionChanged(country)}
            toggleComponent={this.toggleComponent}
            toggleBlueTheme={this.toggleBlueTheme}
            blueTheme={this.state.config.blueTheme}
            isBlueThemeSupported={this.state.config.isBlueThemeSupported}
            toggleBackground={this.toggleBackground}
            isBlueBackgroundSupported={this.state.config.isBlueBackgroundSupported}
            isBrowser={this.state.config.isBrowser}
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
              onClick={() => this.toggleSettings()}
            >
              Settings
            </button>
          }
        </aside>
      </div>
    );
  }
}

export default App;
