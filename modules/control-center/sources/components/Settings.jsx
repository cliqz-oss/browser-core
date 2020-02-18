/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/button-has-type */

import React from 'react';

import Support from './Support';
import ArrowAccord from './ArrowAccord';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    const search = data.module.search || {};
    const freshtab = data.module.freshtab || {};
    const humanWeb = data.module['human-web'] || {};
    const humanWebOptOut = data.module.humanWebOptOut || false;
    const countriesMap = this.getSupportedIndexCountries(search);
    const adult = data.module.adult || {};
    const geolocation = data.module.geolocation || {};
    const geoMap = this.getGeolocation(geolocation);
    const searchProxy = data.module.searchProxy && data.module.searchProxy.enabled;
    this.state = {
      defaultSearch: this.getDefaultSearch(search),
      search,
      quickSearchEnabled: search.quickSearchEnabled || false,
      humanWeb,
      humanWebOptOut,
      countries: countriesMap.countries,
      defaultCountry: countriesMap.selected,
      adult,
      adultStatus: this.getAdultStatus(adult),
      geolocation,
      geoEnabled: geoMap.selected,
      geoOptions: geoMap.options,
      searchProxy,
      telemetry: data.telemetry || false,
      autoFocus: freshtab.autofocus || false,
      open: props.open
    };
  }

  getAdultStatus = ({ state }) => {
    if (!state) return null;
    return Object.keys(state).reduce((prev, key) => {
      // eslint-disable-next-line no-param-reassign
      if (state[key].selected) prev = key;
      return prev;
    }, '');
  }

  getDefaultSearch = (data) => {
    if (!data.state) return null;
    return data.state.reduce((prev, item) => {
      // eslint-disable-next-line no-param-reassign
      if (item.default) prev = item.name;
      return prev;
    }, '');
  }


  getSupportedIndexCountries = ({ supportedIndexCountries: countries }) => {
    if (!countries) return { countries: [], selected: '' };
    let selected = '';
    const obj = Object.keys(countries).map((c) => {
      if (countries[c].selected) selected = c;
      return { key: c, val: countries[c].name };
    });
    return { countries: obj, selected };
  }

  getGeolocation = ({ state }) => {
    if (!state) return { options: [], selected: '' };
    let selected = '';
    const obj = Object.keys(state).map((c) => {
      if (state[c] && state[c].selected) selected = c;
      return { key: c, val: state[c].name };
    });
    return { options: obj, selected };
  }

  handlePref = (e, pref, target, mode, isBoolean = false) => {
    const { value } = e.target;
    const args = {
      pref,
      value,
      target
    };

    if (isBoolean) {
      args.prefType = 'boolean';
    }

    this.props.sendMessage('updatePref', args);
    this.setState({ [mode]: value });
  }

  quickSearchEnabled = (e) => {
    const { value } = e.target;
    this.props.sendMessage('quick-search-state', {
      enabled: value
    });
    this.setState({ quickSearchEnabled: value });
  }

  handleChange = (mode, key, value) => {
    this.props.sendMessage(mode, {
      [key]: value
    });
    this.setState({ [key]: value });
  }

  componentWillReceiveProps({ open }) {
    if (this.state.open !== open) {
      this.setState({ open });
    }
  }

  toggleDetails = () => {
    const { open } = this.state;
    this.props.toggleDetails(!open, 'settings');
  }

  render() {
    const {
      adult,
      adultStatus,
      defaultCountry,
      defaultSearch,
      geolocation = {},
      geoEnabled,
      geoOptions,
      quickSearchEnabled,
      search = {},
      humanWeb = {},
      humanWebOptOut,
      countries,
      searchProxy,
      telemetry,
      autoFocus,
      open
    } = this.state;
    const { data, localize, openUrl } = this.props;

    const hpnv2 = data.module.hpnv2 || {};
    const privacyDashboard = data.module['privacy-dashboard'] || {};

    return (
      <div className="accordion-section">
        <a
          className={`accordion-section-title search ${open || data.compactView ? 'active' : ''}`}
          onClick={this.toggleDetails}
          role="button"
        >
          <ArrowAccord id="arrow" />
          <span>{localize('control_center_searchoptions')}</span>
        </a>
        { data.compactView && (
          <header className="header no-border">
            <div className="search-settings-title">
              <span>{localize('control_center_searchoptions')}</span>
              {data.ghostery && (
                <Support
                  localize={localize}
                  openUrl={openUrl}
                  feedbackURL={data.feedbackURL}
                  privacyPolicyURL={data.privacyPolicyURL}
                />
              )}
            </div>
          </header>
        )}
        <div id="accordion-2" className={`accordion-section-content settings ${data.compactView || open ? 'open' : ''}`}>
          {search.visible && (
            <span className="bullet defaultSearch">
              <span className="no-tooltip-label">{localize('control_center_search_engine')}</span>
              <select
                className="custom-dropdown"
                onChange={e => this.handleChange('complementary-search', 'defaultSearch', e.target.value)}
                defaultValue={defaultSearch}
              >
                {
                  search.state
                  && search.state.map(({ alias, name }) => (
                    <option key={name} value={name}>
                      {alias ? `[${alias}] ${name}` : name}
                    </option>
                  ))
                }
              </select>
            </span>
          )}

          { humanWeb.visible && (
            <span
              className="bullet human-web humanWebOptOut"
              data-status={humanWeb.state ? 'active' : 'inactive'}
            >
              <div id="human-web-tooltip" className="tooltip-content">
                <span className="title">{localize('control_center_info_hw_title')}</span>
                <span>{localize('control_center_info_hw')}</span>
              </div>
              <span
                className="cqz-switch-label cc-tooltip"
                data-tooltip-content="#human-web-tooltip"
              >
                {localize('control_center_humanweb')}
              </span>
              <select
                className="custom-dropdown"
                defaultValue={humanWebOptOut ? 'disabled' : 'enabled'}
                onChange={e => this.handlePref(e, 'humanWebOptOut', 'search_humanweb', 'humanWebOptOut')}
              >
                <option key="e" value="enabled">{localize('control_center_enabled')}</option>
                <option key="d" value="disabled">{localize('control_center_disabled')}</option>
              </select>
            </span>
          )}

          {data.ghostery && (
            <span className={`bullet ${!quickSearchEnabled ? 'disabled' : ''}`}>
              <span>
                <span className="cqz-switch-label no-tooltip-label">
                  <span className="title">{localize('control_center_quicksearch')}</span>
                </span>
                <select
                  className="custom-dropdown"
                  defaultValue={quickSearchEnabled}
                  onChange={this.quickSearchEnabled}
                >
                  <option key="true" value="true">{localize('control_center_enabled')}</option>
                  <option key="false" value="false">{localize('control_center_disabled')}</option>
                </select>
              </span>
            </span>
          )}

          {search.visible && (
            <span className="bullet defaultCountry">
              <span className="no-tooltip-label">{localize('control_center_backend_country')}</span>
              <select
                className="custom-dropdown"
                defaultValue={defaultCountry}
                onChange={e => this.handleChange('search-index-country', 'defaultCountry', e.target.value)}
              >
                { countries.map(({ key, val }) => <option key={key} value={key}>{val}</option>) }
              </select>
            </span>
          )}

          <span className="bullet adultStatus">
            <div id="explicit-tooltip" className="tooltip-content">
              <span className="title">{localize('control_center_info_explicit_title')}</span>
              <span>{localize('control_center_info_explicit')}</span>
            </div>
            <span className="cc-tooltip" data-tooltip-content="#explicit-tooltip">{localize('control_center_explicit')}</span>
            <select
              className="custom-dropdown"
              defaultValue={adultStatus}
              onChange={e => this.handlePref(e, 'adultContentFilter', 'search_adult', 'adultStatus')}
            >
              {
                Object.keys(adult.state || [])
                  .map(key => <option key={key} value={key}>{adult.state[key].name}</option>)
              }
            </select>
          </span>

          {geolocation.visible && (
            <span className="bullet geoEnabled">
              <div id="share-location-tooltip" className="tooltip-content">
                <span className="title">{localize('control_center_info_share_location_title')}</span>
                <span>{localize('control_center_info_share_location')}</span>
              </div>
              <span className="cc-tooltip" data-tooltip-content="#share-location-tooltip">
                {localize('control_center_location')}
              </span>
              <select
                className="custom-dropdown"
                data-update-pref="share_location"
                data-target=""
                defaultValue={geoEnabled}
                onChange={e => this.handlePref(e, 'share_location', 'search_location', 'geoEnabled')}
              >
                {geoOptions.map(({ key, val }) => <option key={key} value={key}>{val}</option>)}
              </select>

              {data.showLearnMore && (
                <span
                  className="location-more"
                  role="button"
                  target={data.locationSharingURL}
                  onClick={() => openUrl(data.locationSharingURL)}
                >
                  {localize('control_center_info_share_location_link')}
                </span>
              )}
            </span>
          )}

          {hpnv2.visible && (
            <span
              className="bullet searchProxy"
              data-status={hpnv2.state ? 'active' : 'inactive'}
            >
              <div id="proxy-tooltip" className="tooltip-content">
                <span className="title">{localize('control_center_info_hpn_title')}</span>
                <span>{localize('control_center_info_hpn')}</span>
              </div>
              <span
                className="cqz-switch-label cc-tooltip"
                data-tooltip-content="#proxy-tooltip"
              >
                {localize('control_center_proxy')}
              </span>
              <select
                className="custom-dropdown"
                defaultValue={searchProxy}
                onChange={e => this.handlePref(e, 'hpn-query', 'search_proxy', 'searchProxy', true)}
              >
                <option value="true">{localize('control_center_enabled')}</option>
                <option value="false">{localize('control_center_disabled')}</option>
              </select>
            </span>
          )}

          {privacyDashboard.visible && (
            <span className="bullet search_transparency">
              <span className="no-tooltip-label">{localize('control_center_transparency')}</span>
              <button
                onClick={() => openUrl(privacyDashboard.url, true, 'search_transparency')}
                target={privacyDashboard.url}
              >
                {localize('control_center_open')}
              </button>
            </span>
          )}

          {!data.isDesktopBrowser && (
            <span className="bullet telemetry">
              <div id="telemetry-tooltip" className="tooltip-content">
                <span className="title">{localize('control_center_telemetry')}</span>
                <span>{localize('control_center_telemetry_info')}</span>
              </div>
              <span className="cc-tooltip" data-tooltip-content="#telemetry-tooltip">{localize('control_center_telemetry')}</span>
              <select
                className="custom-dropdown"
                defaultValue={telemetry}
                onChange={e => this.handlePref(e, 'telemetry', 'telemetry', 'telemetry', true)}
              >
                <option value="true">{localize('control_center_enabled')}</option>
                <option value="false">{localize('control_center_disabled')}</option>
              </select>
            </span>
          )}

          {!data.isDesktopBrowser && (
            <span className="bullet autofocus">
              <div id="autofocus-tooltip" className="tooltip-content">
                <span className="title">{localize('control_center_autofocus')}</span>
                <span>{localize('control_center_autofocus_info')}</span>
              </div>
              <span className="cc-tooltip" data-tooltip-content="#autofocus-tooltip">{localize('control_center_autofocus')}</span>
              <select
                className="custom-dropdown"
                defaultValue={autoFocus}
                onChange={e => this.handlePref(e, 'freshtab.search.autofocus', 'autoFocus', 'autoFocus', true)}
              >
                <option value="true">{localize('control_center_enabled')}</option>
                <option value="false">{localize('control_center_disabled')}</option>
              </select>
            </span>
          )}
        </div>
      </div>
    );
  }
}
