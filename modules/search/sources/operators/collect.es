/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import merge from './merge';

/*
 * Similar to `operators/merge`, but can be directly used with RX's `scan`
 * to collect incoming responses by one provider into one respone.
 *
 * @param {Object} current - The current response.
 * @param {Object[]} incoming - The list of incoming responses.
 */
export default (current, incoming) => merge([current, ...incoming]);
