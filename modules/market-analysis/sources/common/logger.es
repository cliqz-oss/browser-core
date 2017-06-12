import Logger from '../../core/logger';
import MAConfigs from '../conf/ma_configs';

/**
 * the only logger you should use in this module
 * Methods: logger.debug, logger.log, logger.err, logger.logObject
 * @type {Logger}
 */
const logger = new Logger({
  useDump: false,
  level: 'log',
  prefix: '[market-analysis]'
});

logger.logObject = (obj) => {
  if (MAConfigs.IS_LOGGING_ENABELD) {
    // log object while keeping its state
    // since this is an expensive operation, we do it only if logging is enabled
    logger.debug(JSON.parse(JSON.stringify(obj)));
  }
};

export default logger;
