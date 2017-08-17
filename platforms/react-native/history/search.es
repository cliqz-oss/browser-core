import { NativeModules } from 'react-native';

export default function historySearch(q, callback) {
  NativeModules.HistoryModule.searchHistory(q, data => {
    const results = data.map(item => {
      return {
        style: 'facicon',
        value: item.url,
        image: '',
        comment: item.title || 'no comment',
        label: ''
      };
    });
    callback({ results, query: q, ready: true });
  });
}
