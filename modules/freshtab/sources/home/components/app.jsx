/* global window */
/* global document */
/* global localStorage */
import React from 'react';
import CONFIG from '../../../core/config';
import cliqz from '../cliqz';
import SpeedDialsRow from './speed-dials-row';
import Urlbar from './urlbar';
import News from './news';
import Settings from './settings';
import MessageCenter from './message-center';
import OfferMiddleMessages from './middle-messages-offers';
import t from '../i18n';
import UndoDialRemoval from './undo-dial-removal';
import { historyClickSignal, settingsClickSignal, homeConfigsStatusSignal } from '../services/telemetry/home';
import { deleteUndoSignal, undoCloseSignal } from '../services/telemetry/speed-dial';
import { settingsRestoreTopSitesSignal, settingsComponentsToggleSignal, newsSelectionChangeSignal } from '../services/telemetry/settings';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    this.offersV2 = cliqz.offersV2;
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
      removedDials: [],
      messages: {},
      isSettingsOpen: false,
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
  }

  componentDidMount() {
    window.addEventListener('click', this.handleClick);

    Promise.all([
      this.getNews(),
      this.getConfig(),
      this.getSpeedDials(),
    ]).then(() => {
      this.getOffers();
      this.onFinishedLoading();
    });
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleClick);
  }

  onHistoryClick() {
    historyClickSignal();
  }

  onMessageClicked(message) {
    const url = message.cta_url;
    let action;
    if (url.startsWith('home-action')) {
      action = url.split(':')[1];
      if (action === 'settings') {
        this.toggleSettings();
      }
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
    homeConfigsStatusSignal(this.state);
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
    if (!this.state.config.showOffers) {
      return false;
    }

    const args = {
      filters: {
        by_rs_dest: 'cliqz-tab',
        ensure_has_dest: true
      }
    };

    return this.offersV2.getStoredOffers(args).then(offers => this.setState({ offers }));
  }

  /*
   * theme is also set inside of home.html
   */
  updateTheme(bg) {
    localStorage.theme = bg;
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

  get recentryRemovedDial() {
    return this.state.removedDials[this.state.removedDials.length - 1];
  }

  toggleSettings() {
    if (!this.state.isSettingsOpen) {
      settingsClickSignal();
    }

    this.setState({
      isSettingsOpen: !this.state.isSettingsOpen,
    });

    this.freshtab.checkForHistorySpeedDialsToRestore()
      .then(has => this.setState({ hasHistorySpeedDialsToRestore: has }));
  }

  handleClick(el) {
    if (this.urlbarElem) {
      this.urlbarElem.textInput.style.visibility = 'visible';
    }
    const settingsPanel = document.querySelector('#settings-panel');
    if (!settingsPanel.contains(el.target) &&
      el.target.id !== 'settings-btn' &&
      el.target.className !== 'cta-btn' &&
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
    if (index === undefined) {
      this.state.dials.custom.push(dial);
    } else if (dial.custom) {
      this.state.dials.custom.splice(index, 0, dial);
    } else {
      this.state.dials.history.splice(index, 0, dial);
    }

    this.setState({
      dials: this.state.dials
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

    settingsComponentsToggleSignal(component, this.state);
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

  render() {
    return (
      <div
        id="app"
      >
        {this.state.removedDials.length > 0 &&
          <UndoDialRemoval
            dial={this.recentryRemovedDial}
            undoRemoval={this.undoRemoval}
            closeUndo={this.closeUndo}
          />
        }
        <aside className="aside">
          {this.state.config.isHistoryEnabled &&
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
        </aside>
        <section id="main-content">
          <div className="fixed-container">
            <section id="section-top" />
            { this.state.config.componentsState.historyDials.visible &&
              <section id="section-most-visited">
                <div className="dial-header">
                  {this.state.dials.history.length > 0 && t('app.speed-dials-row.history')}
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
                  {t('app.speed-dials-row.custom')}
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
              <div id="section-url-bar">
                { this.state.config.componentsState.search.visible &&
                  <Urlbar
                    ref={(c) => { this.urlbarElem = c; }}
                    visible={this.state.config.componentsState.search.visible}
                  />
                }
              </div>
              <MessageCenter
                position="middle"
                messages={this.state.messages}
                handleLinkClick={msg => this.onMessageClicked(msg)}
              />

              {(this.state.offers.length > 0) &&
                <OfferMiddleMessages offers={this.state.offers} />
              }

            </section>

            { this.state.config.componentsState.news.visible &&
              <section id="section-news">
                <News news={this.state.news} />
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
            isOpen={this.state.isSettingsOpen}
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
