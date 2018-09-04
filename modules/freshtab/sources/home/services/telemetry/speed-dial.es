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
  if (isCustom) {
    telemetry({
      type: 'home',
      view: 'edit_favorite',
      action: 'click',
      target: 'delete',
      index,
    });
  } else {
    telemetry({
      type: 'home',
      action: 'click',
      target: 'delete_topsite',
      index,
    });
  }
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
    view: 'add_favorite',
    action: 'click',
    target: 'close',
  });
}

export function addFormSubmitSignal() {
  telemetry({
    type: 'home',
    view: 'add_favorite',
    action: 'click',
    target: 'add',
  });
}

export function favoriteEditSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'edit_favorite',
  });
}

export function editFormCloseSignal() {
  telemetry({
    type: 'home',
    view: 'edit_favorite',
    action: 'click',
    target: 'close',
  });
}

export function editFormSubmitSignal() {
  telemetry({
    type: 'home',
    view: 'edit_favorite',
    action: 'click',
    target: 'save',
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
