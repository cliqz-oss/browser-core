import React from 'react';
import { trackingInfoShow } from '../services/telemetry/telemetry';

export default class Info extends React.Component {
  state = {
    description: this.props.description
  }

  handleToggleChanges = async () => {
    await this.props.onToggle();

    if (this.props.handleBgToggle) {
      this.props.handleBgToggle(this.props.isToggled);
    }
    const delay = this.props.isToggled ? 600 : 0;

    setTimeout(() => {
      this.setState({ description: this.props.description });
    }, delay);
  };

  get className() {
    return this.props.isToggled === true
      ? 'toggled'
      : '';
  }

  render() {
    return (
      <div className="info">
        <div className="headline">
          <span className={this.className}>
            {this.props.headline}
          </span>
        </div>

        <label className="switch">
          <input
            checked={this.props.isToggled}
            className="toggle"
            onChange={this.handleToggleChanges}
            type="checkbox"
          />
          <span className="slider" />
        </label>

        <div className={`description-area ${this.className}`}>
          {this.props.tooltip && (
            <span onMouseEnter={trackingInfoShow} className="description">
              {this.state.description}
              {this.props.tooltip}
            </span>
          )}

          {!this.props.tooltip && (
            <span className="description">
              {this.state.description}
            </span>
          )}
        </div>
      </div>
    );
  }
}
