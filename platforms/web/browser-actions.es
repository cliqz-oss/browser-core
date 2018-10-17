import events from '../core/events';

export function handleQuerySuggestions(q, suggestions) {
  events.pub('search:suggestions', {
    query: q,
    suggestions,
  });
}

export function queryCliqz() {}

export function openLink() {}

export function openTab() {}

export function getOpenTabs() {}

export function getReminders() {}
