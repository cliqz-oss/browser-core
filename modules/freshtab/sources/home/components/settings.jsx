import React from 'react';
import PropTypes from 'prop-types';
import Switch from './partials/switch';
import Button from './partials/button';
import BackgroundImage from './background-image';
import t from '../i18n';
import { settingsCloseSignal, settingsBackgroundSelectSignal } from '../services/telemetry/settings';
import config from '../../config';

const newsEditions = [
  {
    value: 'de',
    text: 'app_settings_news_language_de',
  },
  {
    value: 'de-tr-en',
    text: 'app_settings_news_language_de_tr_en',
  },
  {
    value: 'fr',
    text: 'app_settings_news_language_fr',
  },
  {
    value: 'intl',
    text: 'app_settings_news_language_en',
  },
  {
    value: 'us',
    text: 'app_settings_news_language_us',
  },
  {
    value: 'gb',
    text: 'app_settings_news_language_gb',
  },
  {
    value: 'es',
    text: 'app_settings_news_language_es',
  },
  {
    value: 'pl',
    text: 'app_settings_news_language_pl',
  },
  {
    value: 'it',
    text: 'app_settings_news_language_it',
  },
  {
    value: 'ru',
    text: 'app_settings_news_language_ru',
  },
];

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
        stats: {},
      },
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ componentsState: nextProps.componentsState });
  }

  onBackgroundImageChanged = (bg, index, product) => {
    settingsBackgroundSelectSignal(bg, product);
    this.props.onBackgroundImageChanged(bg, index);
  }

  onNewsSelectionChanged = (changeEvent) => {
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
          <Button
            className="close"
            label="Close"
            onClick={() => this.onCloseButtonClick()}
          />
          <div className="settings-header">
            <h1>{t('app_settings_header')}</h1>
          </div>

          {this.props.isBlueThemeSupported
            && (
              <div className="settings-row">
                <span className="label">Cliqz Theme</span>
                <Switch
                  isChecked={this.props.blueTheme}
                  name="blueTheme"
                  toggleComponent={() => this.props.toggleBlueTheme()}
                />
              </div>
            )
          }

          <div className="settings-row">
            <span className="label">{t('app_settings_background_label')}</span>
            <Switch
              isChecked={this.state.componentsState.background.image !== config.constants.NO_BG}
              name="background"
              toggleComponent={() => this.props.toggleBackground()}
            />
          </div>
          {this.state.componentsState.background.image === config.constants.NO_BG ? (
            ''
          ) : (
            <div className="settings-row background-selection-wrapper">
              <ul className="background-selection-list">
                { this.props.wallpapers && this.props.wallpapers.map((background, index) =>
                  (
                    <li key={`${background.alias}`}>
                      <BackgroundImage
                        bg={background.name}
                        index={index}
                        isActive={this.state.componentsState.background.image === background.name
                              || !this.state.componentsState.background.image
                        }
                        onBackgroundImageChanged={this.onBackgroundImageChanged}
                        src={`./images/bg-${background.alias}-thumbnail.png`}
                      />
                    </li>
                  ))
                }
              </ul>
            </div>
          )
          }

          {this.props.shouldShowSearchSwitch
            && (
              <div className="settings-row">
                <span className="label">{t('app_settings_search_label')}</span>
                <Switch
                  isChecked={this.state.componentsState.search.visible}
                  toggleComponent={() => this.props.toggleComponent('search')}
                />
              </div>
            )
          }

          <div className="settings-row">
            <span className="label">{t('app_settings_most_visited_label')}</span>
            <Switch
              isChecked={this.state.componentsState.historyDials.visible}
              toggleComponent={() => this.props.toggleComponent('historyDials')}
            />
            <Button
              className="link"
              disabled={!this.props.hasHistorySpeedDialsToRestore}
              label={t('app_settings_most_visited_restore')}
              onClick={() => this.props.restoreHistorySpeedDials()}
            />
          </div>

          <div className="settings-row">
            <span className="label">{t('app_settings_favorites_label')}</span>
            <Switch
              isChecked={this.state.componentsState.customDials.visible}
              toggleComponent={() => this.props.toggleComponent('customDials')}
            />
          </div>

          {this.props.isStatsSupported
            && (
              <div className="settings-row">
                <span className="label">{t('app_settings_privacy_stats')}</span>
                <Switch
                  isChecked={this.state.componentsState.stats.visible}
                  toggleComponent={() => this.props.toggleComponent('stats')}
                />
              </div>
            )
          }

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
              <div className="news-editions-wrapper">
                <select
                  className="news-editions-select"
                  value={this.state.componentsState.news.preferedCountry}
                  onChange={this.onNewsSelectionChanged}
                  tabIndex="-1"
                >
                  {newsEditions.map(edition =>
                    (
                      <option
                        className="news-edition-option"
                        value={edition.value}
                        key={edition.value}
                      >
                        {t(edition.text)}
                      </option>
                    ))
                  }
                </select>
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
  blueTheme: PropTypes.bool,
  hasHistorySpeedDialsToRestore: PropTypes.bool,
  isBlueThemeSupported: PropTypes.func,
  isOpen: PropTypes.bool,
  isStatsSupported: PropTypes.bool,
  onBackgroundImageChanged: PropTypes.func,
  onNewsSelectionChanged: PropTypes.func,
  restoreHistorySpeedDials: PropTypes.func,
  shouldShowSearchSwitch: PropTypes.bool,
  toggle: PropTypes.func,
  toggleBackground: PropTypes.func,
  toggleBlueTheme: PropTypes.func,
  toggleComponent: PropTypes.func,
  wallpapers: PropTypes.array,
};
