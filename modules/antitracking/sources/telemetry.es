/* eslint no-param-reassign: 'off' */

import { utils } from '../core/cliqz';
import platformTelemetry from '../platform/telemetry';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import random from '../core/crypto/random';
import { getConfigTs } from './time';

function msgSanitize(msg, channel) {
  if (utils.getPref('ff-experiment', null)) {
    msg.channel = 'ff-experiment';
  } else {
    msg.channel = channel;
  }
  try {
    msg.ts = getConfigTs();
  } catch (ee) {
    return undefined;
  }

  if (!msg.ts) {
    return undefined;
  }

  msg['anti-duplicates'] = Math.floor(random() * 10000000);
  return msg;
}


export default {
  telemetry(payl) {
    if (!this.provider) {
      utils.log('No telemetry provider loaded', 'attrack');
      return;
    }

    if (this.providerName === 'hpn') {
      // sending payload directly through hpn,
      // this is used in ghostery since humanweb is not always there
      // and we need to do add meta data that humanweb added
      payl = msgSanitize(payl, this.channel);
      if (payl) {
        ifModuleEnabled(this.provider.action('sendTelemetry', payl));
      }
    } else {
      ifModuleEnabled(this.provider.action('telemetry', payl));
    }
  },

  provider: null,
  providerName: null,
  msgType: 'humanweb',
  channel: null,

  loadFromProvider(provider, channel) {
    utils.log(`Load telemetry provider: ${provider}`, 'attrack');
    this.providerName = provider;
    this.channel = channel;
    if (provider === 'platform') {
      this.telemetry = platformTelemetry.telemetry.bind(platformTelemetry);
      this.msgType = platformTelemetry.msgType;
      return Promise.resolve(this);
    }
    this.provider = inject.module(provider);
    return undefined;
  }
};
