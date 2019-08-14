import React from 'react';
import PropTypes from 'prop-types';

export default function Switch({
  isChecked,
  name,
  toggleComponent,
}) {
  return (
    <label className="switch">
      <input
        checked={isChecked}
        className="toggle"
        name={name}
        onChange={toggleComponent}
        tabIndex="-1"
        type="checkbox"
      />
      <span className="slider" />
    </label>
  );
}

Switch.propTypes = {
  isChecked: PropTypes.bool,
  name: PropTypes.string,
  toggleComponent: PropTypes.func,
};
Switch.defaultProps = {
  isChecked: false,
};
