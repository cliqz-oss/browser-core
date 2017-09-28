import 'babel-polyfill';

const startup = require('./modules/platform/startup');
const components = require('./components');

module.exports = {
  startup: startup.default,
  components: components.default,
};
