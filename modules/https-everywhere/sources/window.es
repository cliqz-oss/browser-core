import background from './background';

export default class {
  init() {
  }

  unload() {
  }

  status() {
    return background.status();
  }
}
