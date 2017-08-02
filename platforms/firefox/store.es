/* globals Store */
import { Components } from './globals';
import config from '../core/config';

Components.utils.import(`${config.baseURL}store.jsm`);

export default Store.state;
