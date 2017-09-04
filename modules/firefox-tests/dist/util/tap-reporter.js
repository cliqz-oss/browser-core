function TAP (runner, opts) {
  Mocha.reporters.HTML.call(this, runner);

  var options = opts || {};
  var n = 1;
  var passes = 0;
  var failures = 0;
  var title = this.title.bind(this)
  var log = this.log.bind(this);

  this.prefix = options.prefix || 'TAP: ';

  runner.on('start', function () {
    var total = runner.grepTotal(runner.suite);
    log(1, '..', total);
  });

  runner.on('test end', function () {
    ++n;
  });

  runner.on('pending', function (test) {
    // log('ok %d %s # SKIP -', n, title(test));
    log('ok ', n, ' ', title(test), ' # SKIP -');
  });

  runner.on('pass', function (test) {
    passes++;
    // log('ok %d %s', n, title(test));
    log('ok ', n, ' ', title(test));
  });

  runner.on('fail', function (test, err) {
    failures++;
    // log('not ok %d %s', n, title(test));
    log('not ok ', n, ' ', title(test));
    if (err.stack) {
      log(err.stack.replace(/^/gm, '  '));
    }
    if (err.message) {
      log(err.message.replace(/^/gm, '  '));
    }
  });

  runner.on('end', function () {
    log('# tests ' + (passes + failures));
    log('# pass ' + passes);
    log('# fail ' + failures);
  });
}

TAP.prototype = Object.assign({}, Mocha.reporters.HTML.prototype, {
  title: function title (test) {
    return test.fullTitle().replace(/#/g, '');
  },
  log: function () {
    var args = Array.prototype.slice.apply(arguments);
    var msg = this.prefix + ' ' + args.join('') + '\n';
    try {
      var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
      aConsoleService.logStringMessage(msg);
    } finally {
      dump(msg);
    }
  }
});
