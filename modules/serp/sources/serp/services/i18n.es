/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import i18n from './translations';

const defaultLang = 'de';
export default (token, lang) => {
  const res = i18n[lang]
    ? i18n[lang][token]
    : i18n[defaultLang][token];

  return res;
};
