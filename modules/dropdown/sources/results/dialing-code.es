/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GenericResult from './generic';
import config from '../../core/config';

export default class DialingCodeResult extends GenericResult {
  get template() {
    return 'dialing-code';
  }

  get _extra() {
    return this.rawResult.data.extra || {};
  }

  get countryName() {
    return this._extra.country_name;
  }

  get dialingCode() {
    return this._extra.dialing_prefix;
  }

  get countryFlag() {
    return this._extra.flag_uri;
  }

  get phoneIcon() {
    return `${config.baseURL}dropdown/images/phone-icon.svg`;
  }

  get selectableResults() {
    return [];
  }
}
