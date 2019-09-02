/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import PropTypes from 'prop-types';
import { requireNativeComponent, ViewPropTypes } from 'react-native';

const componentInterface = {
  name: 'NativeDrawable',
  propTypes: {
    source: PropTypes.string,
    color: PropTypes.string,
    ...ViewPropTypes // include the default view properties
  },
};

export default requireNativeComponent('NativeDrawable', componentInterface);

export function normalizeUrl(url = '', options = {}) {
  const prefix = options.isNative ? '' : 'ic_ez_';
  return prefix + url.slice(url.lastIndexOf('/') + 1, -4).replace(/-/g, '_');
}
