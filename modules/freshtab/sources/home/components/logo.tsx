/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

const Logo: React.FunctionComponent<{
  logo: {
    backgroundColor: string;
    backgroundImage: string;
    color: string;
    text: string;
  };
}> = ({
  logo: {
    backgroundColor,
    backgroundImage,
    color,
    text,
  },
}) => {
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
        )}
    </div>
  );
};

export default Logo;
