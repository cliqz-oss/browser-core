/* eslint no-param-reassign: ["error", { "props": false }] */
import { fetch, Request, Headers } from '../core/http';
import logger from './common/offers_v2_logger';
import OffersConfigs from './offers_configs';

/**
 * this module will be used to perform queries to the BE and fetch triggers
 * We can in the future implement some cache system here so we store the triggers
 * locally with a given TTL. This will also perform better.
 */
export default class BEConnector {
  /**
   * performs the query for the given endpoint and params.
   * If the query performs correctly we will return the parsed json result as
   * the resolved argument of the promise.
   * Otherwise the error message will be returned on the reject method
   * @param  {[type]} endpoint [description]
   * @param  {[type]} params   [description]
   * @return {Promise}          [description]
   */
  sendApiRequest(endpoint, params) {
    logger.info('backend_connector', 'sendApiRequest called');

    return new Promise((resolve, reject) => {
      // we will always set the engine version as argument
      params.t_eng_ver = OffersConfigs.TRIGGER_ENGINE_VERSION;
      const url = this._buildUrl(endpoint, params);

      // TODO: we can check for cached results here if needed. Not for now

      logger.info('backend_connector', `url called: ${url}`);
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      const request = new Request(url, { headers, method: 'POST' });

      return fetch(request).then((response) => {
        if (response.ok) {
          resolve(response.json());
        } else {
          reject(`Status code ${response.status} for ${url}`);
        }
      });
    });
  }

  _buildUrl(endpoint, params) {
    return `${OffersConfigs.BACKEND_URL}/api/v1/${endpoint}?`.concat(
      Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&')
    );
  }
}
