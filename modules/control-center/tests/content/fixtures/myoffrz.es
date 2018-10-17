export default function (amo) {
  return {
    activeURL: 'http://www.spiegel.de/',
    friendlyURL: 'http://www.spiegel.de/',
    isSpecialUrl: false,
    domain: 'spiegel.de',
    extraUrl: '',
    hostname: 'www.spiegel.de',
    module: {
      antitracking: {
        visible: false,
      },
      'offers-v2': {
        visible: true,
        userEnabled: true,
        locationEnabled: true,
      }
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    locationSharingURL: 'https://cliqz.com/support/local-results',
    myoffrzURL: 'https://cliqz.com/myoffrz',
    reportSiteURL: 'https://cliqz.com/report-url',
    amo: amo,
    compactView: false,
    showPoweredBy: true,
  };
}
