
function generateDiagnosis() {
  var adblocker = Components.utils.import("chrome://cliqzmodules/content/CLIQZ.jsm").CLIQZ.System.get("adblocker/adblocker").default.adBlocker;
  var utils = Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm').CLIQZ.System.get("core/utils").default;
  var elt;
  var content = [];

  // Cliqz version
  var firefox_version = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).version;
  var extension_version = utils.extensionVersion;

  content.push(`<h2>Extension</h2>`);
  content.push(`<div>FF = ${firefox_version}</div>`);
  content.push(`<div>EXT = ${extension_version}</div>`);

  // Display logs
  elt = document.getElementById("adb-logs");
  content.push(['<h1>Adblocker logs</h1>']);
  adblocker.logs.forEach((log) => {
      content.push(`<div>${log}</div><br/>`);
  });
  elt.innerHTML = content.join("\n");

  // Display state of the engine
  elt = document.getElementById("adb-engine");
  content = ['<h1>Adblocker Filters</h1>'];

  // Updates
  var timestamp = Date.now();
  var lastUpdate = utils.getPref('resource-loader.lastUpdates.antitracking/adblocking/checksums');
  var ago = (timestamp / 60 / 60 / 1000) - (lastUpdate / 60 / 60 / 1000);

  content.push(`<h2>Updates</h2>`);
  content.push(`<div>current timestamp = ${timestamp}</div>`);
  content.push(`<div>last update = ${lastUpdate} (${ago} hours ago)</div>`);

  // Engine stats
  content.push(`<h2>Loaded filters</h2>`);
  content.push(`<div>${adblocker.engine.size} filters loaded</div>`);
  content.push(`<div>exception = ${adblocker.engine.exceptions.size} </div>`);
  content.push(`<div>exception = ${adblocker.engine.importants.size} </div>`);
  content.push(`<div>exception = ${adblocker.engine.redirect.size} </div>`);
  content.push(`<div>network filters = ${adblocker.engine.filters.size} </div>`);
  content.push(`<div>cosmetics filters = ${adblocker.engine.cosmetics.size} </div>`);

  // Resources
  content.push(`<h2>Resources</h2>`);
  content.push(`<div>checksum = ${adblocker.engine.resourceChecksum}</div>`);

  // Display loaded lists
  adblocker.engine.lists.forEach((value, key) => {
      content.push(`<h2>${key}</h2>`);
      content.push(`<div>checksum = ${value.checksum}</div>`);
      Object.keys(value).forEach((k) => {
          if (k !== 'checksum') {
              content.push(`<div>${k} = ${value[k].length}</div>`);
          }
      });
  });
  elt.innerHTML = content.join("\n");
}

generateDiagnosis()
