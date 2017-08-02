import telemetry from './base';

export function speedDialClickSignal(isCustom, index) {
  const target = isCustom ? 'favorite' : 'topsite';

  telemetry({
    type: 'home',
    action: 'click',
    target,
    index,
  });
}

export function speedDialDeleteSignal(isCustom, index) {
  const target = isCustom ? 'delete_favorite' : 'delete_topsite';

  telemetry({
    type: 'home',
    action: 'click',
    target,
    index,
  });
}

export function favoriteAddSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'add_favorite',
  });
}

export function addFormCloseSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    view: 'add_favorite',
    target: 'close',
  });
}

export function addFormSubmitSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    view: 'add_favorite',
    target: 'add',
  });
}

export function deleteUndoSignal(speedDial) {
  const target = speedDial.custom ? 'undo_delete_favorite' : 'undo_delete_topsite';

  telemetry({
    type: 'home',
    action: 'click',
    view: 'notification',
    target,
  });
}

export function undoCloseSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    view: 'notification',
    target: 'close',
  });
}
