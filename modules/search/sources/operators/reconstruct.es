const groupAsMap = (a, b) =>
  a.set(b.meta.type, [...(a.get(b.meta.type) || []), b]);

const groupAsArray = array => [
  ...array
    .reduce(groupAsMap, new Map())
    .entries()
];

/*
 * Reconstruct a normalized result into its legacy format for rendering.
 * Opposite of `oeprators/normalize`.
 *
 * @param {Object} result - The normalized result.
 */
const reconstruct = ({ links }) => {
  const main = links.find(({ meta: { type } }) => type === 'main') || {};
  const history = links.filter(({ meta: { type } }) => type === 'history');
  const rest = links.filter(({ meta: { type } }) => type !== 'main' && type !== 'history');

  const result = {
    ...main,
    data: {
      deepResults: groupAsArray(rest)
        .map(([type, sublinks]) => ({ type, links: sublinks })),
      extra: main.extra,
      kind: main.kind,
      template: main.template,
      suggestion: main.suggestion,
    },
  };

  // if empty `urls` is added results render as history
  if (history.length > 0) {
    result.data.urls = history;
  }

  return result;
};

export default reconstruct;
