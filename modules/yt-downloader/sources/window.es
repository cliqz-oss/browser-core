import { getUrls } from "yt-downloader/main";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.ytdownloader = { getUrls };
  }

  unload() {

  }
}
