import telemetry from '../core/services/telemetry';

export function dropdownContextMenuSignal({ action = 'click', context = 'dropdown', target }) {
  const signal = {
    action,
    context,
    type: 'context_menu',
  };

  if (target) {
    signal.target = target;
  }

  telemetry.push(signal);
}


export function removeFromHistorySignal({ withBookmarks = false }) {
  const signal = {
    type: 'activity',
    v: 3.0,
    action: withBookmarks ? 'remove_from_history_and_bookmarks' : 'remove_from_history'
  };

  telemetry.push(signal);
}
