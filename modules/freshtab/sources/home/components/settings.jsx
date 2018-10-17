import React from 'react';
import PropTypes from 'prop-types';
import Switch from './switch';
import BackgroundImage from './background-image';
import t from '../i18n';
import { settingsCloseSignal, settingsBackgroundSelectSignal } from '../services/telemetry/settings';
import config from '../../config';

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

  onBackgroundImageChanged(bg, index) {
    settingsBackgroundSelectSignal(bg);
    this.props.onBackgroundImageChanged(bg, index);
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
          tabIndex="-1"
        >
          <button
            onClick={() => this.onCloseButtonClick()}
            tabIndex="-1"
            className="close"
          >
            Close
          </button>
          <div className="settings-header">
            <h1>{t('app_settings_header')}</h1>
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
            <span className="label">{t('app_settings_background_label')}</span>
            <Switch
              name="background"
              isChecked={this.state.componentsState.background.image !== config.constants.NO_BG}
              toggleComponent={() => this.props.toggleBackground()}
            />
          </div>
          {this.state.componentsState.background.image === config.constants.NO_BG ? (
            ''
          ) : (
            <div className="settings-row">
              <ul className="background-selection-list">
                { this.props.wallpapers && this.props.wallpapers.map((background, index) =>
                  (
                    <li key={`${background.alias}`}>
                      <BackgroundImage
                        onBackgroundImageChanged={this.onBackgroundImageChanged}
                        index={index}
                        bg={background.name}
                        src={`./images/bg-${background.alias}-thumbnail.png`}
                        isActive={this.state.componentsState.background.image === background.name ||
                              !this.state.componentsState.background.image
                        }
                      />
                    </li>
                  ))
                }
              </ul>
            </div>
          )
          }

          <div className="settings-row">
            <span className="label">{t('app_settings_most_visited_label')}</span>
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
              {t('app_settings_most_visited_restore')}
            </button>
          </div>

          <div className="settings-row">
            <span className="label">{t('app_settings_favorites_label')}</span>
            <Switch
              isChecked={this.state.componentsState.customDials.visible}
              toggleComponent={() => this.props.toggleComponent('customDials')}
            />
          </div>

          <div className="settings-row">
            <span className="label">{t('app_settings_search_label')}</span>
            <Switch
              isChecked={this.state.componentsState.search.visible}
              toggleComponent={() => this.props.toggleComponent('search')}
            />
          </div>

          <div className="settings-row">
            <div>
              <span className="label">{t('app_settings_news_label')}</span>
              <Switch
                isChecked={this.state.componentsState.news.visible}
                toggleComponent={() => this.props.toggleComponent('news')}
              />
            </div>
            {!this.state.componentsState.news.visible ? (
              ''
            ) : (
              <div>
                <form className="news-sources-selection">
                  <div className="radio">
                    <label htmlFor="news-radio-selector-2">
                      <input
                        id="news-radio-selector-2"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="de"
                        checked={this.state.componentsState.news.preferedCountry === 'de'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_de')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-5">
                      <input
                        id="news-radio-selector-5"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="de-tr-en"
                        checked={this.state.componentsState.news.preferedCountry === 'de-tr-en'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_de_tr_en')}
                    </label>
                  </div>
                  <div className={this.props.focusNews ? 'focused radio' : 'radio'}>
                    <label htmlFor="news-radio-selector-3">
                      <input
                        id="news-radio-selector-3"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="fr"
                        checked={this.state.componentsState.news.preferedCountry === 'fr'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_fr')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-4">
                      <input
                        id="news-radio-selector-4"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="intl"
                        checked={this.state.componentsState.news.preferedCountry === 'intl'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_en')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-6">
                      <input
                        id="news-radio-selector-6"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="us"
                        checked={this.state.componentsState.news.preferedCountry === 'us'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_us')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-7">
                      <input
                        id="news-radio-selector-7"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="gb"
                        checked={this.state.componentsState.news.preferedCountry === 'gb'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_gb')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-8">
                      <input
                        id="news-radio-selector-8"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="es"
                        checked={this.state.componentsState.news.preferedCountry === 'es'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_es')}
                    </label>
                  </div>
                  <div className="radio">
                    <label htmlFor="news-radio-selector-9">
                      <input
                        id="news-radio-selector-9"
                        type="radio"
                        tabIndex="-1"
                        name="news"
                        value="pl"
                        checked={this.state.componentsState.news.preferedCountry === 'pl'}
                        onChange={this.onNewsSelectionChanged}
                      />
                      {t('app_settings_news_language_pl')}
                    </label>
                  </div>
                </form>
              </div>
            )
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
  focusNews: PropTypes.bool,
  blueTheme: PropTypes.bool,
  isBlueThemeSupported: PropTypes.func,
  toggleComponent: PropTypes.func,
  toggleBlueTheme: PropTypes.func,
  toggleBackground: PropTypes.func,
  restoreHistorySpeedDials: PropTypes.func,
  hasHistorySpeedDialsToRestore: PropTypes.bool,
};
