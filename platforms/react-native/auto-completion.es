import { NativeModules } from 'react-native';

export default function handleAutoCompletion(url = '', query = '') {
  if (!NativeModules.AutoCompletion) {
    return;
  }
  if (url.length > 0) {
    url = url.replace(/http([s]?):\/\/(www.)?/, '');
    url = url.toLowerCase();
    const searchLower = query.toLowerCase();
    if (url.startsWith(searchLower)) {
      NativeModules.AutoCompletion.autoComplete(url);
    } else {
      NativeModules.AutoCompletion.autoComplete(query);
    }
  } else {
    NativeModules.AutoCompletion.autoComplete(query);
  }
}