import { fetchLocal } from 'platform/fetch';
export default function () {
  return fetchLocal('core/logo-database.json').then(response => response.json());
}
