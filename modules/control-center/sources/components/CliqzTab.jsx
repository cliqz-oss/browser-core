/* eslint-disable jsx-a11y/interactive-supports-focus */
import React from 'react';

export default class CliqzTab extends React.Component {
  constructor(props) {
    super(props);
    const { data = {} } = props;
    this.state = {
      status: data.enabled ? 'active' : 'inactive',
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
    this.props.sendMessage('cliqz-tab', {
      status: state === 'active',
    }, false);
  }

  render() {
    const { status } = this.state;
    const { localize } = this.props;

    return (
      <div className="frame-container" data-status={status}>
        <div className="title">
          <div id="cliqz-tap-tooltip" className="tooltip-content">
            <span className="title">Cliqz Tab</span>
            <span>{localize('control_center_info_cliqz_tab')}</span>
          </div>
          <span className="cc-tooltip" data-tooltip-content="#cliqz-tap-tooltip">Cliqz Tab</span>
          <div className="switches">
            <span>
              { status === 'active' && <span value="on">{localize('control_center_switch_on')}</span> }
              { status === 'inactive' && <span value="off">{localize('control_center_switch_off')}</span> }
              <span
                className="cqz-switch"
                onClick={this.handleClick}
                role="button"
              >
                <span className="cqz-switch-box" />
              </span>
            </span>
          </div>
        </div>

      </div>

    );
  }
}
