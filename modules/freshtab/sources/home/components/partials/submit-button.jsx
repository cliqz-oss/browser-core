/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
