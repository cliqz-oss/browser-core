import MockOS from "./MockOS"

export default {
  init(settings) {
    window.CLIQZ.MockOS = MockOS;
  },

  unload() {

  }
}
