import config from '../core/config';

const isGhosteryTab = config.settings.channel && config.settings.channel.startsWith('GT');

export default {
  features: {
  },
  settings: {
    BASE_URL: config.baseURL,
    NEW_TAB_URL: config.settings.NEW_TAB_URL,
    TRIQZ_URL: config.settings.TRIQZ_URL,
    ONBOARDING_URL: config.settings.ONBOARDING_URL,
    BRAND: isGhosteryTab ? 'Ghostery' : 'Cliqz',
    PRIVACY_POLICY_URL: config.settings.PRIVACY_POLICY_URL,
    USER_SUPPORT_URL: (
      isGhosteryTab
        ? config.settings.SUPPORT_URL
        : `${config.settings.FEEDBACK}${config.EXTENSION_VERSION}-${config.settings.channel}`
    ),
    LOCATION_SHARING_URL: config.settings.LOCATION_SHARING_URL,
    MYOFFRZ_URL: config.settings.MYOFFRZ_URL,
    SHOW_POWERED_BY: !isGhosteryTab,
    REPORT_SITE_URL: config.settings.REPORT_SITE_URL,
  },
};
