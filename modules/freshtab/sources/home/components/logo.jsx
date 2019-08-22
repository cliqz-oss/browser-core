/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

function Logo({
  logo: {
    backgroundColor,
    backgroundImage,
    color,
    text
  }
}) {
  const hasBgImage = backgroundImage !== undefined;
  return (
    <div>
      { hasBgImage
        ? (
          <div
            className="logo"
            style={{
              color,
              textIndent: '-1000em',
              backgroundImage,
              backgroundColor: `#${backgroundColor}`,
            }}
          >
            { text }
          </div>
        )
        : (
          <div
            className="logo"
            style={{
              color,
              backgroundColor: `#${backgroundColor}`,
            }}
          >
            { text}
          </div>
        )
      }
    </div>
  );
}

Logo.propTypes = {
  logo: PropTypes.shape({
    color: PropTypes.string,
    backgroundImage: PropTypes.string,
    backgroundColor: PropTypes.string,
    text: PropTypes.string,
  }),
};

export default Logo;
