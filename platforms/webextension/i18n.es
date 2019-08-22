/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { chrome } from './globals';
import config from '../core/config';

export const loadTranslation = () => {};
export const locale = {};
export const LOCALE_PATH = null;
export const IMPLEMENTS_GET_MESSAGE = true;
export const getMessage = (key = '', sub) => chrome.i18n.getMessage(key, sub);
export const SUPPORTED_LANGS = config.settings.SUPPORTED_LANGS || ['de', 'en', 'fr'];
