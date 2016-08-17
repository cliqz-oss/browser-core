import CLIQZEnvironment from "platform/environment";

export function checkBox(doc, key, label, activeState, onChange, state){
  function optInOut(){
    const active = state !== undefined ?
                   state :
                   CliqzUtils.getPref(key, false) === (activeState == 'undefined' ? true : activeState);

    return active ?
      'url(' + CliqzUtils.SKIN_PATH + 'opt-in.svg)':
      'url(' + CliqzUtils.SKIN_PATH + 'opt-out.svg)';
  }

  var btn = doc.createElement('menuitem');
  btn.setAttribute('label', label || key);
  btn.setAttribute('class', 'menuitem-iconic');
  btn.style.listStyleImage = optInOut();

  btn.addEventListener('command', function(event) {
    if(onChange){
      onChange();
    } else {
      CliqzUtils.setPref(key, !CliqzUtils.getPref(key, false));
    }
    CliqzUtils.telemetry({
      type: 'activity',
      action: 'cliqz_menu_button',
      button_name: key
    });

    btn.style.listStyleImage = optInOut();
  }, false);

  return btn;
}

export function simpleBtn(doc, txt, func, action){
  var item = doc.createElement('menuitem');
  item.setAttribute('label', txt);
  item.setAttribute('action', action);
  item.classList.add('cliqz-item');

  if(func)
      item.addEventListener(
          'command',
          function() {
              CliqzUtils.telemetry({
                  type: 'activity',
                  action: 'cliqz_menu_button',
                  button_name: action
              });
              func();
          },
          false);
  else
      item.setAttribute('disabled', 'true');

  return item
}
