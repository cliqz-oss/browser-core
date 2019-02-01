import React from 'react';
import PropTypes from 'prop-types';

function Button({
  className,
  disabled,
  href,
  id,
  label,
  onClick,
  onKeyPress,
  title,
  value,
}) {
  const returnEl = (href !== undefined)
    ? <span className="overflow-hidden">label</span> // pagination
    : label;

  return (
    <button
      className={className}
      disabled={disabled}
      href={href}
      id={id}
      onClick={onClick}
      onKeyPress={onKeyPress}
      tabIndex="-1"
      title={title}
      type="button"
      value={value}
    >
      {returnEl}
    </button>
  );
}
Button.propTypes = {
  className: PropTypes.string,
  disabled: PropTypes.bool,
  href: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  onClick: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
  title: PropTypes.string,
  value: PropTypes.string,
};

export default Button;
