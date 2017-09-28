import CliqzCalculator from '../../autocomplete/calculator';
import Rx from '../../platform/lib/rxjs';
import BaseProvider from './base';

const empty = {
  results: [],
  state: 'done',
};

export default class Calculator extends BaseProvider {
  constructor() {
    super('calculator');
    CliqzCalculator.init();
  }

  search(query) {
    if (!query) {
      return this.empty;
    }

    const result = CliqzCalculator.isCalculatorSearch(query) &&
      CliqzCalculator.calculate(query);

    if (!result) {
      return Rx.Observable.from([empty]);
    }
    result.provider = 'calculator';
    result.template = 'calculator';

    return Rx.Observable
      .from([{
        results: [result],
        state: 'done',
        provider: this.id,
      }])
      .delay(1);
  }
}
