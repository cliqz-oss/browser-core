/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

const Profiler = React.unstable_Profiler;

export default function ProfilerComponent({ children, id, isEnabled, timer }) {
  const loggingFunction = (_id, phase, _, baseTime) => {
    timer.updateRenderTimer({ name: _id, value: baseTime });
  };

  if (isEnabled) {
    return (
      <Profiler
        id={id}
        onRender={loggingFunction}
      >
        {children}
      </Profiler>
    );
  }

  return <React.Fragment>{children}</React.Fragment>;
}
