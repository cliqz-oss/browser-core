
export default class {
  constructor() {
    // TODO: Keep track of activity
    // - day
    // - weeks
    // - month
    // End generate signals accordingly
    this.name = 'retention';
    this.needs_gid = true;
  }

  generateSignals() {
    return [{ id: this.name, data: 'Activity' }];
  }
}
