/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/anchor-is-valid */

import React from 'react';
import Arrow from './Arrow';

export default class AdblockDetails extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      optimized: data.optimized,
    };
  }

  _getWatchDogUrl(company = {}) {
    const slug = company.wtm || '../tracker-not-found';
    return `https://whotracks.me/trackers/${slug}.html`;
  }

  compileAdblockInfo(data) {
    const advertisersInfo = data.advertisersInfo;
    const advertisers = data.advertisersList || {};
    const firstParty = advertisers['First party'];
    const unknown = advertisers._Unknown;
    const firstPartyCount = firstParty && firstParty.length;
    const unknownCount = unknown && unknown.length;

    delete advertisers['First party'];
    delete advertisers._Unknown;
    const advertisersArray = Object.keys(advertisers)
      .map((advertiser) => {
        const count = advertisers[advertiser].length;
        return {
          count,
          name: advertiser,
          isInactive: count === 0,
          watchDogUrl: this._getWatchDogUrl(advertisersInfo[advertiser]),
        };
      }).sort((a, b) => a.count < b.count);
    if (firstParty) {
      advertisersArray.unshift({
        name: 'First Party', // i18n
        count: firstPartyCount,
        isInactive: firstPartyCount === 0
      });
    }
    if (unknown) {
      advertisersArray.push({
        name: 'Other', // i18n
        count: unknownCount,
        isInactive: unknownCount === 0
      });
    }

    return advertisersArray;
  }

  handleClick = (fn) => {
    this.setState((prev) => {
      const value = !prev[fn] || null;
      this.props.dataFunction(`adb-${fn}`, value);
      return { [fn]: value };
    });
  }

  openUrl = ({ name, watchDogUrl }) => {
    if (name === 'First Party') return;
    this.props.openUrl(watchDogUrl, false, 'adblocker_watchdog');
  }

  render() {
    const { data, localize, toggleDetails } = this.props;
    const { optimized } = this.state;
    const advertisersArray = this.compileAdblockInfo(data) || [];

    return (
      <div className="active-window-tracking">
        <div
          id="companies-title"
          role="button"
          onClick={() => toggleDetails(false, 'adb')}
        >
          <p className="cross hover-highlighted">{localize('control_center_adblock_advertisers')}</p>
          <span>
            <Arrow classes="arrow cross" />
          </span>
        </div>
        <div id="companies">
          <div className="setting-accordion">
            {
              advertisersArray.map(company => (
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
              {localize('control_center_adblock_description')}
            </div>
            <div className="counter">
              <img id="block" className="arr" src="./images/block.svg" alt="block-cliqz" />
              <span id="count">{data.totalCount}</span>
            </div>
          </div>
          <span className="strict">
            <span className="squaredFour">
              <input
                type="checkbox"
                id="squaredFour"
                name="check"
                defaultChecked={optimized}
                key="optimized"
                onChange={this.handleClick.bind(this, 'optimized')}
              />
              <label htmlFor="squaredFour">
                <span id="strict" className="clickableLabel">
                  {localize('control_center_check_strict')}
                </span>
              </label>
            </span>
          </span>
        </div>
      </div>
    );
  }
}
