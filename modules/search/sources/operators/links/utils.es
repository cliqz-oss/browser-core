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

const convertMainLinkToHistorySubLink = link => ({
  ...link,
  kind: ['C', ...link.kind],
  meta: {
    ...link.meta,
    level: 1,
    type: 'history',
  }
});

const revertHistorySubLinkToMainLink = link => ({
  ...link,
  kind: link.kind.slice(1),
  meta: {
    ...link.meta,
    level: 0,
    type: 'main',
  }
});

const getMainLink = ({ links }) => links
  .slice(0, 1)
  .find(({ meta: { type } }) => type === 'main');

export {
  getDuplicateLinks,
  hasMainLink,
  mapLinksByUrl,
  convertMainLinkToHistorySubLink,
  revertHistorySubLinkToMainLink,
  getMainLink
};
