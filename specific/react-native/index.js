const startup = require('./modules/platform/startup').default;
const App = require('./modules/core/app').default;
const components = require('./components');

module.exports = {
  App,
  startup,
  components: components.default,
};
