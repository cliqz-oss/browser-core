import { chrome } from './globals';


export default {
  get(key) {
    return new Promise((resolve, reject) => {
      console.log(`>>>>>>>>>>>> storage get ${key}`);
      chrome.storage.local.get(key, (res) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (res[key]) {
          console.log(`>>>>>>>>>>>> storage get ${key} =>`, res);
          resolve(res[key]);
        } else {
          console.log(`>>>>>>>>>>>> storage get no value ${key}`);
          reject(`storage has no value for ${key}`);
        }
      });
    });
  },
  set(key, value) {
    return new Promise((resolve, reject) => {
      const obj = {};
      obj[key] = value;
      console.log(`>>>>>>>>>>>> storage set ${key}`, obj);
      chrome.storage.local.set(
        { [key]: value },
        () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
    });
  },
  remove(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
};
