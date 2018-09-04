import Rx from '../../../platform/lib/rxjs';

const { throttle, distinct } = Rx.operators;
const { pipe } = Rx;

/**
 * Factory for the `throttleQueries` operator, which throttles a user's input.
 *
 * @function getThrottleQueries
 * @param {Object} config - The configuration.
 */
export default ({
  operators: {
    streams: {
      throttleQueries: {
        interval = 10,
      } = {},
    } = {},
  } = {},
} = {}) => pipe(
  throttle(() => Rx.Observable.interval(interval), { trailing: true, leading: true }),
  distinct(),
);
