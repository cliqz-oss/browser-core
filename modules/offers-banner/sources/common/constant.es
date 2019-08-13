import config from '../../core/config';

export const ONBOARDING_URL = config.settings.ONBOARDING_URL;
export const ONBOARDING_URL_DEBUG = `${ONBOARDING_URL}?debug=true`;
export const OFFBOARDING_URL = config.settings.OFFBOARDING_URL;
export const DISTRIBUTION_STORES = [
  {
    // eg: https://addons.mozilla.org/en-US/firefox/addon/myoffrz/?src=external-test
    host: 'addons.mozilla.org',
    queryUtmSource: 'src',
    addonMatcher: `/firefox/addon/${config.settings.storeName || 'myoffrz'}/`
  },
  {
    // eg: https://chrome.google.com/webstore/detail/myoffrz/eoofgbeobdepdoihpmogabekjddpcbei?utm_source=chrome-ntp-icon
    host: 'chrome.google.com',
    queryUtmSource: 'utm_source',
    addonMatcher: `/webstore/detail/${config.settings.storeName || 'myoffrz/eoofgbeobdepdoihpmogabekjddpcbei'}`
  }
];

export const DISTRIBUTION_CHANNELS = new Map([
  ['external-chip', 'chip'],
  ['external-focus', 'focus'],
]);

export const DISTROS_TO_SESSION = {
  chip: 'C',
  focus: 'F'
};
