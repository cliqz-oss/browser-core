import { hasMainLink } from '../links/utils';


/**
  Removes duplicate URL within a results. For example, to remove
  the same URL occuring once with http and once with https.
*/
export default (results) => {
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
    .filter(hasMainLink);
};
