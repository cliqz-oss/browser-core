/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/aria-role */

import React from 'react';

import Arrow from './Arrow';
import Dropdown from './Dropdown';
import Switch from './Switch';

export default class Antitracking extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      status: data.state
    };
    this.handleChange = this.handleChange.bind(this);
  }

  handleClick = () => {
    const { status } = this.state;
    let state;
    if (status === 'active') {
      state = 'inactive';
    } else {
      state = 'active';
    }

    this.setState({ status: state });
    this.props.sendMessage('antitracking-activator', {
      type: 'switch',
      state,
      status: state,
    });
  }

  handleChange(status) {
    let state;
    this.setState({ status });
    this.props.toggleDropdown(false, 'at');

    if (status === 'inactive') state = 'off_website';
    if (status === 'critical') state = 'off_all';

    this.props.sendMessage('antitracking-activator', {
      type: 'off_select',
      state,
      status,
    });
  }

  toggleDetails = () => {
    if (this.state.status !== 'active') return;
    this.props.toggleDetails(true, 'at');
  }

  openDropdown = () => {
    this.props.toggleDropdown(true, 'at');
  }

  render() {
    const { status } = this.state;
    const { data, dropdown, localize } = this.props;
    const dropdownFrame = {
      domain: 'inactive',
      all: 'critical'
    };

    return (
      <div id="anti-tracking" className="activehover setting">
        <div
          className="frame-container anti-tracking"
          data-status={status}
        >
          <div className="antitracking">
            <div className="title">
              <span
                onClick={this.toggleDetails}
                role="button"
              >
                <div id="anti-tracking-tooltip" className="tooltip-content">
                  <span className="title">Anti-Tracking</span>
                  <span>{localize('control_center_info_trackers')}</span>
                </div>
                <span
                  className="hover-highlighted cc-tooltip"
                  data-start-navigation
                  data-tooltip-content="#anti-tracking-tooltip"
                >
                  Anti-Tracking
                </span>
                <Arrow classes="arrow" />
              </span>
              <div className="switches">
                { status !== 'active'
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
                data-start-navigation
                className="counter"
                id="antitracker-counter"
                onClick={this.toggleDetails}
                role="button"
              >
                <img id="shield" className="arr" src="./images/shield.svg" alt="shiled-cliqz" />
                <span id="count">
                  <span>{ status === 'active' ? data.totalCount : 0 }</span>
                </span>
              </div>
              <div
                className="row-text"
                onClick={this.toggleDetails}
                role="button"
              >
                <p className="description">
                  {status === 'active' && localize('control_center_datapoints')}
                  {status === 'inactive' && localize('control_center_datapoints_inactive')}
                  {status === 'critical' && localize('control_center_datapoints_off')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
