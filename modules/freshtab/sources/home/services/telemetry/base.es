import cliqz from '../../cliqz';

const isPrivateMode = !!(chrome && chrome.extension && chrome.extension.inIncognitoContext);

export default function (signal) {
  if (!isPrivateMode) {
    cliqz.core.sendTelemetry(
      { ...signal, version: '2.0' },
      false, // not instant push
      '',
    );
  }
}
