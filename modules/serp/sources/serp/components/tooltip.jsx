/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default (props = {}) => {
  const text = props.text || '';
  const cssClasses = props.cssClasses || [
    'tooltip', 'tooltip-above'
  ];

  if (!text) {
    return null;
  }

  return (
    <div
      className={cssClasses.join(' ')}
    >
      {text}
    </div>
  );
};
