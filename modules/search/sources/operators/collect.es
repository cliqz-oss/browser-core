import merge from './merge';

/*
 * Similar to `operators/merge`, but can be directly used with RX's `scan`
 * to collect incoming responses by one provider into one respone.
 *
 * @param {Object} current - The current response.
 * @param {Object[]} incoming - The list of incoming responses.
 */
export default (current, incoming) => merge([current, ...incoming]);
