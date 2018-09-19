export function generateDataOn(amo) {
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
      'anti-phishing': {
        visible: true,
        active: true,
        isWhitelisted: true,
        state: 'active'
      },
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    amo: amo,
    compactView: false,
    showPoweredBy: true,
  };
}

export function generateDataOffSite(amo) {
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
      'anti-phishing': {
        visible: true,
        active: true,
        isWhitelisted: true,
        state: 'inactive'
      },
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    amo: amo,
    compactView: false
  };
}

export function generateDataOffAll(amo) {
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
      'anti-phishing': {
        visible: true,
        active: false,
        isWhitelisted: false,
        state: 'critical'
      },
    },
    generalState: 'active',
    feedbackURL: 'https://cliqz.com/feedback/1.19.0.dev-40',
    amo: amo,
    compactView: false,
    showPoweredBy: true,
  };
}
