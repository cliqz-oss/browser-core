import cliqz from '../../cliqz';

export default function (signal) {
  cliqz.core.sendTelemetry({
    ...signal,
    version: '2.0',
  });
}
