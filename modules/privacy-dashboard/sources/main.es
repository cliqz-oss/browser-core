import Signals from './signals';

const PrivacyRep = {
  openingStreamCount: 0,

  onExtensionStart(settings) {
    Signals.init(settings);
  },

  unload() {
  },

  registerStream() {
    if (PrivacyRep.openingStreamCount === 0) {
      Signals.startListening();
    }

    PrivacyRep.openingStreamCount += 1;
    Signals.setStreaming(true);
  },

  unregisterStream() {
    PrivacyRep.openingStreamCount -= 1;
    if (PrivacyRep.openingStreamCount <= 0) {
      PrivacyRep.openingStreamCount = 0;
      Signals.setStreaming(false);
      Signals.stopListening();
    }
  },

  getCurrentData() {
    return Signals.getSignalsToDashboard();
  }
};

export default PrivacyRep;
