import { pipe } from 'rxjs';
import { map } from 'rxjs/operators';

export default (operator, config) => pipe(map(({ responses, ...result }) => ({
  ...result,
  responses: responses.map(response => operator(response, config)),
})));
