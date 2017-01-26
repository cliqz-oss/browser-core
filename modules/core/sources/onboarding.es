import { utils } from "core/cliqz";
import config from "core/config";
import ProfileAge from "platform/profile-age";

const profileAccessor = new ProfileAge(null, null);
export function version() {
  return config.settings.onBoardingVersion;
}

export function shouldShowOnboardingV2() {
  var step = utils.getPref(utils.BROWSER_ONBOARDING_STEP_PREF, 1),
      existingUser = utils.hasPref(utils.BROWSER_ONBOARDING_PREF),
      shouldShow = false;

  if (!existingUser) {
    if(step < 3) {
      shouldShow = true;
    }
  }

  return new Promise((resolve, reject) => {
    profileAccessor.reset.then((time) => {
      console.log('ProfileAccessor', `get reset time for profile ${time}`);
      if(time !== undefined) {
        shouldShow = false;
      }
      return resolve(shouldShow);
    });
  });
}
