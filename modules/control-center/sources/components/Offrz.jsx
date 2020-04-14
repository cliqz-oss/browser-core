/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/button-has-type */
import React from 'react';

import ArrowAccord from './ArrowAccord';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      userEnabled: data.userEnabled || false,
      open: props.open
    };
  }

  handlePref = (e, pref, target, mode, isBoolean = false) => {
    let { value } = e.target;
    if (target === 'search_humanweb') {
      value = e.target.value === 'enabled';
    }

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

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps({ open }) {
    if (this.state.open !== open) {
      this.setState({ open });
    }
  }

  toggleDetails = () => {
    const { open } = this.state;
    this.props.toggleDetails(!open, 'offrz');
  }

  render() {
    const { open, userEnabled } = this.state;
    const { localize, openUrl, myoffrzURL } = this.props;

    return (
      <div className="accordion-section">
        <a
          className={`accordion-section-title ${open ? 'open' : ''}`}
          onClick={this.toggleDetails}
          role="button"
          data-target="offrz"
        >
          <ArrowAccord id="arrow" />
          <span>{localize('control_center_offers_options')}</span>
        </a>
        <div id="accordion-4" className={`accordion-section-content offrz ${open ? 'open' : ''}`}>
          <span className="bullet">
            <div id="offers-main-tooltip" className="tooltip-content">
              <span className="title">{localize('control_center_offers_show')}</span>
              <span>{localize('control_center_offers_show_info')}</span>
            </div>
            <span className="cc-tooltip" data-tooltip-content="#offers-main-tooltip">{localize('control_center_offers_show')}</span>
            <span
              className="location-more"
              role="button"
              target={myoffrzURL}
              onClick={() => openUrl(myoffrzURL, false, 'offerz_main_learn_more')}
            >
              {localize('control_center_info_share_location_link')}
            </span>
            <select
              className="custom-dropdown"
              onChange={e => this.handlePref(e, 'offers2UserEnabled', 'offerz_main', 'userEnabled', true)}
              defaultValue={userEnabled}
            >
              <option value="true">{localize('control_center_enabled')}</option>
              <option value="false">{localize('control_center_disabled')}</option>
            </select>
          </span>
        </div>
      </div>
    );
  }
}
