/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import switchEndianness4Byte from './crypto-utils';
import { fromBase64 } from '../core/encoding';
import SecVm from './secvm';

const Network = {
  /**
   * Constructs an object out of the content of a website that contains pure
   * JSON.
   * @param {string} url the url to read from
   * @return {Promise<Object>} an object constructed from the JSON at url
   */
  getObjectFromJsonWebsite(url) {
    /*
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'json';
      // TODO: maybe remove this, depending on the further implementation (if
      // the server reuses urls or not)
      request.channel.loadFlags |= // eslint-disable-line no-bitwise
        NetworkFlags.BYPASS_CACHE;
      request.onload = () => {
        const status = request.status;
        if (status === 200) {
          resolve(request.response);
        } else {
          reject();
        }
      };
      request.send();
    });
    */

    // We are using HPN for communication.
    return new Promise((resolve, reject) => {
      SecVm.hpn.action('sendInstantMessage', url, '')
        .then((response) => {
          // Need to check once, what is the correct structure.
          resolve(response);
        }).catch(() => {
          reject();
        });
    });
  },

  // TODO: maybe make this function return a Promise or accept a callback to
  // inform the caller about success/failure; investigate how this affects
  // performance
  /**
   * Sends an object as JSON to the indicated URL.
   * @param {Object} data the object to be sent
   * @param {string} url the url the object should be sent to
   */
  sendJsonPackage(data, url) {
    /*
    const request = new XMLHttpRequest();
    request.open('POST', url, true);
    request.setRequestHeader('Content-type', 'application/json');
    request.send(JSON.stringify(data));
    // SecVm.log(JSON.stringify(data));
    */
    SecVm.hpn.action('sendPostMessage', url, '/', 'secvm-api', JSON.stringify(data), (response) => {
      SecVm.log(response);
    });
  },

  /**
   * Loads a weight vector from a url where it is present as a Base64 and big
   * endian encoded Float32Array.
   * @param {string} url the url to load the vector from
   * @return {Promise<Float32Array>} the decoded weight vector
   */
  getWeightVector(url) {
    return Network.getObjectFromJsonWebsite(url).then(data =>
      new Float32Array(
        switchEndianness4Byte(fromBase64(data.weights))
          .buffer)
    );
  }
};

export default Network;
