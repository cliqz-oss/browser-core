import config from '../../core/config';
import { fetchLocal } from '../fetch';

export default function () {
  const url = `${config.baseURL}core/logo-database.json`;
  return fetchLocal(url).then(response => response.json());
}
