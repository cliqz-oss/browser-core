import { findVideoLinks } from './main';

export default class Win {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.ytdownloader = { findVideoLinks };
  }

  unload() {

  }
}
