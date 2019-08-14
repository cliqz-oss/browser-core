import { send } from './index';

const REAL_ESTATE_ID = 'offers-reminder';

/* eslint-disable import/prefer-default-export */
export function actions(data = {}) {
  const msg = { origin: REAL_ESTATE_ID, data };
  send(msg, 'reminder');
}
/* eslint-enable import/prefer-default-export */
