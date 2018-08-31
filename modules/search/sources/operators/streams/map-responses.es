import Rx from '../../../platform/lib/rxjs';

const { map } = Rx.operators;

export default (operator, config) => map(({ responses, ...result }) => ({
  ...result,
  responses: responses.map(response => operator(response, config)),
}));
