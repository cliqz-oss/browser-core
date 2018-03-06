/* eslint no-param-reassign: 'off' */

import CliqzSecureMessage from './main';

/*
Converts given array to generator like object.
*/
export function trkGen(_trk) {
  const trk = _trk;
  let idx = -1;
  return {
    next() {
      idx += 1;
      if (idx < trk.length) {
        return {
          value: idx, // Return the first yielded value.
          done: false,
        };
      }
      return {
        value: undefined, // Return undefined.
        done: true,
      };
    },
  };
}


export function prunelocalTemporalUniq() {
  if (CliqzSecureMessage.localTemporalUniq
    && Object.keys(CliqzSecureMessage.localTemporalUniq).length > 0) {
    const currTime = Date.now();
    Object.keys(CliqzSecureMessage.localTemporalUniq).forEach((e) => {
      const d = CliqzSecureMessage.localTemporalUniq[e].ts;
      const diff = (currTime - d);
      if (diff >= (24 * 60 * 60 * 1000)) {
        delete CliqzSecureMessage.localTemporalUniq[e];
      }
    });
    /*
    if(CliqzHumanWeb.actionStats) {
        const itemsLocalValidation = Object.keys(CliqzSecureMessage.localTemporalUniq).length;
        CliqzHumanWeb.actionStats.itemsLocalValidation = itemsLocalValidation;
    }
    */
  }
}

export function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * ((max - min) + 1)) + min;
}
