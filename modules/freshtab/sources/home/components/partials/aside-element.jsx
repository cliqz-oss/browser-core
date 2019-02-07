import React from 'react';
import PropTypes from 'prop-types';

import Button from './button';

function AsideElement({
  condition,
  href,
  id,
  isAndOperator,
  isButton,
  label,
  onClick,
  title,
}) {
  const returnedEl = isButton
    ? (
      <Button
        id={id}
        label={label}
        onClick={onClick}
        title={title}
      />
    )
    : (
      <a
        href={href}
        id={id}
        onClick={onClick}
        title={title}
        tabIndex="-1"
      >
        {label}
      </a>
    );

  return isAndOperator
    ? condition && returnedEl
    : condition || returnedEl;
}

AsideElement.propTypes = {
  condition: PropTypes.bool,
  href: PropTypes.string,
  id: PropTypes.string,
  isAndOperator: PropTypes.bool,
  isButton: PropTypes.bool,
  label: PropTypes.string,
  onClick: PropTypes.func,
  title: PropTypes.string,
};

AsideElement.defaultProps = {
  isAndOperator: true,
  isButton: false,
};

export default AsideElement;
