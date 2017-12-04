const startup = require('./modules/platform/startup').default;
const components = require('./components');

module.exports = {
  startup,
  components: components.default,
};
