/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

const getClassName = visible => (visible ? 'welcome-layout visible' : 'welcome-layout');

export default function WelcomeLayout({
  visible,
}) {
  return (
    <div className={getClassName(visible)} />
  );
}
