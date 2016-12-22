import MockOS from "mobile-dev/MockOS"

export default {
  init(settings) {
  	window.CLIQZ.MockOS = MockOS;
  },

  unload() {

  }
}
