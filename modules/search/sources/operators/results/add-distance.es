import utils from '../../../core/utils';

export default results => results.map(result => ({
  ...result,
  links: result.links.map((link) => {
    if (
      !link.extra ||
      !link.extra.lat ||
      !link.extra.lon ||
      (
        typeof link.extra.distance === 'number' &&
        link.extra.distance > -1
      )
    ) {
      return link;
    }

    const distance = utils.distance(link.extra.lon, link.extra.lat) * 1000;
    return {
      ...link,
      extra: {
        ...link.extra,
        distance,
      },
    };
  }),
}));
