import utils from '../core/utils';

export function dropdownContextMenuSignal({ action = 'click', context = 'dropdown', target }) {
  const signal = {
    action,
    context,
    type: 'context_menu',
  };

  if (target) {
    signal.target = target;
  }

  utils.telemetry(signal);
}


export function removeFromHistorySignal({ withBookmarks = false }) {
  const signal = {
    type: 'activity',
    v: 3.0,
    action: withBookmarks ? 'remove_from_history_and_bookmarks' : 'remove_from_history'
  };

  utils.telemetry(signal);
}
