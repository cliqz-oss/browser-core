import console from './console';


/**
 * No-op function.
 */
function noop() {}


function multiArgsDump(...args) {
  if (args.length > 0) {
    dump(args[0]);

    for (let i = 1; i < args.length; i += 1) {
      dump(' ');
      dump(args[i]);
    }

    dump('\n');
  }
}


export default function Logger(options) {
  const useDump = options.useDump === true;
  const level = options.level || 'log';
  const prefix = options.prefix;

  let debug = console.debug;
  let log = console.log;
  let error = console.error;

  if (useDump) {
    debug = multiArgsDump.bind(null, '[DEBUG]');
    log = multiArgsDump.bind(null, '[LOG]');
    error = multiArgsDump.bind(null, '[ERROR]');
  }

  if (prefix) {
    debug = debug.bind(null, prefix);
    log = log.bind(null, prefix);
    error = error.bind(null, prefix);
  }

  if (level === 'log') {
    debug = noop;
  }

  if (level === 'error') {
    debug = noop;
    log = noop;
  }

  return {
    debug,
    log,
    error,
  };
}
