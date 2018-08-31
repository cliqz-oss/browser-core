import React from 'react';
import PropTypes from 'prop-types';

export default class Switch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isChecked: props.isChecked
    };
    this._handleChange = this._handleChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ isChecked: nextProps.isChecked });
  }

  _handleChange() {
    this.props.toggleComponent();
    this.setState({ isChecked: !this.state.isChecked });
  }

  render() {
    return (
      <div className="switch-container">
        <label
          htmlFor="switch"
        >
          <input
            name={this.props.name}
            checked={this.state.isChecked}
            onChange={this._handleChange}
            className="switch"
            type="checkbox"
            tabIndex="-1"
          />
          <div>
            <span><span className="icon icon-toolbar grid-view" /></span>
            <span><span className="icon icon-toolbar ticket-view" /></span>
            <div />
          </div>
        </label>
      </div>
    );
  }
}

Switch.propTypes = {
  toggleComponent: PropTypes.func,
  name: PropTypes.string
};
Switch.defaultProps = {
  isChecked: false,
};
