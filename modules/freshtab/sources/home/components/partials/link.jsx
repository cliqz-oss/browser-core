/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
  target,
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
      target={target}
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
  target: PropTypes.string,
};

export default Link;
