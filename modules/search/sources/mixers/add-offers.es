import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { getMainLink } from '../operators/normalize';
import { urlStripProtocol } from '../../core/url';

export const addOffer = (results, offer, config) => {
  const { position } = config.operators.offers;

  if (position === 'first') {
    return [offer, ...results];
  }

  return [...results, offer];
};

export const attachOffer = (results, offer) => {
  const [first, ...rest] = results;

  if (!first) {
    return [];
  }

  const mainLink = getMainLink(first);
  const offerMainLink = getMainLink(offer);

  if (mainLink.meta.url !== urlStripProtocol(offerMainLink.extra.target_url)) {
    return results;
  }

  const otherLinks = first.links.filter(link => link !== mainLink);

  const firstWithAttachedOffer = {
    ...first,
    links: [
      {
        ...mainLink,
        extra: {
          ...mainLink.extra,
          offers_data: {
            ...offerMainLink.extra.offers_data,
            is_injected: true,
          },
        },
      },
      ...otherLinks,
    ],
  };

  return [
    firstWithAttachedOffer,
    ...rest,
  ];
};

const mergeOfferAndResultResponses = (
  resultResponse,
  offerResponse,
  config,
  { allowStandalone = true },
) => {
  const { results } = resultResponse;
  const { results: offers } = offerResponse;
  const offer = offers[0];
  let resultsWithOffers = results;

  if (!offer || !config.operators.offers.isEnabled) {
    return resultResponse;
  }

  if (getMainLink(offer).extra.target_url) {
    resultsWithOffers = attachOffer(results, offer);
  } else if (allowStandalone) {
    resultsWithOffers = addOffer(results, offer, config);
  }

  return {
    ...resultResponse,
    results: resultsWithOffers,
  };
};

export default function (results$, offers$, config, options = {}) {
  return combineLatest(results$, offers$.pipe(startWith({ results: [] })))
    .pipe(
      map(([resultResponse, offerResponse]) =>
        mergeOfferAndResultResponses(resultResponse, offerResponse, config, options))
    );
}
