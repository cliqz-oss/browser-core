import PrivacyRep from 'privacy-dashboard/main';

export default {

  init() {
    PrivacyRep.onExtensionStart();
  },

  unload() {
    PrivacyRep.unload();
  }
};
