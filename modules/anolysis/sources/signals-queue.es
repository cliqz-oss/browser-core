import Backend from 'anolysis/backend-communication';
import log from 'anolysis/logging';
import { utils } from 'core/cliqz';


export default class {
  constructor(storage) {
    this.storage = storage;

    // Send signals by chunks, at regular intervals
    // Make throughput customizable
    this.batchSize = 10;
    this.sendInterval = 5000;

    // Send signal by batch and make sure each message has been sent before
    // deleting from the persistent storage.
    this.interval = utils.setInterval(
        () => {
          // 1. Get a batch of signals to send to backend
          this.storage.getN(this.batchSize)
            .then((batch) => {
              if (batch.length > 0) {
                log(`get batch of ${batch.length}`);
                batch.forEach((doc) => {
                  // 2. For each signal sent, remove it from DB
                  try {
                    const signal = doc.signal;
                    if (signal !== undefined) {
                      const gid = signal.meta.gid;

                      log(`send signal ${JSON.stringify(signal)}`);
                      Backend.sendSignal(gid, signal)
                        .then((response) => {
                          if (response.ok) {
                            this.storage.remove(doc);
                          } else {
                            log(`send failed with code ${response.status}`);
                          }
                        })
                        .catch((ex) => {
                          log(`failed to send signal with exception ${ex} ${ex.stack}`);
                        });
                    }
                  } catch (ex) {
                    log(`Exception in signal queue ${ex} ${ex.stack}`);
                    this.storage.remove(doc);
                  }
                });
              }
            });
        },
        this.sendInterval,
    );
  }

  unload() {
    utils.clearInterval(this.interval);
  }

  push(signal) {
    this.storage.put({ signal, type: 'anolysisSignal' })
      .then(() => this.storage.info())
      .then((info) => {
        log(`DB INFO ${JSON.stringify(info)}`);
      });
  }
}
