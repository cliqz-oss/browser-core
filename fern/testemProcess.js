/* global require */
/* global process */

const Testem = require('testem');
const testem = new Testem();

process.on('message', msg => {
  if (msg.cmd === 'start') {
    testem.startDev(msg.options);
  } else if (msg.cmd === 'restart') {
    testem.restart();
  }
});
