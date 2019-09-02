/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import console from '../core/console';
import prefs from '../core/prefs';
import platformTelemetry from '../platform/telemetry';
import inject, { ifModuleEnabled } from '../core/kord/inject';
import random from '../core/crypto/random';
import { getConfigTs } from './time';
import pltfrm from '../platform/platform';

function getPlatformConstants() {
  if (pltfrm.platformName === 'firefox') {
    return {
      platform: '',
      userAgent: 'firefox'
    };
  }
  if (pltfrm.platformName === 'webextension') {
    let userAgent = '';
    if (pltfrm.isFirefox) {
      userAgent = 'firefox';
    } else if (pltfrm.isChromium) {
      userAgent = 'chrome';
    } else if (pltfrm.isEdge) {
      userAgent = 'edge';
    }
    return {
      platform: pltfrm.isMobile ? 'mobile' : '',
      userAgent,
    };
  }
  return {
    platform: '',
    userAgent: '',
  };
}

function msgSanitize(msg, channel) {
  if (prefs.get('ff-experiment', null)) {
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
      console.log('No telemetry provider loaded', 'attrack');
      return;
    }
    payl.platform = this.platform;
    payl.userAgent = this.userAgent;

    if (this.providerName.startsWith('hpn')) {
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
    console.log(`Load telemetry provider: ${provider}`, 'attrack');
    this.providerName = provider;
    this.channel = channel;
    const { platform, userAgent } = getPlatformConstants();
    this.platform = platform;
    this.userAgent = userAgent;
    if (provider === 'platform') {
      this.telemetry = platformTelemetry.telemetry.bind(platformTelemetry);
      this.msgType = platformTelemetry.msgType;
      return Promise.resolve(this);
    }
    this.provider = inject.module(provider);
    return undefined;
  }
};
