import React from 'react';
import PropTypes from 'prop-types';
import Switch from './switch';
import BackgroundImage from './background-image';
import t from '../i18n';
import { settingsCloseSignal, settingsBackgroundSelectSignal } from '../services/telemetry/settings';
import { NO_BG } from '../services/background-image';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      componentsState: {
        historyDials: {},
        customDials: {},
        search: {},
        news: {},
        background: {},
      },
    };
    this.onBackgroundImageChanged = this.onBackgroundImageChanged.bind(this);
    this.onNewsSelectionChanged = this.onNewsSelectionChanged.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ componentsState: nextProps.componentsState });
  }

  onBackgroundImageChanged(bg) {
    settingsBackgroundSelectSignal(bg);
    this.props.onBackgroundImageChanged(bg);
  }

  onNewsSelectionChanged(changeEvent) {
    this.props.onNewsSelectionChanged(changeEvent.target.value);
  }

  onCloseButtonClick() {
    settingsCloseSignal();
    this.props.toggle();
  }


  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div>
        <div
          id="settings-panel"
          className={(this.props.isOpen ? 'visible ' : '')}
        >
          <button
            onClick={() => this.onCloseButtonClick()}
            tabIndex="-1"
            className="close"
          >
            Close
          </button>
          <div className="settings-header">
            <h1>{t('app.settings.header')}</h1>
          </div>

          {this.props.isBlueThemeSupported &&
            <div className="settings-row">
              <span className="label">Cliqz Theme</span>
              <Switch
                name="blueTheme"
                isChecked={this.props.blueTheme}
                toggleComponent={() => this.props.toggleBlueTheme()}
              />
            </div>
          }

          <div className="settings-row">
            <span className="label">{t('app.settings.background.label')}</span>
            <Switch
              name="background"
              isChecked={this.state.componentsState.background.image !== NO_BG}
              toggleComponent={() => this.props.toggleBackground()}
            />
          </div>
          {this.state.componentsState.background.image === NO_BG ? '' :
          <div className="settings-row">
            <ul className="background-selection-list">
              {this.props.isBlueBackgroundSupported &&
                <li>
                  <BackgroundImage
                    onBackgroundImageChanged={this.onBackgroundImageChanged}
                    bg="bg-blue"
                    src="./images/bg-alps-thumbnail.png"
                    isActive={this.state.componentsState.background.image === 'bg-blue' ||
                      !this.state.componentsState.background.image
                    }
                  />
                </li>
              }
              <li>
                <BackgroundImage
                  onBackgroundImageChanged={this.onBackgroundImageChanged}
                  bg="bg-light"
                  src="./images/bg-light-thumbnail.png"
                  isActive={this.state.componentsState.background.image === 'bg-light'}
                />
              </li>
              <li>
                <BackgroundImage
                  onBackgroundImageChanged={this.onBackgroundImageChanged}
                  bg="bg-dark"
                  src="./images/bg-dark-thumbnail.png"
                  isActive={this.state.componentsState.background.image === 'bg-dark'}
                />
              </li>
            </ul>
          </div>
          }

          <div className="settings-row">
            <span className="label">{t('app.settings.most-visited.label')}</span>
            <Switch
              isChecked={this.state.componentsState.historyDials.visible}
              toggleComponent={() => this.props.toggleComponent('historyDials')}
            />
            <button
              className="link"
              tabIndex="-1"
              disabled={!this.props.hasHistorySpeedDialsToRestore}
              onClick={() => this.props.restoreHistorySpeedDials()}
            >
              {t('app.settings.most-visited.restore')}
            </button>
          </div>

          <div className="settings-row">
            <span className="label">{t('app.settings.favorites.label')}</span>
            <Switch
              isChecked={this.state.componentsState.customDials.visible}
              toggleComponent={() => this.props.toggleComponent('customDials')}
            />
          </div>

          <div className="settings-row">
            <span className="label">{t('app.settings.search.label')}</span>
            <Switch
              isChecked={this.state.componentsState.search.visible}
              toggleComponent={() => this.props.toggleComponent('search')}
            />
          </div>

          <div className="settings-row">
            <div>
              <span className="label">{t('app.settings.news.label')}</span>
              <Switch
                isChecked={this.state.componentsState.news.visible}
                toggleComponent={() => this.props.toggleComponent('news')}
              />
            </div>
            {!this.state.componentsState.news.visible ? '' :
            <div>
              <form>
                <div className="radio">
                  <label htmlFor="news-radio-selector-2">
                    <input
                      type="radio"
                      tabIndex="-1"
                      name="news"
                      id="news-radio-selector-2"
                      value="de"
                      checked={this.state.componentsState.news.preferedCountry === 'de'}
                      onChange={this.onNewsSelectionChanged}
                    />
                    {t('app.settings.news.language.de')}
                  </label>
                </div>
                <div className="radio">
                  <label htmlFor="news-radio-selector-3">
                    <input
                      type="radio"
                      tabIndex="-1"
                      name="news"
                      id="news-radio-selector-3"
                      value="fr"
                      checked={this.state.componentsState.news.preferedCountry === 'fr'}
                      onChange={this.onNewsSelectionChanged}
                    />
                    {t('app.settings.news.language.fr')}
                  </label>
                </div>
                <div className="radio">
                  <label htmlFor="news-radio-selector-4">
                    <input
                      type="radio"
                      tabIndex="-1"
                      name="news"
                      id="news-radio-selector-4"
                      value="intl"
                      checked={this.state.componentsState.news.preferedCountry === 'intl'}
                      onChange={this.onNewsSelectionChanged}
                    />
                    {t('app.settings.news.language.en')}
                  </label>
                </div>
              </form>
            </div>
            }
          </div>
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}

Settings.propTypes = {
  onBackgroundImageChanged: PropTypes.func,
  onNewsSelectionChanged: PropTypes.func,
  toggle: PropTypes.func,
  isOpen: PropTypes.bool,
  blueTheme: PropTypes.bool,
  isBlueThemeSupported: PropTypes.func,
  isBlueBackgroundSupported: PropTypes.func,
  toggleComponent: PropTypes.func,
  toggleBlueTheme: PropTypes.func,
  toggleBackground: PropTypes.func,
  restoreHistorySpeedDials: PropTypes.func,
  hasHistorySpeedDialsToRestore: PropTypes.bool,
};
