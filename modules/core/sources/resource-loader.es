import { readFile, writeFile, mkdir } from 'core/fs';
import { utils } from 'core/cliqz';

export default class {

  constructor( resourceName, options = {} ) {
    if ( typeof resourceName === 'string' ) {
      resourceName  = [ resourceName ];
    }
    this.resourceName = resourceName;
    this.remoteURL = options.remoteURL;
    this.localURL = utils.System.baseURL + this.resourceName.join('/');
    this.dataType = options.dataType || 'json';
    this.filePath = [ 'cliqz', ...this.resourceName ];
    this.cron = options.cron || 60 * 60 * 1000; // default one hour

    this.callbacks = [];
    this.updateInterval = utils.setInterval(
        this.updateFromRemote.bind(this), 5 * 60 * 1000 ); // check every 5 min
  }

  load() {
    return readFile( this.filePath ).then( data => {
      return ( new TextDecoder() ).decode( data );
    }).catch( e => {
      // no profile data so fetch from default location
      return get( this.localURL ).then( data => {
        return this.persist(data);
      });
    }).then( data => {
      return JSON.parse(data);
    });
  }

  updateFromRemote() {
    const pref = `resource-loader.lastUpdates.${this.resourceName.join('/')}`;
    let lastUpdate = Number( utils.getPref( pref, 0 ) ),
        currentTime = Date.now();

    if ( currentTime < this.cron + lastUpdate ) {
      return;
    }

    get( this.remoteURL ).then( data => {
      return this.persist(data);
    }).then( data => {
      data = JSON.parse(data);
      this.callbacks.map( cb => cb(data) );
      utils.setPref( pref, String( currentTime ) );
    });
  }

  onUpdate( callback ) {
    this.callbacks.push(callback);
  }

  stop() {
    utils.clearInterval(this.updateInterval);
  }

  persist( data ) {
    let dirPath = this.filePath.slice( 0, -1 );
    return makeDirRecursive( dirPath ).then( () => {
      return writeFile( this.filePath , ( new TextEncoder() ).encode(data) );
    }).then( () => {
      return data;
    });
  }
}

function get(url) {
  return new Promise( (resolve, reject) => {
    utils.httpGet( url , res => {
      resolve(res.response);
    }, reject );
  });
}

function makeDirRecursive(path, from = []) {
  let [ first, ...rest ] = path;

  if ( !first ) {
    return Promise.resolve();
  }

  return mkdir( from.concat( first ) ).then( () => {
    return makeDirRecursive( rest, from.concat( first ) );
  });
}
