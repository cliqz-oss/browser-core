import utils from "core/utils";

export default class {
  constructor(config) {
  }

  init() {
  }

  unload() {
  }

  status() {
    if (utils.getPref("modules.type-filter.enabled", false)) {
      return {
        visible: true,
        type1: utils.getPref("type_filter_type1", true),
        type2: utils.getPref("type_filter_type2", true),
        type3: utils.getPref("type_filter_type3", true)
      }
    }
  }
}
