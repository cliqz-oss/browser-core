class EnvConfigHandler {
  constructor(elemName, configs, prefs) {
    this.elemName = elemName;
    this.configs = configs;
    this.prefs = prefs;
  }

  performRequiredChecks() {
    // check is developer
    let errMsg = '';
    const isDeveloper = this.prefs.get('developer', false) ||
                        this.prefs.get('offersDevFlag', false);
    if (!isDeveloper) {
      errMsg += 'You didnt set the preference developer or offersDevFlag, this should be set before testing!';
    }

    // check backend
    const currentTriggersBE = this.configs['BACKEND_URL'];
    if ((currentTriggersBE !== 'http://10.1.21.104' && currentTriggersBE !== 'http://10.1.21.104/')) {
      errMsg += '\n - The triggersBE preference should point to staging: (http://10.1.21.104)';
    }

    if (errMsg !== '') {
      this._showErrorMessage(errMsg);
    }
  }

  refreshUITable() {
    var testElem = document.getElementById(this.elemName);
    if (!testElem) {
      console.log('error config handler elem not exists');
      return;
    }
    // delete all the elements
    function clearInner(node) {
      while (node.hasChildNodes()) {
        clear(node.firstChild);
      }
    }

    function clear(node) {
      while (node.hasChildNodes()) {
        clear(node.firstChild);
      }
      node.parentNode.removeChild(node);
    }

    clearInner(testElem);

    // create table
    var testTable = document.createElement('table');
    testTable.id= this.elemName + "-config_values";
    testTable.border="1";
    testTable.style="width:100%";
    testTable.innerHTML = '<tr class="header expand">' +
                            '<th>Flag / config name</th>' +
                            '<th>value <span class="sign"></span></th>' +
                          '</tr>';
    testElem.appendChild(document.createElement('br'));
    testElem.appendChild(testTable);
    this._fillTable();
  }

  _fillTable() {
    var table = document.getElementById(this.elemName + '-config_values');
    if (!table) {
      return;
    }
    function addRow(k,v) {
      let row = table.insertRow(-1);
      var cell = row.insertCell(-1);
      cell.innerHTML = k;
      cell = row.insertCell(-1);
      cell.innerHTML = v;
    }
    Object.keys(this.configs).forEach((k) => {
      addRow(k, this.configs[k]);
    });
  }

  _showErrorMessage(msg) {
    // create the config envs
    var mainElem = document.getElementById(this.elemName);
    if (!mainElem) {
      console.log('error config handler elem not exists');
      return;
    }
    var msgElem = document.getElementById('env_err_msg');
    if (!msgElem) {
      msgElem = document.createElement('h1');
      msgElem.className = "failed";

      mainElem.appendChild(document.createElement('br'));
      mainElem.appendChild(msgElem);
    }
    msgElem.textContent = msg;
  }
}
