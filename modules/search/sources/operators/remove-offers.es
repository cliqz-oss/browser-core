import { getMainLink } from './normalize';

// EntityKPIEntityLocal or EntityKPIEntityGeneric
const renameClass = (currName) => {
  const splitted = currName.split('EntityKPI');
  if (splitted.length > 1) {
    return splitted[1];
  }
  return currName;
};

const isInjectedOffer = result =>
  result.extra && result.extra.offers_data
    && result.extra.offers_data.is_injected;

const removeInjectedOffers = (result) => {
  const mainLink = getMainLink(result);
  if (isInjectedOffer(mainLink)) {
    // TODO: do not alter object
    const finalClassName = renameClass(mainLink.meta.subType.class);
    mainLink.meta.subType.class = finalClassName;
    mainLink.kind[0] = 'X|{"class":"EntityKPI"}';
    delete mainLink.extra.offers_data;
  }
  return result;
};

const removeOffers = ({ results, ...response }) => ({
  results: results
    .filter(result => !getMainLink(result).extra.is_ad)
    .map(removeInjectedOffers),
  ...response,
});

export default removeOffers;
