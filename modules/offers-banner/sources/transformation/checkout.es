import { products, getResourceUrl } from '../utils';

/* eslint-disable import/prefer-default-export */
export function transform(data = {}) {
  const payload = {
    config: {
      url: getResourceUrl('offers-checkout'),
      type: 'offers-checkout',
      styles: {
        fullscreen: data.view === 'checkout',
      },
      products: products(),
    },
    data: { ...data, products: products() },
  };
  return [true, payload];
}
/* eslint-enable import/prefer-default-export */
