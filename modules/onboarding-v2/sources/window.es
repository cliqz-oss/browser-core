import utils from "core/utils";
import { version as onboardingVersion, shouldShowOnboardingV2 } from "core/onboarding";

const CLIQZ_ONBOARDING = "about:onboarding";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if(onboardingVersion() !== "2.1") {
      return;
    }
    shouldShowOnboardingV2().then((show) => {
      if(show) {
        utils.openLink(this.window, CLIQZ_ONBOARDING);
      }
    })

    if (this.window.gInitialPages && this.window.gInitialPages.indexOf(CLIQZ_ONBOARDING)===-1) {
      this.window.gInitialPages.push(CLIQZ_ONBOARDING);
    }
  }

  unload() {

  }
}
