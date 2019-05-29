import config from '../../core/config';
import { fetch } from '../fetch';

export default function () {
  const url = `${config.baseURL}core/logo-database.json`;
  return fetch(url).then(response => response.json());
}
