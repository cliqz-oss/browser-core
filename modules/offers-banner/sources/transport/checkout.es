import { send } from './index';

const REAL_ESTATE_ID = 'offers-checkout';

export function actions(data = {}) {
  const msg = { origin: REAL_ESTATE_ID, data, type: 'actions' };
  send(msg, 'checkout');
}

export function log(data = {}) {
  const msg = { origin: REAL_ESTATE_ID, data, type: 'log' };
  send(msg, 'checkout');
}
