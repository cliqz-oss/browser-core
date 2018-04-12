import CliqzCalculator from './calculator/internal';
import Rx from '../../platform/lib/rxjs';
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

    const result = CliqzCalculator.isCalculatorSearch(query) &&
      CliqzCalculator.calculate(query);

    if (!result) {
      return this.getEmptySearch(config, query);
    }
    result.provider = 'calculator';

    return Rx.Observable
      .from([getResponse(this.id, config, query, [result], 'done')])
      .delay(1)
      .let(this.getOperators(config, query));
  }
}
