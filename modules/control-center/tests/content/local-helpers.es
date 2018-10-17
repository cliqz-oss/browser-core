import config from '../../../core/config';
import { Subject } from '../../core/test-helpers-freshtab';

export default class extends Subject {
  load() {
    return super.load({
      buildUrl: `/build/${config.settings.id}/chrome/content/control-center/index.html`
    });
  }
}
