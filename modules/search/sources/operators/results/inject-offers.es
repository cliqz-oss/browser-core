import { getMainLink } from '../normalize';

const injectNonOrganicOffers = (results, offers, config) => {
  if (offers.length === 0 || !config.operators.offers.isEnabled) {
    return results;
  }
  const offer = offers[0];

  if (!getMainLink(offer).extra.has_injection) {
    const { nonOrganicPosition } = config.operators.offers;
    if (nonOrganicPosition === 'first') {
      return [offer, ...results];
    }
    return [...results, offer];
  }
  return results;
};

const injectSmartCliqzOffer = (results, offer, config) => {
  const oldResults = {
    results,
    isInjected: false,
  };
  if (!offer || !config.operators.offers.isEnabled) {
    return oldResults;
  }
  const injectedIds = getMainLink(offer).extra.injected_ids;
  if (!injectedIds) {
    return oldResults;
  }

  let matched = false;

  const mergedResults = results.map((result) => {
    const mainLink = getMainLink(result);
    const type = mainLink.type;
    const otherLinks = result.links.filter(link => link !== mainLink);
    const domain = mainLink.meta.domain;
    if (injectedIds[domain] && !matched && type === 'rh') {
      matched = true;
      return {
        links: [
          {
            ...mainLink,
            extra: {
              ...mainLink.extra,
              offers_data: {
                ...getMainLink(offer).extra.offers_data,
                is_injected: true,
              },
            },
          },
          ...otherLinks,
        ],
      };
    }

    return result;
  });

  if (matched) {
    return {
      results: mergedResults,
      isInjected: true,
    };
  }

  return oldResults;
};

export { injectNonOrganicOffers, injectSmartCliqzOffer };
