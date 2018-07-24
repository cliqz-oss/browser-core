import prefs from '../core/prefs';


// /////////////////////////////////////////////////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////
export default class Win {
  init() {}

  unload() {}

  status() {
    return {
      visible: true,
      userEnabled: prefs.get('offers2UserEnabled', true) === true,
      locationEnabled: prefs.get('offers_location', 1) === 1, // 0 = off, 1 = IP based
    };
  }
}
