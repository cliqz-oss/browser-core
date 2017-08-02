class ErrorReporter {
  constructor(uiInfo) {
    this.uiInfo = uiInfo;
    this.highestErrLevel = 0; // 2 max
    this.lvlMap = {
      0: 'info',
      1: 'warning',
      2: 'error'
    };
  }

  getState() {
    const txtArea = document.getElementById(this.uiInfo.txt_name);
    return {
      highestErrLevel: this.highestErrLevel,
      log: txtArea.textContent
    };
  }

  setState(state) {
    const txtArea = document.getElementById(this.uiInfo.txt_name);
    this.setNewErrorLevel(state.highestErrLevel);
    txtArea.textContent = state.log;
  }

  reportError(module, msg) {
    this.addEntry(module, msg, 2);
  }

  reportWarning(module, msg) {
    this.addEntry(module, msg, 1);
  }

  reportInfo(module, msg) {
    this.addEntry(module, msg, 0);
  }

  addEntry(module, msg, errLevel) {
    const txtArea = document.getElementById(this.uiInfo.txt_name);
    if (!txtArea) {
      return;
    }
    const entry = `[${this.lvlMap[errLevel]}] [${module}]: ${msg}\n`;

    txtArea.textContent = txtArea.textContent + entry;
    if (this.highestErrLevel < errLevel) {
      this.setNewErrorLevel(errLevel);
    }
  }

  setNewErrorLevel(errLevel) {
    const txtArea = document.getElementById(this.uiInfo.txt_name);
    const colorMap = {
        1: 'orange',
        2: 'red'
      };
      txtArea.style = `width=100%; background-color: ${colorMap[errLevel]};`;

      // change the text
      const status = document.getElementById(this.uiInfo.status_name);
      if (status) {
        const stMsg = {
          1: 'Current error status: some warnings!',
          2: 'Current error status: ERRORS! Report it please!',
        };
        status.innerHTML = stMsg[errLevel];
        status.style = `background-color: ${colorMap[errLevel]};`;
      }

      this.highestErrLevel = Math.max(this.highestErrLevel, errLevel);
  }
}
