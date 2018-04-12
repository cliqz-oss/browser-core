// creates url => link lookup map
const mapLinksByUrl = links => new Map(
  links.map(link => [link.meta.url, link])
);

// returns list of links whose URL occurs in both
// target and reference; takes links from target
const getDuplicateLinks = (target, reference) => {
  const urls = mapLinksByUrl(reference);

  return target
    .filter(({ meta: { url } }) => urls.has(url));
};

const hasMainLink = ({ links }) => links
  .slice(0, 1)
  .some(({ meta: { type } }) => type === 'main');

export { getDuplicateLinks, hasMainLink, mapLinksByUrl };
