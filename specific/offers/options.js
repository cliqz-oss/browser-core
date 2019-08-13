function markChanges() {
  const node = document.querySelector('.form-message');
  if (!node) { return; }
  node.style.visibility = 'visible';
  const date = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  node.innerHTML = '&#10004; Einstellungen gespeichert ' + date;
}

function saveOptions(e) {
  const obj = {};
  document
    .querySelectorAll('input[type=checkbox]')
    .forEach(box => obj[box.id] = box.checked);

  // toggle bacause system and user treats it differently
  if (obj['humanWebOptOut'] !== undefined) { obj['humanWebOptOut'] = !obj['humanWebOptOut']; }

  (chrome || browser).runtime.sendMessage({
    module: 'offers-banner',
    args: [obj],
    action: 'setPref',
  });
  markChanges();
}

function restoreOptions() {
  (chrome || browser).runtime.sendMessage({
    module: 'offers-banner',
    args: [['telemetry', 'humanWebOptOut']],
    action: 'getPref'
  }, ({ response: prefs = {} }) =>
    Object.keys(prefs).forEach((key) => {
      const node = document.getElementById(key);
      if (!node) { return; }
      node.checked = key === 'humanWebOptOut' ? !prefs[key] : prefs[key];
    })
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('button').addEventListener('click', saveOptions);

if (document.location.hash) {
  const product = document.location.hash.substring(1);
  document.body.classList.add(product);
}
