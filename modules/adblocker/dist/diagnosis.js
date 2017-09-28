/* global document */

function generateDiagnosis() {
  const System = Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm').CLIQZ.System;
  const adb = System.get('adblocker/adblocker');
  const adblocker = adb.default.adBlocker;
  const utils = System.get('core/utils').default;
  const lang = System.get('core/language').default;
  let content = [];
  let elt;

  // Cliqz version
  const firefoxVersion = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).version;
  const extensionVersion = utils.extensionVersion;

  content.push('<h2>Extension</h2>');
  content.push(`<div>FF = ${firefoxVersion}</div>`);
  content.push(`<div>EXT = ${extensionVersion}</div>`);

  if (adblocker === null) {
    elt = document.getElementById('adb-warning');
    content.push('<h1>Adblocker is currently disabled</h1>');
    elt.innerHTML = content.join('\n');
    return;
  }

  // Enable verbose diagnosis
  adblocker.diagnosisEnabled = true;

  // Display blocking logs
  elt = document.getElementById('adb-logger');
  content = ['<h1>Adblocker blocking logger</h1>'];
  adblocker.blockingLogger.forEach((logs, sourceUrl) => {
    content.push('<table style="width:100%">');
    content.push(`<caption><br>${sourceUrl}</br></caption>`);
    logs.forEach((log) => {
      content.push(log);
    });
    content.push('</table>');
  });
  elt.innerHTML = content.join('\n');

  // Display logs
  elt = document.getElementById('adb-logs');
  content = ['<h1>Adblocker logs</h1>'];
  adblocker.logs.forEach((log) => {
    content.push(`<div>${log}</div><br/>`);
  });
  elt.innerHTML = content.join('\n');

  // Display state of the engine
  elt = document.getElementById('adb-engine');
  content = ['<h1>Adblocker Filters</h1>'];

  // Updates
  const timestamp = Date.now();
  const lastUpdate = utils.getPref('resource-loader.lastUpdates.adblocker/firefox/checksums');
  const ago = timestamp - lastUpdate;
  const seconds = ago / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;

  content.push('<h2>Updates</h2>');
  content.push(`<div>current timestamp = ${timestamp}</div>`);
  content.push(`<div>last update = ${lastUpdate} (${Math.floor(hours)}h ago)</div>`);

  // Engine stats
  content.push('<h2>Loaded filters</h2>');
  content.push(`<div>${adblocker.engine.size} filters loaded</div>`);
  content.push(`<div>exceptions = ${adblocker.engine.exceptions.size} </div>`);
  content.push(`<div>importants = ${adblocker.engine.importants.size} </div>`);
  content.push(`<div>redirects = ${adblocker.engine.redirects.size} </div>`);
  content.push(`<div>other network filters = ${adblocker.engine.filters.size} </div>`);

  content.push(`<div>network filters = ${
    adblocker.engine.exceptions.size
    + adblocker.engine.importants.size
    + adblocker.engine.redirects.size
    + adblocker.engine.filters.size
  } </div>`);
  content.push(`<div>cosmetics filters = ${adblocker.engine.cosmetics.size} </div>`);

  // Resources
  content.push('<h2>Resources</h2>');
  content.push(`<div>checksum = ${adblocker.engine.resourceChecksum}</div>`);

    // Display loaded lists
  Object.keys(adblocker.engine.lists).forEach((key) => {
    const value = adblocker.engine.lists[key];
    content.push(`<h2>${key}</h2>`);
    content.push(`<div>checksum = ${value.checksum}</div>`);
    Object.keys(value).forEach((k) => {
      if (k !== 'checksum') {
        content.push(`<div>${k} = ${value[k].length}</div>`);
      }
    });
  });
  elt.innerHTML = content.join('\n');

  // Language
  elt = document.getElementById('adb-lang');
  content = ['<h1>User Language</h1>'];

  // current loaded language
  content.push('<h2>ADB language prefs</h2>');
  content.push(`<div>User-specified country filters (${adb.ADB_USER_LANG}): ${utils.getPref(adb.ADB_USER_LANG, '')}</div>`);
  content.push('<h2>User languages</h2>');
  content.push(`<div>${lang.state().join(';')}</div>`);
  content.push('<h2>Loaded languages</h2>');
  content.push(`<div>${['en (default)', ...adblocker.listsManager.loadedLang].join(';')}</div>`);
  content.push('<h2>Available languages</h2>');
  content.push(`<div>${[...adblocker.listsManager.availableLang].join(';')}</div>`);
  elt.innerHTML = content.join('\n');
}


generateDiagnosis();
