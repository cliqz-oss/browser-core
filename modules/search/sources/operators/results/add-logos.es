import Logos from '../../../core/services/logos';
import { getDetailsFromUrl } from '../../../core/url';

const URL_KEYS = ['website', 'url'];

function getUrls(obj) {
  const list = [];
  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key) => {
      if (URL_KEYS.includes(key) && typeof obj[key] === 'string') {
        list.push(obj[key]);
      }
      list.push(...getUrls(obj[key]));
    });
  }
  return list;
}

function getExtraLogos(extra = {}) {
  const extraLogos = Object.create(null);
  getUrls(extra).forEach((url) => {
    if (!extraLogos[url]) {
      extraLogos[url] = Logos.getLogoDetails(getDetailsFromUrl(url));
    }
  });
  return extraLogos;
}

export default results => results.map(result => ({
  ...result,
  links: result.links.map(link => ({
    ...link,
    meta: {
      ...link.meta,
      logo: link.url && Logos.getLogoDetails(getDetailsFromUrl(link.url)),
      extraLogos: getExtraLogos(link.extra)
    },
  }))
}));
