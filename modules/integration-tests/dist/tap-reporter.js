/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global Mocha */

function TAP(runner) {
  Mocha.reporters.HTML.call(this, runner);

  const title = this.title.bind(this);

  // Use websocket to transmit test results to runner
  const socket = new WebSocket('ws://localhost:3001');
  let messages = [];

  const WS_OPEN = 1;
  const log = (message, mtype = 'tap') => {
    if (socket.readyState === WS_OPEN) {
      socket.send(JSON.stringify({ [mtype]: message }));
      if (mtype === 'tap') {
        log(`${message}\n`, 'log');
      }
    } else {
      messages.push(message);
    }
  };

  // Send logging to `fern.js`
  this.logChannel = new BroadcastChannel('extlog');
  this.logChannel.onmessage = (msg) => {
    const s = `${msg.data.level || 'unk'} - ${msg.data.msg || ''}\n`;
    log(s, 'log');
  };

  socket.addEventListener('open', () => {
    messages.forEach(log);
    messages = [];
  });

  let n = 1;
  let passes = 0;
  let failures = 0;

  runner.on('start', () => {
    const total = runner.grepTotal(runner.suite);
    log(`1..${total}`);
  });

  runner.on('test end', () => {
    n += 1;
  });

  runner.on('pending', (test) => {
    log(`ok ${n} ${title(test)} # SKIP -`);
  });

  runner.on('pass', (test) => {
    passes += 1;
    log(`ok ${n} ${title(test)}`);
  });

  runner.on('fail', (test, err) => {
    failures += 1;
    log(`not ok ${n} ${title(test)}`);
    if (err.stack) {
      log(err.stack.replace(/^/gm, '  '));
    }
    if (err.message) {
      log(err.message.replace(/^/gm, '  '));
    }
  });

  runner.on('end', () => {
    log(`# tests ${passes + failures}`);
    log(`# pass ${passes}`);
    log(`# fail ${failures}`);
    if (socket.readyState === WS_OPEN) {
      socket.send(JSON.stringify({ action: 'END' }));
    }
  });
}


TAP.prototype = Object.assign({}, Mocha.reporters.HTML.prototype, {
  title(test) {
    return test.fullTitle().replace(/#/g, '');
  },
});
