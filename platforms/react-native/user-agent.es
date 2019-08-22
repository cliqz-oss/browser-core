/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Platform, NativeModules } from 'react-native';

const ua = {
  OS: Platform.OS,
  Version: Platform.Version,
  isTesting: Platform.isTesting,
  formFactor: Platform.isPad ? 'Tablet' : 'Phone',
  channel: undefined,
  installDate: '',
  appName: '',
};

if (NativeModules.UserAgentConstants) {
  if (NativeModules.UserAgentConstants.isTablet) {
    ua.formFactor = 'Tablet';
  }
  ua.channel = NativeModules.UserAgentConstants.channel;
  ua.appVersion = NativeModules.UserAgentConstants.appVersion;
  ua.installDate = NativeModules.UserAgentConstants.installDate;
  ua.appName = NativeModules.UserAgentConstants.appName;
}

export default ua;
