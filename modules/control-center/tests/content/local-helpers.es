import config from '../../../core/config';
import { Subject } from '../../core/test-helpers-freshtab';

export default class extends Subject {
  load() {
    return super.load({
      buildUrl: `/${config.testsBasePath}/control-center/index.html`
    });
  }
}
