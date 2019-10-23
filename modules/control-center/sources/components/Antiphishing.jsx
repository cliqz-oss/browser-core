/* eslint-disable jsx-a11y/aria-role */

import React from 'react';

import Dropdown from './Dropdown';
import Switch from './Switch';

export default class Antiphishing extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      status: data.state,
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
    this.props.sendMessage('anti-phishing-activator', {
      type: 'switch',
      state,
      url: this.props.activeURL
    });
  }

  handleChange(state) {
    this.setState({ status: state });
    this.props.toggleDropdown(false, 'ap');
    this.props.sendMessage('anti-phishing-activator', {
      type: 'off_select',
      state,
      url: this.props.activeURL
    });
  }

  openDropdown = () => {
    this.props.toggleDropdown(true, 'ap');
  }

  render() {
    const { status } = this.state;
    const { dropdown, localize } = this.props;
    const dropdownFrame = {
      domain: 'inactive',
      all: 'critical'
    };

    return (
      <div
        id="anti-phishing"
        className="antiphishing setting"
        data-section="antiphish"
        data-target="antiphish"
      >
        <div
          className="antiphishing frame-container"
          role="stop-navigation"
          data-status={status}
        >
          <div className="title">
            <div id="anti-phishing-tooltip" className="tooltip-content">
              <span className="title">{localize('control_center_info_phishing_title')}</span>
              <span>{localize('control_center_info_phishing')}</span>
            </div>
            <span className="cc-tooltip" data-tooltip-content="#anti-phishing-tooltip">Anti-Phishing</span>
            <div className="switches">
              { status !== 'active' && (
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
      </div>
    );
  }
}
