/**
 * This is experimental and it should not be pushed to production in the present state.
 * We need to label the pings we send,
 * in order to create patterns for detecing bogus instances of browsers.
 */

/* global Components */

const { Subprocess } = Components.utils.import('resource://gre/modules/Subprocess.jsm');
const { Troubleshoot } = Components.utils.import('resource://gre/modules/Troubleshoot.jsm');

const {
  interfaces: Ci,
  utils: Cu,
} = Components;

Cu.importGlobalProperties(['XMLHttpRequest']);

// const { console } = Cu.import('resource://gre/modules/Console.jsm');

const env = Components.classes['@mozilla.org/process/environment;1'].getService(Components.interfaces.nsIEnvironment);
// Get profile directory for the user.
const file = Components.classes['@mozilla.org/file/directory_service;1']
  .getService(Components.interfaces.nsIProperties)
  .get('ProfD', Components.interfaces.nsIFile);

const debug = false;
const originalSerial = '0E:25:E2:F1:4B:0A:0A:7F:98:F6:E8:CD:76:E0:D8:E2';

const logger = {
  debug(/* ...args */) {
    // console.log(...args);
  }
};

function log(message) {
  if (debug) {
    logger.debug(message, 'labels');
  }
}

function getSerialNumber(text) {
  let serialNumber = '';
  try {
    serialNumber = text.split('Serial Number (system): ')[1].split('\n')[0];
    return serialNumber;
  } catch (err) {
    log(err);
    return serialNumber;
  }
}

function getStatus(text) {
  let status = '';
  try {
    status = text.split('Protection status: ')[1].split('.')[0];
    return status;
  } catch (err) {
    log(err);
    return status;
  }
}

/**
 * Detect whether browser instance is running in headless mode or not.
 * Need to check how easy is it to spoof.
 */
export function isHeadless() {
  return new Promise((resolve) => {
    if (env.get('MOZ_HEADLESS')) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

/**
 * This MAC specific right now:
 * Extract the serial number for mac
 * Run it with one way hash -> sha1.
 * Known exploit: Payload can be spoofed.
 */
export function getMachineID() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: '/usr/sbin/system_profiler',
      arguments: ['SPHardwareDataType'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString().then((details) => {
        const sn = getSerialNumber(details);
        resolve(sn);
      });
    }).catch((err) => {
      log(err);
      return resolve('');
    });
  });
}


/**
 * This MAC specific right now:
 * Check if filesystem integrity is disabled.
 */
export function getSystemIntegrityStatus() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: '/usr/bin/csrutil',
      arguments: ['status'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString().then((details) => {
        const status = getStatus(details);
        return resolve(status);
      });
    }).catch((err) => {
      log(err);
      return resolve('');
    });
  });
}

/**
 * Default profile
 */
export function isProfileDefault() {
  return new Promise((resolve) => {
    const profileName = file.leafName;
    if (profileName.indexOf('default') > -1) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

/**
 * Windows Manufacturer
 */
export function getWindowsManufacturer() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: 'c:\\Windows\\System32\\wbem\\WMIC.exe',
      arguments: ['COMPUTERSYSTEM', 'GET', 'MANUFACTURER'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString(proc.stdout.bufferSize / 1024).then((details) => {
        resolve(details.replace('\n', '').replace('Manufacturer', ''));
      }).catch((err) => {
        log(err);
        resolve('');
      });
    }).catch((err) => {
      log(err);
      return resolve('');
    });
  });
}

/**
 * Windows Model
 */
export function getWindowsModel() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: 'c:\\Windows\\System32\\wbem\\WMIC.exe',
      arguments: ['COMPUTERSYSTEM', 'GET', 'MODEL'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString(proc.stdout.bufferSize / 1024).then((details) => {
        resolve(details.replace('\n', '').replace('Model', ''));
      }).catch((err) => {
        log(err);
        resolve('');
      });
    }).catch((err) => {
      log(err);
      return resolve('');
    });
  });
}

/**
 * Windows serial number
 */
export function getWindowsSerialNumber() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: 'c:\\Windows\\System32\\wbem\\WMIC.exe',
      arguments: ['BIOS', 'GET', 'SERIALNUMBER'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString(proc.stdout.bufferSize / 1024).then((details) => {
        resolve(details.replace('\n', '').replace('SerialNumber', ''));
      }).catch((err) => {
        log(err);
        resolve('');
      });
    }).catch((err) => {
      log(err);
      return resolve('');
    });
  });
}

/**
 * Is Docker
 */
export function isDocker() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: '/bin/cat',
      arguments: ['/proc/1/cgroup'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString(proc.stdout.bufferSize / 1024).then((details) => {
        if (details.toLowerCase().indexOf('docker') > -1) {
          resolve(true);
        } else {
          resolve(false);
        }
      }).catch((err) => {
        log(err);
        resolve(false);
      });
    }).catch((err) => {
      log(err);
      return resolve(false);
    });
  });
}

/**
 * Linux UUID
 */
export function uuidLinux() {
  return new Promise((resolve) => {
    const subprocessOpts = {
      command: '/bin/ls',
      arguments: ['-1', '/dev/disk/by-uuid/'],
      stderr: 'pipe'
    };
    Subprocess.call(subprocessOpts).then((proc) => {
      proc.stdout.readString(proc.stdout.bufferSize / 1024).then((details) => {
        resolve(details.replace('\n', ''));
      }).catch((err) => {
        log(err);
        resolve('');
      });
    }).catch((err) => {
      log(err);
      return resolve('');
    });
  });
}

/**
 * Started using command line.
 */

export function fromCommandLine() {
  return new Promise((resolve) => {
    if (env.get('PWD')) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

/**
 * We need to detect if there an active SSL interception happening.
 * This may change TLS signatures on the backend.
 */
export function mitmEnabled() {
  /* eslint-disable no-bitwise */
  return new Promise((resolve) => {
    const req = new XMLHttpRequest();
    req.open('HEAD', 'https://api.cliqz.com');
    req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE;
    req.timeout = 30000;
    req.addEventListener('error', (evt) => {
      log(evt);
      resolve('false');
    });
    req.addEventListener('timeout', (evt) => {
      log(evt);
      resolve('false');
    });
    req.addEventListener('load', (evt) => {
      try {
        const securityInfo = evt.target.channel.securityInfo
          .QueryInterface(Ci.nsITransportSecurityInfo);
        log(securityInfo);
        let serialNumber;
        if (!securityInfo.SSLStatus) {
          serialNumber = securityInfo.serverCert.serialNumber;
        } else {
          serialNumber = securityInfo.SSLStatus.serverCert.serialNumber;
        }
        if (serialNumber === originalSerial) {
          resolve(false);
        } else {
          resolve(true);
        }
      } catch (ee) {
        log(ee);
        resolve(false);
      }
    });
    req.send();
  });
}

/**
 * This will help us identify virtual box installations, changed prefs etc.
 */
export function getTroubleShootInfo() {
  return new Promise((resolve) => {
    const troubleShootInfo = {};
    Troubleshoot.snapshot((details) => {
      // Let's get graphics card info.
      Object.keys(details.graphics).forEach((e) => {
        if (typeof (details.graphics[e]) === 'string') {
          troubleShootInfo[e] = details.graphics[e];
        }
      });

      // Modified prefs.
      Object.keys(details.modifiedPreferences).forEach((e) => {
        if (e.toLowerCase().indexOf('resistfingerprinting') > -1) {
          troubleShootInfo[e] = details.modifiedPreferences[e];
        }

        if (e.toLowerCase().indexOf('tls') > -1) {
          troubleShootInfo[e] = details.modifiedPreferences[e];
        }

        if (e.toLowerCase().indexOf('privacy.firstparty') > -1) {
          troubleShootInfo[e] = details.modifiedPreferences[e];
        }

        // Check for prefs that users' might use to prevent being tracked using TLS 0-RTT.
        if (e.toLowerCase().indexOf('security.ssl.disable_session_identifiers') > -1) {
          troubleShootInfo[e] = details.modifiedPreferences[e];
        }

        if (e.toLowerCase().indexOf('security.ssl.enable_false_start') > -1) {
          troubleShootInfo[e] = details.modifiedPreferences[e];
        }

        if (e.toLowerCase().indexOf('security.tls.enable_0rtt_data') > -1) {
          troubleShootInfo[e] = details.modifiedPreferences[e];
        }
      });
      resolve(JSON.stringify(troubleShootInfo));
    });
  });
}
