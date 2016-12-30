/* global Handlebars */
import utils from 'core/utils';

export default {
  local(...args) {
    const name = args.shift();
    return utils.getLocalizedString.apply(null, [name, args]);
  },
};
