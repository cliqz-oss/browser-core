import React from 'react';
import PropTypes from 'prop-types';

export default class Switch extends React.Component {
    state = {
      isChecked: this.props.isChecked
    };

    componentWillReceiveProps(nextProps) {
      this.setState({ isChecked: nextProps.isChecked });
    }

  _handleChange = () => {
    this.props.toggleComponent();
    this.setState(prevState => ({ isChecked: !prevState.isChecked }));
  }

  render() {
    return (
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
      </label>
    );
  }
}

Switch.propTypes = {
  toggleComponent: PropTypes.func,
  name: PropTypes.string,
  isChecked: PropTypes.bool
};
Switch.defaultProps = {
  isChecked: false,
};
