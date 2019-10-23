/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

const ThemeContext = React.createContext(null);

export const Provider = ThemeContext.Provider;

export const withStyles = styles => Component => props => (
  <ThemeContext.Consumer>
    { theme => (
      <Component
        classes={typeof styles === 'function' ? styles(theme) : styles}
        {...props}
      />
    )}
  </ThemeContext.Consumer>
);
