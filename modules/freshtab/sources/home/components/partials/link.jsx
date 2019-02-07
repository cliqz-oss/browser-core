import React from 'react';
import PropTypes from 'prop-types';

function Link({
  children,
  className,
  href,
  idx,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <a
      className={className}
      data-index={idx}
      href={href}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      tabIndex="-1"
    >
      {children}
    </a>
  );
}
Link.propTypes = {
  className: PropTypes.string,
  href: PropTypes.string.isRequired,
  idx: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default Link;
