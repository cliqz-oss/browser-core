import background from 'core/base/background';
import humanWeb from 'human-web/human-web';
import freshTab from 'freshtab/background';
import { utils } from 'core/cliqz';

/**
* @class Background
* @namespace telemetry-speed-dial
*/
export default background({
  /**
  * @method init
  */
  init() {
    if(utils.getPref('checkLogos', '0') === '1') {
      utils.setTimeout(this.actions.start, 10000);
    }
  },
  /**
  * @method unload
  */
  unload() {

  },
  actions: {
    getAllDialUrls() {
      let allUrls = [];
      let promise = new Promise( (resolve, reject) => {
        freshTab.actions.getSpeedDials()
          .then( result => {
            result.history.forEach( h => allUrls.push(h.url));
            result.custom.forEach( c => allUrls.push(c.url));
            resolve(allUrls);
          })
          .catch( err=> reject(err))
      });
      return promise;
    },
    logoMissing(url) {
      let promise = new Promise( (resolve, reject) => {
        let domain = utils.getDetailsFromUrl(url).name;
        if(!domain || domain === '') reject(url + ' could not get domain');

        if(!utils.BRANDS_DATABASE.domains[domain]) resolve(url);

        utils.BRANDS_DATABASE.domains[domain].forEach( each => {
          if(each && each.l === 1) {
            reject(url + ' logo already exists');
            return;
          }
        });
        resolve(url);
      });
      return promise;
    },
    isAllowed(url) {
      let promise = new Promise( (resolve, reject) => {
        if (humanWeb && !humanWeb.isSuspiciousURL(url)) {
          resolve(url);
        } else {
          reject(url + ' is suspicious');
        }
      })
      return promise;
    },
    isDomainPublic(url) {
      let promise = new Promise( (resolve, reject) => {
        humanWeb.isHostNamePrivate(url).then( status => {
          if(!status){
            resolve(url);
          } else {
            reject(url + ' domain is private');
          }
        });
      });
      return promise;
    },
    filterDomain(url) {
      let _this = this;
      let promise = new Promise( (resolve, reject) => {
        let domain = utils.getDetailsFromUrl(url).domain;
        _this.actions.isAllowed(url)
        .then((url) => _this.actions.logoMissing(url))
        .then((url) => _this.actions.isDomainPublic(url))
        .then(() => resolve([true, domain]))
        .catch( err => {
          // Needs to resolved else Promise.all fails.
          resolve([false,err]);
        });
      });
      return promise;
    },
    start() {
      let _this = this;
      this.actions.getAllDialUrls()
        .then( urls => {
          Promise.all(urls.map(_this.actions.filterDomain))
            .then( values => {
              let finalDomains = values.filter(e => {return e[0] === true});
              finalDomains.forEach( eachDomain => {
                  const msg = {};
                  msg.type = 'humanweb';
                  msg.action = 'speedial.missinglogos';
                  msg.payload = {'d': eachDomain[1]};
                  humanWeb.telemetry(msg);
                  console.log(`Logo for domain ${eachDomain} is missing`)
              });
              utils.setPref('checkLogos', '2');
            })
            .catch( err => utils.log(err));
        })
    }
  },
});
