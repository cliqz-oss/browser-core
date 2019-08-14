import { getResourceUrl } from '../../core/platform';
import { products } from '../utils';

/* eslint-disable import/prefer-default-export */
export function transform(data = {}) {
  const payload = {
    config: {
      url: getResourceUrl('offers-reminder/index.html?cross-origin'),
      type: 'offers-reminder',
      styles: {
        animation: data.state === 'new',
        isHidden: ['new', 'minimize'].includes(data.state),
      },
      products: products(),
    },
    data: { ...data, view: data.state, products: products() },
  };
  return [true, payload];
}
/* eslint-enable import/prefer-default-export */
