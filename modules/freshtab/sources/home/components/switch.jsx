import React from 'react';
import PropTypes from 'prop-types';

export default class Switch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isChecked: null
    };
    this._handleChange = this._handleChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ isChecked: nextProps.isChecked });
  }

  _handleChange() {
    this.setState({ isChecked: !this.state.isChecked });
    this.props.toggleComponent();
  }

  render() {
    return (
      <div className="switch-container">
        <label
          htmlFor="switch"
        >
          <input
            checked={this.state.isChecked}
            onChange={this._handleChange}
            className="switch"
            type="checkbox"
            tabIndex="-1"
          />
          <div>
            <span><g className="icon icon-toolbar grid-view" /></span>
            <span><g className="icon icon-toolbar ticket-view" /></span>
            <div />
          </div>
        </label>
      </div>
    );
  }
}

Switch.propTypes = {
  toggleComponent: PropTypes.func
};
