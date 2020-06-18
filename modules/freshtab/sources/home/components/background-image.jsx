/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';
import AppContext from './app-context';

export default function BackgroundImage({
  bg,
  index,
  isActive,
  onBackgroundImageChanged,
  src,
}) {
  const selectBackground = (product) => {
    onBackgroundImageChanged(bg, index, product);
  };

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <AppContext.Consumer>
      {
        ({ config }) => (
          <div
            className={`bg-thumbnail ${isActive ? 'active' : ''}`}
            onClick={() => selectBackground(config.product)}
            style={{ backgroundImage: `url(${src})` }}
            data-bg={bg}
          >
            <span className="selected-img">
              <img
                alt=""
                className="checkIcon"
                src="./images/bg-check.svg"
              />
            </span>
          </div>
        )
      }
    </AppContext.Consumer>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}

BackgroundImage.propTypes = {
  bg: PropTypes.string,
  isActive: PropTypes.bool,
  index: PropTypes.number,
  onBackgroundImageChanged: PropTypes.func,
  src: PropTypes.string,
};
