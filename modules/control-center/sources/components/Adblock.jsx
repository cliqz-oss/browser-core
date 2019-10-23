/* eslint-disable jsx-a11y/interactive-supports-focus */
import React from 'react';
import Arrow from './Arrow';
import Dropdown from './Dropdown';
import Switch from './Switch';

export default class AdBlock extends React.Component {
  constructor(props) {
    super(props);
    let status;
    const { data = {} } = props;

    const { state, off_state: offState } = data;
    if (state === 'off') {
      status = offState;
    } else {
      status = state;
    }
    this.state = {
      status,
    };
  }

  handleClick = () => {
    const { status } = this.state;
    let state;
    if (status === 'active') {
      state = 'off_domain';
    } else {
      state = 'active';
    }

    this.setState({ status: state });
    this.props.sendMessage('adb-activator', {
      type: 'switch',
      state,
      target: 'adblock_switch',
      url: this.props.activeURL
    });
  }

  handleChange = (state) => {
    this.setState({ status: state });
    this.props.toggleDropdown(false, 'adb');
    this.props.sendMessage('adb-activator', {
      type: 'off_select',
      state,
      target: 'adblock_off_select',
      url: this.props.activeURL
    });
  }

  toggleDetails = () => {
    if (this.state.status !== 'active') return;
    this.props.toggleDetails(true, 'adb');
  }

  openDropdown = () => {
    this.props.toggleDropdown(true, 'adb');
  }

  render() {
    const { status } = this.state;
    const { data, dropdown, localize } = this.props;
    const dropdownFrame = {
      domain: 'off_domain',
      all: 'off_all'
    };

    return (
      <div
        id="ad-blocking"
        data-target="adblock"
        className="activehover setting"
      >
        <div
          className={`frame-container ${data.off_state}`}
          data-status={status === 'active' ? 'active' : 'critical'}
        >
          <div className="adblocker">
            <div className="title">
              <span
                onClick={this.toggleDetails}
                data-start-navigation
                role="button"
              >
                <div id="ad-blocking-tooltip" className="tooltip-content">
                  <span className="title">{localize('control_center_info_ads_title')}</span>
                  <span>{localize('control_center_info_ads')}</span>
                </div>
                <span
                  className="hover-highlighted cc-tooltip"
                  data-tooltip-content="#ad-blocking-tooltip"
                >
                  {localize('control_center_adblock_title')}
                </span>
                <Arrow classes="arrow" />
              </span>
              <div className="switches">
                {
                  status !== 'active'
                  && (
                  <Dropdown
                    dropdown={dropdown}
                    handleChange={this.handleChange}
                    localize={localize}
                    openDropdown={this.openDropdown}
                    selected={status}
                    dropdownFrame={dropdownFrame}
                  />
                  )}
                <Switch
                  status={status}
                  handleClick={this.handleClick}
                  localize={localize}
                />
              </div>
            </div>
            <div className="settings-section-row">
              <div
                className="counter"
                data-start-navigation
                onClick={this.toggleDetails}
                role="button"
              >
                <img id="block" src="./images/block.svg" alt="block-cliqz" />
                <span id="count">
                  <span data-visible-on-state="active">{data.totalCount}</span>
                  <span data-visible-on-state="off">0</span>
                </span>
              </div>
              <div
                className="row-text"
                onClick={this.toggleDetails}
                role="button"
              >
                <p className="description" value="active">
                  {status === 'active' && localize('control_center_adblock_description')}
                  { status === 'off_domain'
                    && localize('control_center_adblock_description_off_domain')
                  }
                  { status === 'off_all'
                    && localize('control_center_adblock_description_off_all')
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
