import { getPref } from './prefs';
import { NativeModules } from 'react-native';

export function handleQuerySuggestions(query, suggestions = []) {
  if (NativeModules.QuerySuggestion && getPref("suggestionsEnabled", false)) {
    NativeModules.QuerySuggestion.showQuerySuggestions(query, suggestions);
  }
}
