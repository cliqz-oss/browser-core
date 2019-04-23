import UAParser from '../platform/lib/ua-parser';
import {
  getChannel,
  getCountry,
  getDistribution,
  getInstallDate,
  getUserAgent,
} from '../platform/demographics';
import {
  CONFIG_TS_FORMAT,
  dateToDaysSinceEpoch,
  daysSinceEpochToDate,
  formattedToDate,
  isConfigTsDate,
} from './helpers/date';

import Logger from './logger';
import getSynchronizedDate from './synchronized-time';

export { getChannel } from '../platform/demographics';

const logger = Logger.get('core', {
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


export function parsePlatform(agent) {
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


function parseProduct(channel, platform) {
  let product = `Other/${channel || ''}`; // Default value

  try {
    // Try to convert channel to an int
    // channel < 40 is extension.
    let intChannel = null;
    try {
      intChannel = Number(channel);
    } catch (ex) {
      /* Ignore if the channel is not an integer */
    }

    // TODO: Should we create a set of possible values at the top of the file?
    if (channel === '40') {
      const prefix = 'CLIQZ/desktop';
      // Desktop browser
      if (platform.includes('Windows')) {
        product = `${prefix}/Cliqz for Windows`;
      } else if (platform.includes('Mac')) {
        product = `${prefix}/Cliqz for Mac OS`;
      } else {
        product = `${prefix}/Cliqz for Linux`;
      }
    } else if (intChannel !== null && intChannel < 40) {
      // Navigation extension
      product = 'CLIQZ/add-on/Cliqz for Firefox';
    } else if (channel === 'MA10') {
      product = 'third-party/mobile/Telefonica';
    } else if (channel.startsWith('MA')) {
      if (channel.startsWith('MA5')) {
        product = 'Ghostery/mobile/Ghostery for Android';
      } else {
        product = 'CLIQZ/mobile/Cliqz for Android';
      }
    } else if (channel.startsWith('MI')) {
      if (channel.startsWith('MI5')) {
        product = 'Ghostery/mobile/Ghostery for iOS';
      } else if (channel.startsWith('MI6')) {
        product = 'Lumen/mobile/Lumen for iOS';
      } else {
        product = 'CLIQZ/mobile/Cliqz for iOS';
      }
    } else if (channel === 'CH50') {
      product = 'third-party/desktop/Avira Scout';
    } else if (channel === 'CT10') {
      product = 'CLIQZ/desktop/CliqzTab for Chrome';
    } else if (channel === 'GT00') {
      product = 'Ghostery/desktop/GhosteryTab for Firefox';
    } else if (channel === 'GT10') {
      product = 'Ghostery/desktop/GhosteryTab for Chrome';
    } else if (channel === 'MO00') {
      product = 'MyOffrz/desktop/Standalone for Firefox';
    } else if (channel === 'MO10') {
      product = 'MyOffrz/desktop/Standalone for Chrome';
    } else if (channel === 'MO02') {
      product = 'MyOffrz/desktop/Standalone Test';
    }
    logger.debug('product', product);
    return product;
  } catch (ex) {
    /* Wrong data for product */
    return product;
  }
}


function parseCampaign(distribution) {
  return distribution;
}

export default async function getDemographics() {
  const platform = parsePlatform(await getUserAgent());
  return {
    country: normalizeString(parseCountry(await getCountry())),
    campaign: normalizeString(parseCampaign(await getDistribution())),
    install_date: normalizeString(parseInstallDate(await getInstallDate())),
    platform: normalizeString(platform),
    product: normalizeString(parseProduct(await getChannel(), platform)),
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
