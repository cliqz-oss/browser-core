
import controlOps from './operations/control';
import triggerOps from './operations/trigger';
import signalOps from './operations/signal';
import historyOps from './operations/history';
import displayOps from './operations/display';
import { timestamp } from './utils';


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
      if(!operation) {
        resolve(true);
        return;
      }
      const name = operation.op_name;
      const args = operation.args;
      const ttl = operation.ttl;

      var opFunc = self.operations[name];
      if(!opFunc) {
        self.eventLoop.environment.info('OperationExecutor', 'unsupported operation: ' + name);
        resolve(undefined);
        return;
      }

      // try to return cached result
      const opKey = operation.hash_id;

      var result = undefined;
      if(ttl > 0) {
        result = self.isResultCached(opKey);

        if(result !== undefined) {
          // self.eventLoop.environment.info('#OperationExecutor', '#value cached');
          resolve(result);
          return;
        }
      }

      // execute
      self.evaluateArgs(args, context).then(args => {
        opFunc.call(self, args, self.eventLoop, context, operation.hash_id).then(result => {
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
      args.forEach((arg) => {
        if (typeof arg === 'object' && arg.op_name) {
          argsP.push(self.execute(arg, context));
        } else if(typeof arg === 'string' && self.contextPrefixRegexp.exec(arg)) {
          argsP.push(context[arg]);
        } else {
          argsP.push(arg);
        }
      });

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
      added_ts: timestamp()
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

    var ts = timestamp();

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

}
