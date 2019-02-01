import React from 'react';
import PropTypes from 'prop-types';

function Switch({
  isChecked,
  toggleComponent
}) {
  return (
    <input
      checked={isChecked}
      className="switch"
      onChange={toggleComponent}
      type="checkbox"
    />
  );
}

Switch.propTypes = {
  isChecked: PropTypes.bool,
  toggleComponent: PropTypes.func.isRequired,
};
Switch.defaultProps = {
  isChecked: false,
};

export default Switch;
