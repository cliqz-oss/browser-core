import prefs from './prefs';

// Get 'developer' pref as soon as possible and initially assume it's not set.
let developer = false;
prefs.init().then(() => {
  developer = prefs.get('developer', false);
});

const assert = (bool, msg) => {
  if (developer === true && !bool) {
    throw new Error(`ASSERT ${msg}`);
  }
};

export default assert;
