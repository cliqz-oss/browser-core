import React from 'react';
import PropTypes from 'prop-types';

function Button({
  onClick,
  value,
}) {
  return (
    <input
      className="button"
      onClick={onClick}
      type="button"
      value={value}
    />
  );
}

Button.propTypes = {
  onClick: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};

export default Button;
