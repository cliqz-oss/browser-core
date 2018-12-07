import { deletePersistantObject } from '../../core/persistent-state';

/**
 * Remove any old database entries which are no longer needed
 */
export default function () {
  deletePersistantObject('requestKeyValue');
  deletePersistantObject('checkedToken');
  deletePersistantObject('blockedToken');
  deletePersistantObject('loadedPage');
  deletePersistantObject('tokens');
}
