import React from 'react';

import Switch from './Switch';

export default class Https extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      status: data.active ? 'active' : 'inactive',
    };
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
    this.props.sendMessage('updatePref', {
      type: 'switch',
      pref: 'extensions.https_everywhere.globalEnabled',
      value: state === 'active',
      target: 'https_switch'
    });
  }

  render() {
    const { status } = this.state;
    const { localize } = this.props;

    return (
      <div
        id="https"
        className="setting"
        data-section="https"
        data-target="https"
      >
        <div
          className="httpsevery-frame frame-container"
          data-status={status}
        >
          <div className="title">
            <div id="https-tooltip" className="tooltip-content">
              <span className="title">{localize('control_center_info_https_title')}</span>
              <span>{localize('control_center_info_https')}</span>

            </div>
            <span
              className="cc-tooltip"
              data-tooltip-content="#https-tooltip"
            >
              {localize('control_center_info_https_title')}
            </span>
            <div className="switches">
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
