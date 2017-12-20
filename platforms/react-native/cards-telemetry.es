import { NativeModules } from 'react-native';
import prefs from '../core/prefs';

const sendTelemetryToNative = (NativeModules.Telemetry || {}).sendTelemetry;
const isDeveloper = Boolean(global) && global.__DEV__ === true;

export default function sendTelemetry(msg) {
  if (isDeveloper || !sendTelemetry) {
    console.log('Telemetry', msg);
  } else if (!prefs.get('incognito', false)){
    sendTelemetryToNative(JSON.stringify(msg));
  }
}