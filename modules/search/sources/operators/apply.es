/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * Applies an operator to all results of the given response.
 *
 * @param {Object} response - The response.

 */
const apply = ({ results, ...response }, operator) => ({
  results: results.map(operator),
  ...response,
});

export default apply;
