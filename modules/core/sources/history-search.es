import historySearch from '../platform/history/search';

/**
 * This global state used to be stored on core/utils and was moved here to ease
 * its refactoring in the future. It is only needed for integrations tests. One
 * option would be to move this logic to a service instead.
 */
let historySearchHandler = historySearch;

export function overrideHistorySearchHandler(handler) {
  historySearchHandler = handler;
}

export function resetHistorySearchHandler() {
  historySearchHandler = historySearch;
}

export default function (...args) {
  return historySearchHandler(...args);
}
