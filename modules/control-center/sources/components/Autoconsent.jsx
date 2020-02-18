/* eslint-disable jsx-a11y/aria-role */

import React from 'react';

import Dropdown from './Dropdown';
import Switch from './Switch';

export default class Autoconsent extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      status: data.state,
      deny: !data.defaultAllow
    };
    this.handleChange = this.handleChange.bind(this);
  }

  handleClick = () => {
    const { deny, status } = this.state;
    let state;
    if (status === 'active') {
      state = 'inactive';
    } else {
      state = 'active';
    }

    this.setState({ status: state });
    this.props.sendMessage('autoconsent-activator', {
      type: 'switch',
      state,
      deny
    });
  }

  handleCheck = () => {
    this.setState((prev) => {
      const deny = !prev.deny;
      this.props.sendMessage('autoconsent-activator', {
        type: 'deny',
        state: prev.status,
        deny
      });
      return { deny };
    });
  }

  handleChange(status) {
    this.setState({ status });
    this.props.toggleDropdown(false, 'ac');
    this.props.sendMessage('autoconsent-activator', {
      type: 'off_select',
      state: status,
      deny: this.state.deny
    });
  }

  toggleDetails = () => {
    if (this.state.status !== 'active') return;
    this.props.toggleDetails(true, 're');
  }

  openDropdown = () => {
    this.props.toggleDropdown(true, 'ac');
  }

  render() {
    const { deny, status } = this.state;
    const { dropdown, localize } = this.props;
    const dropdownFrame = {
      domain: 'inactive',
      all: 'critical'
    };

    return (
      <div id="autoconsent" className="setting autoconsenter">
        <div
          className="autoconsent frame-container"
          role="stop-navigation"
          data-status={status}
        >
          <div className="autoconsent">
            <div className="title">
              <div id="autoconsent-tooltip" className="tooltip-content">
                <span className="title">{localize('control_center_info_autoconsent_title')}</span>
                <span>{localize('control_center_info_autoconsent')}</span>
              </div>
              <span className="cc-tooltip" data-tooltip-content="#autoconsent-tooltip">Cookie Pop-up Blocker</span>
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
          </div>
          <div className="settings-section-row">
            <div className="counter" id="autoconsent-counter">
              <img id="shield" className="arr" src="./images/autoconsent.svg" alt="shiled-cliqz" />
            </div>
            <div className="row-text">
              <p>
                {status === 'active' && localize('control_center_autoconsent')}
                {status === 'inactive' && localize('control_center_autoconsent_inactive')}
                {status === 'critical' && localize('control_center_autoconsent_off')}
              </p>
              {
                status === 'active' && (
                  <div className="checkbox">
                    <input
                      type="checkbox"
                      id="autoconsentDenyCheckbox"
                      defaultChecked={deny}
                      onChange={this.handleCheck}
                    />
                    <label
                      htmlFor="autoconsentDenyCheckbox"
                      id="autoconsentDenyLabel"
                    >
                      {localize('control_center_autoconsent_deny')}
                    </label>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
