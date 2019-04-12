import random from '../helpers/random';
import prefs from '../prefs';
import getSynchronizedDate, { isSynchronizedDateAvailable } from '../synchronized-time';
import { dateToDaysSinceEpoch } from '../helpers/date';
import { getChannel } from '../demographics';
import inject from '../kord/inject';

const saveSession = (sessionString) => {
  prefs.set('session', sessionString);
  prefs.set('session', sessionString, 'host.');
};

const getSession = () => prefs.get('session');

function getDay() {
  return Math.floor(new Date().getTime() / 86400000);
}

export function service() {
  if (!prefs.has('session')) {
    // Get number of days since epoch either from config_ts if available
    // (through `getSynchronizedDate`) or fallback to the `Date` API (which
    // is dependent on the timezone of the system).
    const installDate = (isSynchronizedDateAvailable()
      ? dateToDaysSinceEpoch(getSynchronizedDate())
      : getDay()
    );

    const session = [
      random(18),
      random(6, '0123456789'),
      '|',
      installDate,
      '|',
      getChannel() || 'NONE',
    ].join('');

    saveSession(session);

    if (!prefs.has('freshtab.state')) {
      // freshtab is opt-out since 2.20.3
      prefs.set('freshtab.state', true);
    }
  }

  return {
    saveSession,
    getSession,
  };
}

export default inject.service('sessions', ['getSession']);
