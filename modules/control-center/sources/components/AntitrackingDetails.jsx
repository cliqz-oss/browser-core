/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/button-has-type */

import React from 'react';
import Arrow from './Arrow';

export default class Antitracking extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      strict: data.strict,
      hideMyIP: data.hideMyIP
    };
  }

  _getWatchDogUrl(company = {}) {
    const slug = company.wtm || '../tracker-not-found';
    return `https://whotracks.me/trackers/${slug}.html`;
  }

  compile(obj = { companies: [] }) {
    return Object.keys(obj.companies)
      .map((companyName) => {
        const domains = obj.companies[companyName];
        const item = {
          name: companyName,
          watchDogUrl: this._getWatchDogUrl(obj.companyInfo[companyName]),
          domains: domains.map((domain) => {
            const domainData = obj.trackers[domain];
            return {
              domain,
              count: (domainData.cookie_blocked || 0) + (domainData.tokens_removed || 0)
            };
          }).sort((a, b) => b.count - a.count),
          count: 0
        };
        item.count = item.domains.reduce((prev, curr) => prev + curr.count, 0);
        item.isInactive = item.count === 0;
        return item;
      })
      .sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count;
        if (b.name < a.name) return 1;
        if (b.name > a.name) return -1;
        return 0;
      });
  }

  handleClick = (fn) => {
    this.setState((prev) => {
      const value = !prev[fn];
      this.props.dataFunction(`antitracking-${fn}`, value);
      return { [fn]: value };
    });
  }

  openUrl = ({ name, watchDogUrl }) => {
    if (name === 'First Party') return;
    this.props.openUrl(watchDogUrl, false, 'antitracking_watchdog');
  }

  render() {
    const { data, localize, toggleDetails } = this.props;
    const { hideMyIP, strict } = this.state;
    const companiesArray = this.compile(data.trackersList) || [];

    return (
      <div className="active-window-tracking">
        <div
          id="companies-title"
          role="button"
          onClick={() => toggleDetails(false, 'at')}
        >
          <p className="cross hover-highlighted">{localize('control_center_trackers')}</p>
          <span>
            <Arrow classes="arrow cross" />
          </span>
        </div>
        <div id="companies">
          <div className="setting-accordion">
            {
              companiesArray.map(company => (
                <div key={company.name} className={`setting-accordion-section ${company.isInactive ? 'inactive' : ''}`}>
                  <a
                    className={`setting-accordion-section-title
                      ${company.name === 'First Party' ? 'noPointer' : ''}
                      ${company.isInactive ? 'accordion-inactive-title' : ''}
                    `}
                    onClick={() => this.openUrl(company)}
                    role="button"
                  >
                    <span>{company.name}</span>
                  </a>
                  <span className="company-count">{company.count}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div id="bottom-part">
          <div className="clearfix">
            <div className="description">
              {localize('control_center_datapoints')}
            </div>
            <div className="counter">
              <img id="shield" className="arr" src="./images/shield.svg" alt="shiled-cliqz" />
              <span id="count">{data.totalCount}</span>
            </div>
          </div>
          <span className="strict">
            <span className="squaredFour">
              <input
                type="checkbox"
                id="squaredFour"
                name="check"
                defaultChecked={strict}
                key="strict"
                onChange={this.handleClick.bind(this, 'strict')}
              />
              <label htmlFor="squaredFour">
                <span id="strict" className="clickableLabel">
                  {localize('control_center_check_strict')}
                </span>
              </label>
            </span>
          </span>

          <span className="hideMyIP hidden">
            <span className="squaredFour">
              <input
                type="checkbox"
                id="hideMyIP"
                name="check"
                key="hideMyIP"
                defaultChecked={hideMyIP}
                onChange={this.handleClick.bind(this, 'hideMyIP')}
              />
              <label htmlFor="hideMyIP">
                <span id="hideMyIP">
                  {localize('control_center_check_hideMyIP')}
                </span>
              </label>
            </span>
          </span>

          <button
            className="clear-Tracking-Cache-Button"
            onClick={this.handleClick.bind(this, 'clearcache')}
          >
            <span>{localize('control_center_clear_trCache')}</span>
          </button>
        </div>
      </div>
    );
  }
}
