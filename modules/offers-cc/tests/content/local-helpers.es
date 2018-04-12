import config from '../../../core/config';
import { Subject as GenericSubject } from '../../core/test-helpers';

export default class extends GenericSubject {
  load() {
    return super.load(`/build/${config.settings.id}/chrome/content/offers-cc/index.html`);
  }
}
