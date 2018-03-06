/* eslint global-require: 0 */
import utils from '../core/utils';

export default function () {
  utils.setLogoDb(require('../core/logo-database.json'));
}
