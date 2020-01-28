/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default function CommonLayout({
  visible,
  className,
}) {
  return (
    <div className={`app-layout ${className}${visible ? ' visible' : ''}`} />
  );
}
