export default class {
  constructor(CliqzHumanWeb) {
    this.CliqzHumanWeb = CliqzHumanWeb;
  }

  getDNS(hostname) {
    return new Promise((resolve, reject) => {
      if (this.CliqzHumanWeb.domain2IP) {
        if (this.CliqzHumanWeb.domain2IP[hostname]) {
          const address = this.CliqzHumanWeb.domain2IP[hostname].ip;
          resolve(address);
          return;
        }
      }
      reject();
    });
  }
}
