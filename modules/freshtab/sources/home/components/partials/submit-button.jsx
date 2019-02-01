import React from 'react';
import PropTypes from 'prop-types';

function Submit({
  className,
  disabled,
  label,
  onClick,
}) {
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="submit"
    >
      {label}
    </button>
  );
}
Submit.propTypes = {
  className: PropTypes.string.isRequired,
  disabled: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
};

export default Submit;
