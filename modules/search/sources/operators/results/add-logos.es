import Logos from '../../../core/services/logos';

let kickerLogo = null;
function getKickerLogo() {
  if (kickerLogo) {
    return kickerLogo;
  }
  kickerLogo = Logos.getLogoDetails('https://kicker.de');
  return kickerLogo;
}

export default results => results.map(result => ({
  ...result,
  links: result.links.map(link => ({
    ...link,
    meta: {
      ...link.meta,
      logo: link.url && Logos.getLogoDetails(link.url),
      extraLogos: {},
      externalProvidersLogos: {
        kicker: getKickerLogo(),
      }
    },
  }))
}));
