import prefs from './prefs';

const assert = prefs.get('developer', false) ?
  (bool, msg) => {
    if (!bool) {
      throw new Error(`ASSERT ${msg}`);
    }
  }
  : () => {};

export default assert;
