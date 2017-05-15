import { getPref } from './prefs';

export function handleQuerySuggestions(query, suggestions) {
  if (suggestions && getPref("suggestionsEnabled", false)) {
    osAPI.showQuerySuggestions(query, suggestions);
  }
}
