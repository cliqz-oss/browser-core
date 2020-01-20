/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import logos from '../core/services/logos';
import { getCleanHost, parse } from '../core/url';

export default class SpeedDial {
  constructor({ url, title = '', isCustom = true }) {
    const details = parse(url);
    const logoDetails = logos.getLogoDetails(url);
    this.title = url;
    const displayTitle = title;
    this.url = url;
    this.displayTitle = displayTitle || getCleanHost(details) || url;
    this.custom = isCustom;
    this.logo = logoDetails;
  }
}
