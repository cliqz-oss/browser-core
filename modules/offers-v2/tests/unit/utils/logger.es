module.exports = {
  'offers-v2/common/offers_v2_logger': {
    default: {
      debug: (...x) => { console.debug(...x); },
      error: (...x) => { console.error(...x); },
      info: (...x) => { console.info(...x); },
      log: (...x) => { console.log(...x); },
      warn: (...x) => { console.warn(...x); },
      logObject: (...x) => { console.log(...x); },
    }
  },
};
