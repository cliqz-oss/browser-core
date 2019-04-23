import inject from '../../../core/kord/inject';

export default results => results.map(result => ({
  ...result,
  links: result.links.map((link) => {
    if (
      !link.extra
      || !link.extra.lat
      || !link.extra.lon
      || (
        typeof link.extra.distance === 'number'
        && link.extra.distance > -1
      )
    ) {
      return link;
    }

    let distance = -1;
    try {
      distance = inject.service('geolocation', ['distance']).distance(link.extra.lon, link.extra.lat);
    } catch (ex) {
      /* No geolocation available */
    }

    if (distance !== -1) {
      return {
        ...link,
        extra: {
          ...link.extra,
          distance: distance * 1000,
        },
      };
    }

    return link;
  }),
}));
