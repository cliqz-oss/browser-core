
import controlOps from './operations/control'
import triggerOps from './operations/trigger'
import signalOps from './operations/signal'
import historyOps from './operations/history'
import displayOps from './operations/display'


export default class OperationExecutor {

  constructor(eventLoop) {
    this.eventLoop = eventLoop;

    this.operationPrefixRegexp = /^\$/;
    this.contextPrefixRegexp = /^\#/;

    this.resultCache = {};
    this.lastExpireRun = 0;

    // merge operations
    this.operations = {};
    for(var op in controlOps) {
      this.operations[op] = controlOps[op];
    }
    for(var op in triggerOps) {
      this.operations[op] = triggerOps[op];
    }
    for(var op in signalOps) {
      this.operations[op] = signalOps[op];
    }
    for(var op in historyOps) {
      this.operations[op] = historyOps[op];
    }
    for(var op in displayOps) {
      this.operations[op] = displayOps[op];
    }
  }


  execute(operation, context) {
    var self = this;

    return new Promise((resolve, reject) => {
      if(!operation || operation.length === 0) {
        resolve(true);
        return;
      }

      // clone operation
      operation = operation.slice();

      var name = operation.shift();

      var args = [];
      if(operation.length > 0) {
        args = operation.shift();
      }

      var ttl = 0;
      if(operation.length > 0) {
        ttl = operation.shift();
      }

      var opFunc = self.operations[name];
      if(!opFunc) {
        self.eventLoop.environment.info('OperationExecutor', 'unsupported operation: ' + name);
        resolve(undefined);
        return;
      }

      // try to return cached result
      var opKey = name + ':' + args.join(',');

      var result = undefined;
      if(ttl > 0) {
        result = self.isResultCached(opKey);

        if(result !== undefined) {
          resolve(result);
          return;
        }
      }

      // execute
      self.evaluateArgs(args, context).then(args => {
        opFunc.call(self, args, self.eventLoop, context).then(result => {
          if(ttl > 0) {
            self.cacheResult(opKey, ttl, result);
          }

          resolve(result);
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    });
  }


  evaluateArgs(args, context) {
    var self = this;

    return new Promise((resolve, reject) => {
      var argsP = [];
      for(var i = 0; i < args.length; i++) {
        if(args[i].constructor === Array && args[i].length > 0 && self.operationPrefixRegexp.exec(args[i][0])) {
          argsP.push(self.execute(args[i], context));
        }
        else if(typeof args[i] === 'string' && self.contextPrefixRegexp.exec(args[i])) {
          argsP.push(context[args[i]]);
        }
        else {
          argsP.push(args[i]);
        }
      }

      Promise.all(argsP).then(args => {
        resolve(args);
      }).catch(err => {
        reject(err);
      });
    });
  }



  // Add condition result to the cache.
  cacheResult(opKey, ttl, result) {
    var self = this;

    if(!ttl) {
      return;
    }

    self.expireCache();

    self.resultCache[opKey] = {
      result: result,
      ttl: ttl,
      added_ts: self.timestamp()
    }
  }


  // Get check if condition result is cached.
  isResultCached(opKey) {
    var self = this;

    self.expireCache();

    var entry = self.resultCache[opKey];
    if(entry) {
      return entry.result;
    }

    return undefined;
  }



  // Try to expire condition results. Run max once per minute.
  expireCache() {
    var self = this;

    var ts = self.timestamp();

    if(ts - this.lastExpireRun < 60000) {
      return;
    }

    var entry;
    for(var key in self.cache) {
      entry = self.cache[key];

      if(entry.added_ts + entry.ttl < ts) {
        delete self.cache[key]
      }
    }

    self.lastExpireRun = ts;
  }


  timestamp() {
    return Math.round(Date.now() / 1000);
  }

}
