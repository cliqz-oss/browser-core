/**
 * This file contains the wrapper of what an intent is, which is pretty simple:
 * - name
 * - activation time
 * - activation duration.
 */
import { timestampMS } from '../utils';

/**
 * Definition of an intent
 */
export default class Intent {
  constructor(name, durationSecs, activationTime = timestampMS()) {
    this.name = name;
    this.durationSecs = durationSecs;
    this.activationTime = activationTime;
  }

  serialize() {
    return {
      name: this.name,
      durationSecs: this.durationSecs,
      activationTime: this.activationTime,
    };
  }

  static deserialize(data) {
    return new Intent(data.name, data.durationSecs, data.activationTime);
  }

  getDurationSecs() {
    return this.durationSecs;
  }

  getName() {
    return this.name;
  }

  activate() {
    this.activationTime = timestampMS();
  }

  isActive() {
    return ((timestampMS() - this.activationTime) / 1000) < this.durationSecs;
  }
}
