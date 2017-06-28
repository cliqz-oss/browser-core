import config from '../core/config';
import utils from '../core/utils';
import prefs from '../core/prefs';

export function version() {
  return config.settings.onBoardingVersion;
}

export function shouldShowOnboarding() {
  const isUserOnboarded = prefs.get(utils.BROWSER_ONBOARDING_PREF, false);
  return (version() === '3.0') && !isUserOnboarded;
}
