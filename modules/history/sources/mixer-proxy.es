import { utils } from "core/cliqz";

export default class {

  constructor() {
    this.cache = Object.create(null);
  }

  getSnippet(url) {
    const mixerUrl = `https://newbeta.cliqz.com/api/v1/results?q=${url}`;

    if (url in this.cache) {
      return Promise.resolve(this.cache[url]);
    } else {
      return utils.promiseHttpHandler("GET", mixerUrl, {}, 2000).then( response => {
        const payload = JSON.parse(response.response);
        const snippet = payload.result[0].snippet;

        this.cache[url] = snippet;

        return snippet;
      }, () => {});
    }
  }

}
