const Funnel = require('broccoli-funnel');
const build = require('./Brocfile.ghostery-mobile');

// Output
module.exports = new Funnel(build, {
  exclude: ['**/vendor/'],
});
