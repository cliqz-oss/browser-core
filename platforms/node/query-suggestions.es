import { getPref } from './prefs';

export function handleQuerySuggestions(query, suggestions) {
  if (suggestions && getPref("suggestionsEnabled", false)) {
    // TODO: send to native
    // osAPI.showQuerySuggestions(query, suggestions);
  }
}
