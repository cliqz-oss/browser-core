/* global CLIQZ */

CLIQZ.app.ready().then(async () => {
  await CLIQZ.app.modules.autoconsent.action('setDefaultAction', 'deny');
  await CLIQZ.app.modules.autoconsent.action('setOnboardingWasCompleted');
  if (!CLIQZ.app.modules['cookie-monster'].isEnabled) {
    await CLIQZ.app.modules['cookie-monster'].enable();
  }
  if (!CLIQZ.app.modules.anolysis.isEnabled) {
    await CLIQZ.app.modules.anolysis.enable();
  }
});
