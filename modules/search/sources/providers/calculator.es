/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { from } from 'rxjs';
import { delay } from 'rxjs/operators';
import CliqzCalculator from './calculator/internal';
import BaseProvider from './base';
import { getResponse } from '../responses';

export default class Calculator extends BaseProvider {
  constructor() {
    super('calculator');
    CliqzCalculator.init();
  }

  search(query, config) {
    if (!query) {
      return this.getEmptySearch(config);
    }

    const result = CliqzCalculator.isCalculatorSearch(query)
      && CliqzCalculator.calculate(query);

    if (!result) {
      return this.getEmptySearch(config, query);
    }
    result.provider = 'calculator';
    result.text = query;

    return from([
      getResponse({
        provider: this.id,
        config,
        query,
        results: [result],
        state: 'done'
      })
    ])
      .pipe(
        delay(1),
        this.getOperators()
      );
  }
}
