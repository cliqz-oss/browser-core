/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UAParser from '../platform/lib/ua-parser';
import {
  getCountry,
  getInstallDate,
  getUserAgent,
} from '../platform/demographics';

import {
  CONFIG_TS_FORMAT,
  dateToDaysSinceEpoch,
  daysSinceEpochToDate,
  formattedToDate,
  isConfigTsDate,
} from '../core/helpers/date';
import Logger from '../core/logger';
import getSynchronizedDate from '../core/synchronized-time';
import inject from '../core/kord/inject';
import prefs from '../core/prefs';

const logger = Logger.get('anolysis', {
  level: 'log',
  prefix: '[demographics]',
});

const ARCHITECTURE = new Set([
  'amd64',
  'i386',
  'x86_64',
]);

const BSD_OS = new Set([
  'FreeBSD',
  'NetBSD',
  'OpenBSD',
  'DragonFly',
]);


const LINUX_OS = new Set([
  'Arch',
  'CentOS',
  'Fedora',
  'Debian',
  'Gentoo',
  'GNU',
  'Mageia',
  'Mandriva',
  'Mint',
  'RedHat',
  'Slackware',
  'SUSE',
  'Ubuntu',
  'VectorLinux',
]);

const ANOLYSIS_BACKEND_DATE_FORMAT = 'YYYY/MM/DD';


export function normalizeString(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function parseCountry(country) {
  return country || '';
}


function parseInstallDate(rawInstallDate) {
  if (isConfigTsDate(rawInstallDate)) {
    // This install date has been initialized using `config_ts` from backend
    return formattedToDate(rawInstallDate, CONFIG_TS_FORMAT).format(ANOLYSIS_BACKEND_DATE_FORMAT);
  }

  // Else, this is the legacy format: number of days since epoch
  const integerRawInstallDate = parseInt(rawInstallDate, 10);
  const currentDaysSinceEpoch = dateToDaysSinceEpoch(getSynchronizedDate());
  if (integerRawInstallDate >= 16129 && integerRawInstallDate <= currentDaysSinceEpoch) {
    const installDate = daysSinceEpochToDate(integerRawInstallDate);
    if (installDate.isValid()) {
      return installDate.format(ANOLYSIS_BACKEND_DATE_FORMAT);
    }
  }

  // Fallback to 'Other' bucket to indicate an invalid install date
  return `Other/${rawInstallDate}`;
}

export function parseOS(agent) {
  let platform = `Other/${agent}`;
  if (agent === 'ios') {
    platform = 'Mobile/iOS';
  } else if (agent === 'android') {
    platform = 'Mobile/Android';
  } else if (agent) {
    const uaParser = new UAParser();
    uaParser.setUA(agent);

    // Possible osFamily:
    // AIX, Amiga OS, Android, Arch, Bada, BeOS, BlackBerry, CentOS, Chromium OS, Contiki,
    // Fedora, Firefox OS, FreeBSD, Debian, DragonFly, Gentoo, GNU, Haiku, Hurd, iOS,
    // Joli, Linpus, Linux, Mac OS, Mageia, Mandriva, MeeGo, Minix, Mint, Morph OS, NetBSD,
    // Nintendo, OpenBSD, OpenVMS, OS/2, Palm, PCLinuxOS, Plan9, Playstation, QNX, RedHat,
    // RIM Tablet OS, RISC OS, Sailfish, Series40, Slackware, Solaris, SUSE, Symbian, Tizen,
    // Ubuntu, UNIX, VectorLinux, WebOS, Windows [Phone/Mobile], Zenwalk
    const { name: osName, version: osVersion } = uaParser.getOS();

    // Indicate if we should append osVersion to platform
    let shouldAppendVersion = false;

    if (osName === 'Windows') {
      platform = 'Desktop/Windows';
      shouldAppendVersion = true;
    } else if (osName === 'Mac OS') {
      platform = 'Desktop/Mac OS';
      shouldAppendVersion = true;
    } else if (BSD_OS.has(osName)) {
      platform = `Desktop/BSD/${osName}`;
    } else if (osName === 'Linux' || osName === 'linux') {
      platform = 'Desktop/Linux';
    } else if (LINUX_OS.has(osName)) {
      platform = `Desktop/Linux/${osName}`;
      shouldAppendVersion = true;
    } else if (osName === 'Android') {
      platform = 'Mobile/Android';
      shouldAppendVersion = true;
    } else if (osName === 'iOS') {
      platform = 'Mobile/iOS';
      shouldAppendVersion = true;
    } else if (osName !== undefined) {
      platform = `Other/${osName}`;
    }

    // Ignore architecture and truncate version if needed
    if (shouldAppendVersion && !ARCHITECTURE.has(osVersion) && osVersion !== undefined) {
      // Only keep first part of the version by splitting on first space
      // eg: 10.6 Leopard, we are only interested in 10.6 here.
      let splittedVersion;
      if (osVersion.indexOf(' ') !== -1) {
        splittedVersion = osVersion.split(' ', 1)[0].split('.');
      } else {
        splittedVersion = osVersion.split('.');
      }

      if (splittedVersion.length > 2) {
        splittedVersion = splittedVersion.slice(0, 2);
      }

      platform = `${platform}/${splittedVersion.join('.').trim()}`;
    }
  }
  logger.debug('platform', platform);
  return platform;
}

// From: https://dbc-b9274afe-9aca.cloud.databricks.com/#notebook/1738945/
const PKCAMPAIGN_TO_CHANNEL = [
  ['adperio-', 'Adperio'],
  ['ap', 'Android Pit'],
  ['androidpit-', 'Android Pit'],
  ['bi', 'Bing'],
  ['bilpapp_', 'Bing Mobile'],
  ['bilp', 'Bing Mobile'],
  ['bu', 'Browser Upgrade'],
  ['c', 'CHIP'],
  ['web', 'CLIQZ Website'],
  ['mobile_de', 'CLIQZ Website'],
  ['mobile_en', 'CLIQZ Website'],
  ['mobile_fr', 'CLIQZ Website'],
  ['cb', 'Computer Bild'],
  ['cp', 'Cyberport'],
  ['fb', 'Facebook'],
  ['fb_', 'Facebook'],
  ['fromblogpost', undefined], // Added to remove ambiguity
  ['f', 'Focus'],
  ['focusonline-', 'Focus'],
  ['galp', 'galp'], // Added to remove ambiguity
  ['ga', 'Google'],
  ['adwords-', 'Google Mobile'],
  ['adwords_', 'Google Mobile'],
  ['adwords-test-', 'Google Mobile'],
  ['adwords-video-', 'Google Mobile'],
  ['ha', 'Heise'],
  ['lovoo-', 'Lovoo'],
  ['lovoo-test-', 'Lovoo'],
  ['ms', 'Meinestadt'],
  ['tn', 'T3N'],
  ['t3n-', 'T3N'],
  ['cliqz', 'testing'],
  ['tw', 'Twitter'],
  ['xx', undefined], // Added to remove ambiguity
  ['x', 'Xing'],
  ['xi', 'Xing'],
  ['xing-', 'Xing'],
  ['yt_', 'YouTube'], // Added to remove ambiguity
  ['y', 'Yahoo'],
  ['ironsrc_', 'ironSource'],
  ['ffc', 'Firefox CHIP'],
  ['ffcc', 'Firefox CHIP'],
  ['null', undefined], // Added to remove ambiguity
  ['ns', 'Netzsieger'],
  ['motive_', 'Motive'],
  ['motive-', 'Motive'],
  ['instagram_test', 'Instagram'],
];

function safeDecodeKeyword(keyword) {
  try {
    return decodeURIComponent(keyword);
  } catch (ex) {
    return keyword;
  }
}

function normalizeKeyword(keyword) {
  return safeDecodeKeyword(keyword).replace(/[+]+/g, ' ').trim();
}

function decodeChannel(pkCampaign) {
  for (const [prefix, channel] of PKCAMPAIGN_TO_CHANNEL) {
    if (pkCampaign.startsWith(prefix)) {
      return channel;
    }
  }

  return undefined;
}

/**
 * Given a raw 'full_distribution' value of the form keyword=<keyword>&pk_campaign=<PREFIX ID>.
 */
function parseFullDistribution(fullDistribution) {
  const KEYWORD_PREFIX = 'keyword=';
  const PKCAMPAIGN_PREFIX = 'pk_campaign=';

  let pkCampaign;
  let keyword;
  let channel;
  let id;

  const distribution = fullDistribution.toLowerCase();
  for (const part of distribution.split(/[&]/g)) {
    if (part.startsWith(KEYWORD_PREFIX)) {
      keyword = normalizeKeyword(part.slice(KEYWORD_PREFIX.length));
    } else if (part.startsWith(PKCAMPAIGN_PREFIX)) {
      pkCampaign = part.slice(PKCAMPAIGN_PREFIX.length);
    }
  }

  if (pkCampaign) {
    channel = decodeChannel(pkCampaign);
    id = pkCampaign;
  }

  return {
    channel,
    id,
    keyword,
  };
}

/**
 * Given full_distribution create a final 'campaign' demographic of the form: /Channel/Id/Keywords.
 */
export function parseCampaign(fullDistribution) {
  const parts = [];

  if (fullDistribution) {
    const { channel, id, keyword } = parseFullDistribution(fullDistribution);
    if (channel) {
      parts.push(channel);

      if (id) {
        parts.push(id);

        if (keyword) {
          parts.push(keyword);
        }
      }
    } else {
      parts.push('other', fullDistribution);
    }
  }

  return parts.map(normalizeString).join('/');
}

/**
 * Product is made of provided information from build config. This means that no
 * information is inferred from user agent or channel. This function only makes
 * sure to handle corner cases where not all information is provided as well as
 * some normalization of string values.
 */
export function parseProduct(configDemographics = {}) {
  const { brand, name, platform } = configDemographics;

  const parts = [];

  if (brand) {
    parts.push(brand);

    // Can only have 'name' if 'brand' is also specified
    if (name) {
      parts.push(name);

      // Can only have 'platform' if 'brand' + 'name' are specified
      if (platform) {
        parts.push(platform);
      }
    }
  }

  return parts.map(normalizeString).join('/');
}

export function parseExtension(extensionVersion) {
  if (!extensionVersion) {
    return '';
  }

  return extensionVersion.split(/[.]/g).slice(0, 3).map(normalizeString).join('/');
}

export function parseBrowser({ userAgent, distributionVersion }) {
  const parts = [];

  if (distributionVersion) {
    parts.push('cliqz', ...distributionVersion.split(/[.]/g).slice(0, 3));
  } else if (userAgent) {
    const uaParser = new UAParser();
    uaParser.setUA(userAgent);
    const { name, version } = uaParser.getBrowser();
    if (name) {
      parts.push(name);

      if (version) {
        parts.push(...version.split(/[.]/g).slice(0, 3));
      }
    }
  }

  return parts.map(normalizeString).join('/');
}

export default async function getDemographics(appVersion, productDemographics) {
  return {
    campaign: parseCampaign(prefs.get('full_distribution')),
    country: normalizeString(parseCountry(await getCountry())),
    install_date: normalizeString(parseInstallDate(await getInstallDate())),
    product: parseProduct(productDemographics),
    extension: parseExtension(appVersion),
    browser: await parseBrowser({
      distributionVersion: await inject.service('host-settings', ['get']).get('distribution.version', ''),
      userAgent: await getUserAgent(),
    }),
    os: normalizeString(parseOS(await getUserAgent())),
  };
}

export async function getInstallDateAsDaysSinceEpoch() {
  const installDate = await getInstallDate();
  return (
    isConfigTsDate(installDate)
      ? dateToDaysSinceEpoch(formattedToDate(installDate, CONFIG_TS_FORMAT))
      : installDate
  );
}

export async function getDaysSinceInstall() {
  const currentDaysSinceEpoch = dateToDaysSinceEpoch(getSynchronizedDate());
  return currentDaysSinceEpoch - (await getInstallDateAsDaysSinceEpoch());
}
