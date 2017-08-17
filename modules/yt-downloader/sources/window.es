import { findVideoLinks } from "yt-downloader/main";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.ytdownloader = { findVideoLinks };
  }

  unload() {

  }
}
