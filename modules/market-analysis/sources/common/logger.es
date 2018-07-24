import Logger from '../../core/logger';
import MAConfigs from '../conf/ma_configs';

/**
 * the only logger you should use in this module
 * Methods: logger.debug, logger.log, logger.err, logger.logObject
 * @type {Logger}
 */
export default Logger.get('market-analysis', { level: MAConfigs.LOG_LEVEL });
