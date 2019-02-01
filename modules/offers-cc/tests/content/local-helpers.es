import config from '../../../core/config';
import { GenericSubject } from '../../core/test-helpers';

export default class extends GenericSubject {
  load() {
    return super.load(`/${config.testsBasePath}/offers-cc/index.html`);
  }
}
