/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import CliqzCalculator from './calculator/internal';
import BaseProvider from './base';
import normalize from '../operators/normalize';

export default class Calculator extends BaseProvider {
  constructor() {
    super('calculator');
    CliqzCalculator.init();
  }

  search(query, config) {
    if (!query || CliqzCalculator.isCalculatorSearch(query) !== true) {
      return this.getEmptySearch(config, query);
    }

    // TODO - optimize this
    const result = CliqzCalculator.calculate(query);

    if (result === null) {
      return this.getEmptySearch(config, query);
    }

    result.provider = 'calculator';
    result.text = query;
    return this.getResultsFromArray(
      [normalize(result)],
      query,
      config,
    );
  }
}
