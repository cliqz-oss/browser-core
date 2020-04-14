import { products, getResourceUrl } from '../utils';

/* eslint-disable import/prefer-default-export */
export function transform(data = {}) {
  const payload = {
    config: {
      url: getResourceUrl({ filename: 'reminder.html' }),
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
