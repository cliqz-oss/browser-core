var Testem  = require('testem');

var testem = new Testem();

testem.startCI({
  host: 'localhost',
  port: '4200'
}, function(exitCode) {
  process.exit();
});
