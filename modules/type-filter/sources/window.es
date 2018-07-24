import prefs from '../core/prefs';

export default class Win {
  init() {
  }

  unload() {
  }

  status() {
    if (prefs.get('modules.type-filter.enabled', false)) {
      return {
        visible: true,
        type1: prefs.get('type_filter_type1', true),
        type2: prefs.get('type_filter_type2', true),
        type3: prefs.get('type_filter_type3', true)
      };
    }

    return undefined;
  }
}
