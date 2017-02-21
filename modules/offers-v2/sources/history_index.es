import { utils } from 'core/cliqz';
import OffersConfigs from 'offers-v2/offers_configs';


export default class HistoryIndex {
  constructor(eventLoop) {
    this.eventLoop = eventLoop;

    this.localStorage = utils.getLocalStorage(OffersConfigs.TRIGGER_HISTORY_DATA);
    this.lastSaved = false;

    this.entries = [];

    this.load();
  }

  queryHistory(start, end) {
    var self = this;

    var result = self.entries.filter(function(entry) {
      return (entry.ts >= start && entry.ts <= end);
    });

    self.eventLoop.environment.info("HistoryIndex", "history query returned " + result.length + " entries");

    return result;
  }

  addUrl(url, context) {
    var self = this;

    if(context._urlAddedToHistory) {
      return;
    }
    context._urlAddedToHistory = true;

    self.eventLoop.environment.info("HistoryIndex", "URL added to history: " + url);

    self.entries.push({
      url: url,
      ts: self.timestamp()
    });

    self.save();
  }

  save() {
    // TODO: make saving incremental, use some DB
    var self = this;

    self.entries.splice(1000);

    if(self.lastSaved === null || self.lastSaved < self.timestamp() - 5) {
      self.localStorage.setItem('trigger_history', JSON.stringify(this.entries));
      self.eventLoop.environment.info("HistoryIndex", "Saved trigger history to local storage");
      self.lastSaved = self.timestamp();
    }
  }

  load() {
    var self = this;

    if (OffersConfigs.LOAD_TRIGGER_HISTORY_DATA) {
      var history = self.localStorage.getItem('trigger_history');
      if(history) {
        this.entries = JSON.parse(history);
      }

      self.eventLoop.environment.info("HistoryIndex", "Loaded trigger history from local storage. Num entries: " + this.entries.length);
    }
    else {
      self.eventLoop.environment.info("HistoryIndex", "Loading history disabled");
    }
  }

  timestamp() {
    return Math.round(Date.now() / 1000);
  }

}
