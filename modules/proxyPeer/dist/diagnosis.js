
function generateDiagnosis() {
  const utils = Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm').CLIQZ.System.get('core/utils').default;
  const trackerProxy = Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm').CLIQZ.System.get('proxyPeer/background').default.trackerProxy;
  const proxy = trackerProxy.proxyPeer;

  const elt = document.getElementById('proxy-logs');
  const content = [];

  // Cliqz version
  const firefoxVersion = Components.classes['@mozilla.org/xre/app-info;1']
    .getService(Components.interfaces.nsIXULAppInfo).version;
  const extensionVersion = utils.extensionVersion;

  content.push('<h2>Extension</h2>');
  content.push(`<div>FF = ${firefoxVersion}</div>`);
  content.push(`<div>EXT = ${extensionVersion}</div>`);

  // Healthcheck
  content.push('<h1>Transport layer stats</h1>');
  content.push('<ul>');
  ['socksToRTC', 'rtcRelay', 'rtcToNet'].forEach((role) => {
    content.push(`<li>${role} = ${JSON.stringify(proxy[role].healthcheck())}</li>`);
  });
  content.push('</ul>');

  // Display proxied requests
  content.push('<h1>Proxied domains</h1>');

  const logsGD = [];
  trackerProxy.proxyStats.forEach((subdomains, hostGD) => {
    let total = 0;
    subdomains.forEach((count) => {
      total += count;
    });

    logsGD.push([total, hostGD, subdomains]);
  });

  logsGD.sort((h1, h2) => {
    if (h1[0] < h2[0]) return 1;
    if (h1[0] > h2[0]) return -1;
    return 0;
  });

  logsGD.forEach(([total, hostGD, subdomains]) => {
    const logs = [];
    subdomains.forEach((count, hostname) => {
      logs.push([count, hostname]);
    });

    logs.sort((h1, h2) => {
      if (h1[0] < h2[0]) return 1;
      if (h1[0] > h2[0]) return -1;
      return 0;
    });

    content.push(`<h3>${hostGD} => ${total}</h3>`);
    content.push('<ul>');
    logs.forEach((log) => {
      content.push(`<li>${log[1]} => ${log[0]}</li>`);
    });
    content.push('</ul>');
  });
  elt.innerHTML = content.join('\n');
}

generateDiagnosis();
