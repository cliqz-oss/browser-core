import telemetry from '../../core/services/telemetry';

const TELEMETRY_VERSION = 2;

export function uiTourSignal({ action, target }) {
  const signal = {
    type: 'notification',
    version: TELEMETRY_VERSION,
    topic: 'video_downloader',
    view: 'urlbar',
    action,
  };

  if (target) {
    signal.target = target;
  }

  telemetry.push(signal);
}

export function downloadUiTourSignal({ action, target }) {
  const signal = {
    type: 'notification',
    version: TELEMETRY_VERSION,
    topic: 'video_downloader_mobile',
    view: 'toolbar',
    action,
  };

  if (target) {
    signal.target = target;
  }

  telemetry.push(signal);
}
