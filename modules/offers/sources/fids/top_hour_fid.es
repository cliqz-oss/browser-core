import { utils } from 'core/cliqz';
import { FID } from 'offers/fids/fid';
import OffersConfigs from 'offers/offers_configs';


export class TopHourFID extends FID {
  constructor() {
    super('topHour');
    this.datetimeDB = null;
    this.args = {};
    this.topHours = new Set();
    this.configParams = {
          'topN' : {
            description: 'The top N hours we will consider to return 1 if we are in any of them or 0 otherwise',
            value: 1
          }
        };
  }

  configureDataBases(dbsMap) {
    if (dbsMap['datetime_db']) {
      this.datetimeDB = dbsMap['datetime_db'];
    } else {
          throw new Error("dbsMap doesn't have key: datetime_db") ;
    }
  }

  configureArgs(configArgs) {
    for (let arg in configArgs) {
      if (arg['name'] in this.configParams) {
        this.args[arg['name']] = Number(this.configParams[arg['name']]['value']);
      } else {
        this.args[arg['name']] = Number(arg['value']);
      }
    }
    if (this.args['topN'] <= 0) {
      return;
    }
    let hourList = [];
    for (let i= 0; i < 24; i++) {
      hourList.push([i, this.datetimeDB.getHourValue(i)]);
    }
    // sort list by number of bought per hour
    hourList.sort(function(a,b) {
      var x = a[1];
      var y = b[1];
      return y-x;
    });
    // add topN to the list
    for (let i = 0; i <  Math.min(hourList.length, this.args['topN']); i++) {
      this.topHours.add(hourList[i][0]);
    }
  }

  evaluate(intentInput, extras) {
    throw new Error('The FID::evaluate for ' + this.name + ' should be implemented!');
  }
}
