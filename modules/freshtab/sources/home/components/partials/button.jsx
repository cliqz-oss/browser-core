/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
  tabIndex,
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
      tabIndex={tabIndex === undefined ? '-1' : tabIndex}
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
  tabIndex: PropTypes.string,
  title: PropTypes.string,
  value: PropTypes.string,
};

export default Button;
