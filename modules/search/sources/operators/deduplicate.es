const deduplicate = (results) => {
  const urls = new Map();

  return results
    .map(({ links, ...result }) => ({
      ...result,
      links: links.filter(({ meta: { url } }) => {
        const isDuplicate = urls.has(url);
        urls.set(url);
        return !isDuplicate;
      }),
    }))
    // remove results without 'main' link
    .filter(({ links }) =>
      links.some(({ meta: { type } }) => type === 'main'));
};

/*
 * Removes duplicate URL within a single respone. For example, to remove
 * the same URL occuring once with http and once with https.
 *
 * @param {Object} response - The response.
 */
export default ({ results, ...response }) => ({
  ...response,
  results: deduplicate(results),
});
