
// NOTES
// - dependent triggers are only requestsed only when ALL previous dep triggers expire

import TriggerCache from './trigger_cache'
import RegexpCache from './regexp_cache'
import OperationExecutor from './operation_executor'
import TriggerMachine from './trigger_machine'
import HistoryIndex from './history_index'


export default class EventLoop {

  constructor(environment) {
    var self = this;

    // initialize
    self.environment = environment;
    self.triggerCache = new TriggerCache(this);
    self.regexpCache = new RegexpCache(this);
    self.operationExecutor = new OperationExecutor(this);
    self.triggerMachine = new TriggerMachine(this);
    self.historyIndex = new HistoryIndex(this);

    self.environment.onUrlChange((url, urlObj) => {
      if(!url) {
        return;
      }

      var context = {
        '#url': url
      };

      if(urlObj && urlObj['domain']) {
        context['#domain'] = urlObj['domain'];
      }

      self.triggerMachine.runRoot(context).then(result => {
        self.environment.info("EventLoop", "Executed triggers for context: " + JSON.stringify(context));
      }).catch(err => {
        self.environment.error("EventLoop", err);
      });
    });
  }

}
