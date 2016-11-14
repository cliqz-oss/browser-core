import moment from 'platform/moment';
import UAParser from 'platform/ua-parser';

export default class {
  constructor(settings = { channel: 99 }) {
    this.idComponents = ['type', 'action'];
    this.uaParser = new UAParser();
    this.settings = settings;
  }

  process(signal) {
    if (!this.isLegacy(signal)) {
      return signal;
    }

    // TODO: add special handling for specific signal types
    const copy = {};
    if (this.isDemographics(signal)) {
      signal = this.parseDemographics(signal);
      copy.id = '_demographics';
    } else {
      copy.id = this.getId(signal);
    }
    Object.keys(signal).forEach((key) => {
      // don't copy keys that are part of the id or keys with object value
      if (this.idComponents.indexOf(key) === -1 && !this.isObject(signal[key])) {
        copy[key] = signal[key];
      }
    });
    return copy;
  }

  getId(signal) {
    return this.idComponents
      .map(c => c in signal ? signal[c] : 'na')
      .join('_');
  }

  isObject(value) {
    return value !== null && typeof value === 'object';
  }

  isLegacy(signal) {
    if (!signal.v) {
      return true;
    }
    const majorVersion = signal.v.toString().split('.')[0];
    return majorVersion < 3;
  }

  // TODO: make sure no exception can be thrown and always returns bool
  isDemographics(signal) {
    return signal.type === 'environment';
  }

  // TODO: add test
  parseDemographics(signal) {
    const copy = Object.assign({}, signal);

    copy.channel = this.settings.channel;

    if (copy.install_date) {
      copy.install_date = moment(copy.install_date * 86400000)
        .format('YYYYDDMM');
    }

    // TODO: implement numeric histogram/decision tree
    // map to logarithmic scale
    if (copy.history_days) {
      copy.history_days = Math.pow(10, Math.floor(Math.log10(copy.history_days))).toString();
    }

    if (copy.agent) {
      this.uaParser.setUA(copy.agent);
      let { name: osName, version: osVersion } = this.uaParser.getOS();
      // make compatible with server-side UA parser
      if (osName === 'Mac OS' && osVersion.startsWith('10')) {
        osVersion = 'X';
      }
      copy.os = `${osName} ${osVersion}`;
      delete copy.agent;
    }

    if (!copy.prefs) {
      return copy;
    }

    const prefsToKeep = [
      'humanWeb',
      'ABTests',
      'dnt',
    ];
    prefsToKeep.forEach((pref) => {
      if (copy.prefs[pref]) {
        copy[`prefs.${pref}`] = copy.prefs[pref];
      }
    });
    delete copy.prefs;
    return copy;
  }
}
