import moment from '../platform/lib/moment';
import UAParser from '../platform/lib/ua-parser';
import {
  getChannel,
  getDistribution,
  getInstallDate,
  getUserAgent
} from '../platform/demographics';

import Logger from './logger';
import getSynchronizedDate from './synchronized-time';

const logger = Logger({
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


const CHANNELS = {
  CHIP: new Set(['01', '02', '06', '07', '08', '20', '21', '22']),
  MOBILE: new Set(['MA00', 'MA02', 'MA10', 'MA12', 'MI00', 'MI01', 'MI02']),
  CLIQZ: new Set(['00', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '40']),
  COMPUTER_BILD: new Set(['23']),
  FACEBOOK: new Set(['30']),
  AMO: new Set(['04']),
  SOFTRONIC: new Set(['03']),
  FOCUS: new Set([]),
  APP_STORE: new Set(['MI00']),
  PLAY_STORE: new Set(['MA00']),
};


function isString(value) {
  return (typeof value === 'string' || value instanceof String);
}


function normalizeString(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}


// TODO: define 'campaign'
function parseDemographics(signal) {
  const uaParser = new UAParser();
  logger.debug('parse demographics');
  const channel = signal.channel;

  // ---------------------------------------------------------------------- //
  // Parse distribution
  // ---------------------------------------------------------------------- //
  let distribution = `Other/c=${channel || ''} d=${signal.distribution || ''}`;
  if (signal.distribution !== undefined && isString(signal.distribution)) {
    const rawDistribution = signal.distribution;

    // TODO: Use brands.json to generate/update this data
    // TODO: Make this implementation nicer by using a loop and extraction the
    // data about each distribution separately.
    if (CHANNELS.COMPUTER_BILD.has(channel) || (channel === '40' && rawDistribution.startsWith('CB0'))) {
      // TODO: Check interval CB0001
      distribution = 'third-party/portal/ComputerBild';
    } else if (CHANNELS.CHIP.has(channel) || (channel === '40' && rawDistribution.startsWith('C0'))) {
      // TODO: Check interval: C0001-C0022
      distribution = 'third-party/portal/Chip';
    } else if (CHANNELS.FOCUS.has(channel) || (channel === '40' && rawDistribution.startsWith('F0'))) {
      // TODO: Check interval: F0001-F0009
      distribution = 'third-party/portal/Focus';
    } else if (channel === '40' && rawDistribution.startsWith('BU0')) {
      // TODO: Check interval: BU0001-BU0003
      distribution = 'third-party/portal/BrowserUpdate';
    } else if (channel === '40' && rawDistribution.startsWith('TW0')) {
      // TODO: Check interval: TW0001-TW0020
      distribution = 'third-party/portal/Twitter';
    } else if (channel === '40' && rawDistribution.startsWith('AP0')) {
      // TODO: Check interval: AP0001
      distribution = 'third-party/portal/Androidpit';
    } else if (channel === '40' && rawDistribution.startsWith('TN0')) {
      // TODO: Check interval: TN0001-TN0002
      distribution = 'third-party/portal/T3N';
    } else if (channel === '40' && rawDistribution.startsWith('XI0')) {
      // TODO: Check interval: XI0001-XI0002
      distribution = 'third-party/portal/Xing';
    } else if (channel === '40' && rawDistribution.startsWith('BI0')) {
      // TODO: Check interval: BI0001-BI0040
      distribution = 'third-party/portal/Bing';
    } else if (channel === '40' && rawDistribution.startsWith('Y0')) {
      // TODO: Check interval: Y0001-Y0020
      distribution = 'third-party/portal/Yahoo';
    } else if (channel === '40' && rawDistribution.startsWith('GA0')) {
      // TODO: Check interval: GA0001-GA0120
      distribution = 'third-party/portal/Google_AdWords';
    } else if (channel === '40' && rawDistribution.startsWith('FB0')) {
      // TODO: Check interval: FB0001-FB0055
      distribution = 'third-party/portal/Facebook';
    } else if (channel === '40' && rawDistribution.startsWith('MS0')) {
      // TODO: Check interval: MS0001-MS0002
      distribution = 'third-party/portal/Meinestadt';
    } else if (channel === '40' && rawDistribution.startsWith('HA0')) {
      // TODO: Check interval: HA0001-HA0002
      distribution = 'third-party/portal/Heise';
    } else if (channel === '40' && rawDistribution.startsWith('MSI0')) {
      // TODO: What is the interval here?
      distribution = 'third-party/portal/MSI_Installer';
    } else if (CHANNELS.SOFTRONIC.has(channel)) {
      distribution = 'third-party/portal/Softonic';

    // CLIQZ
    } else if (rawDistribution.startsWith('web0001')) {
      distribution = 'CLIQZ/website';
    } else if (rawDistribution.startsWith('web01')) {
      distribution = 'CLIQZ/website (old)';
    } else if (rawDistribution.startsWith('cliqz')) {
      distribution = 'CLIQZ/testing';

    // third-party/app store
    } else if (rawDistribution === '' && CHANNELS.AMO.has(channel)) {
      distribution = 'third-party/app store/AMO';
    } else if (CHANNELS.PLAY_STORE.has(channel)) {
      distribution = 'third-party/app store/PlayStore';
    } else if (rawDistribution === '' && CHANNELS.APP_STORE.has(channel)) {
      distribution = 'third-party/app store/AppStore';
    }
  }

  logger.debug(`distribution ${JSON.stringify(distribution)}`);

  // ---------------------------------------------------------------------- //
  // Parse installDate
  // ---------------------------------------------------------------------- //
  let installDate = `Other/${signal.install_date || ''}`;
  if (signal.install_date) {
    const installDateMs = signal.install_date * 86400000;
    const momentInstallDate = moment(installDateMs);
    // This date format is expected by the gid backend. '/' is used as a
    // separator to split demographics into sub-trees. Do not use another
    // format there.
    installDate = momentInstallDate.format('YYYY/MM/DD');
    const currentDate = getSynchronizedDate();
    if (signal.install_date < 16129 || momentInstallDate.isAfter(currentDate, 'day')) {
      // Some install date are not possible and should be considered as
      // outlier:
      // - In the past (before Cliqz existed)
      // - In the future
      installDate = `Other/${installDate}`;
    }
  }
  logger.debug(`installDate ${JSON.stringify(installDate)}`);

  // ---------------------------------------------------------------------- //
  // Parse platform
  // ---------------------------------------------------------------------- //
  let platform = `Other/${signal.agent}`;
  if (signal.agent === 'ios') {
    platform = 'Mobile/iOS';
  } else if (signal.agent === 'android') {
    platform = 'Mobile/Android';
  } else if (signal.agent) {
    uaParser.setUA(signal.agent);

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
  logger.debug(`platform ${JSON.stringify(platform)}`);

  // ---------------------------------------------------------------------- //
  // Parse product
  // ---------------------------------------------------------------------- //
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
    } else if (CHANNELS.PLAY_STORE.has(channel)) {
      product = 'CLIQZ/mobile/Cliqz for Android';
    } else if (CHANNELS.APP_STORE.has(channel)) {
      product = 'CLIQZ/mobile/Cliqz for iOS';
    } else if (channel === 'CH50') {
      product = 'third-party/desktop/Avira Scout';
    } else if (channel === 'MA10') {
      product = 'third-party/mobile/Telefonica';
    }

    logger.debug(`product ${JSON.stringify(product)}`);
  } catch (ex) {
    /* Wrong data for product */
    logger.error(`exception ${ex} ${ex.stack}`);
  }

  // ---------------------------------------------------------------------- //
  // Parse campaign
  // ---------------------------------------------------------------------- //
  // TODO: This factor is not yet clearly defined.

  return {
    // NOTE: AB Tests will be sent separately, and should not be
    // part of the GID of a user. The reason is that the combinations
    // are most of the time unique (or with low cardinality), and will
    // be discarded by the safe reporting algorithm.
    // abtests,
    distribution: normalizeString(distribution),
    install_date: normalizeString(installDate),
    platform: normalizeString(platform),
    product: normalizeString(product),
  };
}


/**
 * Returns the demographics of a user in a cross-platform way, in a format that
 * is expected and understood by modules such as `anolysis` and `abtests`.
 */
export default function getDemographics() {
  return Promise.all([
    getChannel(),
    getUserAgent(),
    getDistribution(),
    getInstallDate(),
  ]).then(([channel, userAgent, distribution, installDate]) =>
    parseDemographics({
      channel,
      distribution,
      install_date: installDate,
      agent: userAgent,
    })
  );
}
