export default function (amo) {
  return {
    activeURL: 'http://www.spiegel.de/',
    friendlyURL: 'http://www.spiegel.de/',
    isSpecialUrl: false,
    domain: 'spiegel.de',
    extraUrl: '',
    hostname: 'www.spiegel.de',
    module: {
      'offers-v2': {
        visible: true,
        userEnabled: true,
        locationEnabled: true,
      }
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    amo: amo,
    compactView: false,
    privacyPolicyURL: 'privacy_policy_url',
    showPoweredBy: true,
    showLearnMore: true,
  };
}
