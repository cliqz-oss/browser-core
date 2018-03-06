/*
 * Partially updates a list of responses to reduce flickering.
 */
export default function (results$) {
  // TODO: mark responses with state 'outdated' if they don't match the current query.
  return results$
    .scan((current, incoming) => current
      .map((cur, i) => {
        const next = incoming[i];
        if (next.state === 'pending' && next.results.length === 0) {
          return cur;
        }
        return next;
      })
    );
}
