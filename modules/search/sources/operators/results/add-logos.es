import utils from '../../../core/utils';
import { getDetailsFromUrl } from '../../../core/url';

export default results => results.map(result => ({
  ...result,
  links: result.links.map(link => ({
    ...link,
    meta: {
      ...link.meta,
      logo: utils.getLogoDetails(getDetailsFromUrl(link.url)),
    },
  }))
}));
