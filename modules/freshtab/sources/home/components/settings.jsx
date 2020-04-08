/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Switch from './partials/switch';
import Button from './partials/button';
import Radio from './partials/radio';
import BackgroundImage from './background-image';
import BackgroundCustomImage from './background-custom-image';
import AppContext from './app-context';
import cliqz from '../cliqz';
import t from '../i18n';
import { settingsCloseSignal, settingsBackgroundSelectSignal, settingsViewBrowserPrefsSignal } from '../services/telemetry/settings';
import config from '../../config';

export default class Settings extends React.Component {
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

  onViewBrowserSettingsClick() {
    settingsViewBrowserPrefsSignal();
    cliqz.freshtab.openBrowserSettings();
  }

  async handleThemeChange(ev) {
    cliqz.freshtab.setBrowserTheme(ev.target.value);
  }

  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <AppContext.Consumer>
        {
          ({ config: { componentsState = {
            historyDials: {},
            customDials: {},
            search: {},
            news: {},
            background: {},
            stats: {},
          }, isCustomBackgroundSupported } }) => (
            <div>
              <div
                id="settings-panel"
                tabIndex="-1"
              >
                <Button
                  className="close"
                  label="Close"
                  onClick={() => this.onCloseButtonClick()}
                />
                <div className="settings-header">
                  <h1 className="header">{t('app_settings_header')}</h1>
                </div>

                {this.props.isBrowserThemeSupported
                  && (
                  <div className="settings-row">
                    <span className="label">{t('app_settings_browser_theme')}</span>
                    <div className="btns-wrapper">
                      <Radio
                        id="light"
                        labelValue={t('app_settings_browser_theme_light')}
                        name="browser_theme"
                        onChange={this.handleThemeChange}
                        type="radio"
                        value="light"
                        checked={this.props.browserTheme === 'light'}
                      />
                      <Radio
                        id="dark"
                        labelValue={t('app_settings_browser_theme_dark')}
                        name="browser_theme"
                        onChange={this.handleThemeChange}
                        type="radio"
                        value="dark"
                        checked={this.props.browserTheme === 'dark'}
                      />
                    </div>
                  </div>
                  )
                }

                {this.props.isBlueThemeSupported
                  && (
                    <div className="settings-row">
                      <span className="label">{t('app_settings_browser_theme_blue')}</span>
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
                    isChecked={componentsState.background.image !== config.constants.NO_BG}
                    name="background"
                    toggleComponent={() => this.props.toggleBackground()}
                  />
                </div>
                {componentsState.background.image === config.constants.NO_BG ? (
                  ''
                ) : (
                  <div className="settings-row background-selection-wrapper">
                    <ul className="background-selection-list">
                      { this.props.wallpapers && this.props.wallpapers.map((background, index) =>
                        (
                          <li
                            className="background-item"
                            key={`${background.alias}`}
                          >
                            <BackgroundImage
                              bg={background.name}
                              index={index}
                              isActive={componentsState.background.image === background.name
                                    || !componentsState.background.image
                              }
                              onBackgroundImageChanged={this.onBackgroundImageChanged}
                              src={background.thumbnailSrc
                                || `./images/bg-${background.alias}-thumbnail.png`
                              }
                            />
                          </li>
                        ))
                      }
                    </ul>
                    {isCustomBackgroundSupported && (
                      <BackgroundCustomImage
                        onCustomBackgroundImageUploaded={this.props.onCustomBackgroundImageUploaded}
                      />
                    )}
                  </div>
                )
                }

                {this.props.shouldShowSearchSwitch
                  && (
                    <div className="settings-row">
                      <span className="label">{t('app_settings_search_label')}</span>
                      <Switch
                        isChecked={componentsState.search.visible}
                        toggleComponent={() => this.props.toggleComponent('search')}
                      />
                    </div>
                  )
                }

                <div className="settings-row">
                  <span className="label">{t('app_settings_most_visited_label')}</span>
                  <Switch
                    isChecked={componentsState.historyDials.visible}
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
                    isChecked={componentsState.customDials.visible}
                    toggleComponent={() => this.props.toggleComponent('customDials')}
                  />
                </div>

                {this.props.isStatsSupported
                  && (
                    <div className="settings-row">
                      <span className="label">{t('app_settings_privacy_stats')}</span>
                      <Switch
                        isChecked={componentsState.stats.visible}
                        toggleComponent={() => this.props.toggleComponent('stats')}
                      />
                      <Button
                        className="link"
                        disabled={!componentsState.stats.visible}
                        label={t('app_settings_statistics_reset')}
                        onClick={() => this.props.resetStatistics()}
                      />
                    </div>
                  )
                }

                <div className="settings-row">
                  <div>
                    <span className="label">{t('app_settings_news_label')}</span>
                    <Switch
                      isChecked={componentsState.news.visible}
                      toggleComponent={() => this.props.toggleComponent('news')}
                    />
                  </div>
                  {!componentsState.news.visible ? (
                    ''
                  ) : (
                    <div className="news-editions-wrapper">
                      <select
                        className="news-editions-select"
                        value={componentsState.news.preferedCountry}
                        onChange={this.onNewsSelectionChanged}
                        tabIndex="-1"
                      >
                        {componentsState.news.availableEditions.map(edition =>
                          (
                            <option
                              className="news-edition-option"
                              value={edition.code}
                              key={edition.code}
                            >
                              {edition.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  )
                  }
                </div>

                {this.props.isAllPrefsLinkSupported
                  && (
                    <div className="settings-row">
                      <Button
                        className="browser-settings"
                        disabled={false}
                        label={t('cliqz_tab_settings_all_prefs_link')}
                        onClick={this.onViewBrowserSettingsClick}
                      />
                    </div>
                  )
                }
              </div>
            </div>
          )
        }
      </AppContext.Consumer>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}

Settings.propTypes = {
  blueTheme: PropTypes.bool,
  hasHistorySpeedDialsToRestore: PropTypes.bool,
  isBlueThemeSupported: PropTypes.bool,
  isBrowserThemeSupported: PropTypes.bool,
  isAllPrefsLinkSupported: PropTypes.bool,
  isStatsSupported: PropTypes.bool,
  onBackgroundImageChanged: PropTypes.func,
  onCustomBackgroundImageUploaded: PropTypes.func,
  onNewsSelectionChanged: PropTypes.func,
  resetStatistics: PropTypes.func,
  restoreHistorySpeedDials: PropTypes.func,
  shouldShowSearchSwitch: PropTypes.bool,
  toggle: PropTypes.func,
  toggleBackground: PropTypes.func,
  toggleBlueTheme: PropTypes.func,
  toggleComponent: PropTypes.func,
  wallpapers: PropTypes.array,
};
