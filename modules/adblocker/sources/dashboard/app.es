/* global document, Handlebars */

import templates from '../templates';

export default async function main(adblocker) {
  // Register and plug in the templates
  Handlebars.partials = templates;
  const path = '';

  const status = await adblocker.status();
  document.getElementById('main').innerHTML = templates.main({
    path,
    enabled: status.enabled,
    ready: status.ready,
  });

  // TODO toggle prefs from the UI
  // TODO number of filters (network, cosmetics)
  // TODO reset/force update buttons
  document.getElementById('status').innerHTML = templates.status(status);
  document.getElementById('settings').innerHTML = templates.settings(status);
  document.getElementById('lists').innerHTML = templates.lists(status);
  document.getElementById('logs').innerHTML = templates.logs(status);
}
