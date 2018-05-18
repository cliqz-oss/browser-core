import utils from '../../../core/utils';

export default results => results.map(result => ({
  ...result,
  links: result.links.map(link => ({
    ...link,
    meta: {
      ...link.meta,
      logo: utils.getLogoDetails(utils.getDetailsFromUrl(link.url)),
    },
  }))
}));
