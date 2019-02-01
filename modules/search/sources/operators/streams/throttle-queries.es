import { pipe, interval as rxInterval } from 'rxjs';
import { throttle, distinct } from 'rxjs/operators';

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
  throttle(() => rxInterval(interval), { trailing: true, leading: true }),
  distinct(),
);
