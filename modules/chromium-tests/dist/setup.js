/* global Mocha */

function TAP(runner, opts) {
  Mocha.reporters.HTML.call(this, runner);

  const options = opts || {};
  const title = this.title.bind(this);
  const log = this.log.bind(this);

  let n = 1;
  let passes = 0;
  let failures = 0;

  this.prefix = options.prefix || 'TAP: ';

  runner.on('start', () => {
    const total = runner.grepTotal(runner.suite);
    log(1, '..', total);
  });

  runner.on('test end', () => {
    n += 1;
  });

  runner.on('pending', (test) => {
    // log('ok %d %s # SKIP -', n, title(test));
    log('ok ', n, ' ', title(test), ' # SKIP -');
  });

  runner.on('pass', (test) => {
    passes += 1;
    // log('ok %d %s', n, title(test));
    log('ok ', n, ' ', title(test));
  });

  runner.on('fail', (test, err) => {
    failures += 1;
    // log('not ok %d %s', n, title(test));
    log('not ok ', n, ' ', title(test));
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
    log('END');
  });
}


TAP.prototype = Object.assign({}, Mocha.reporters.HTML.prototype, {
  title(test) {
    return test.fullTitle().replace(/#/g, '');
  },
  log(...args) {
    const msg = `${this.prefix} ${args.join('')}`;
    console.error(msg);
  }
});


mocha.setup({
  ui: 'bdd',
  reporter: TAP,
  ignoreLeaks: true,
});

window.TESTS = {};
