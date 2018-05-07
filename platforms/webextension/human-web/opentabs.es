export function getAllOpenPages() {
  return new Promise((resolve, reject) => {
    try {
      const res = [];
      chrome.windows.getAll({ populate: true }, (windows) => {
        windows.forEach((window) => {
          window.tabs.forEach((tab) => {
            res.push(tab.url);
          });
        });
        resolve(res);
      });
    } catch (ee) {
      reject(ee);
    }
  });
}

export default getAllOpenPages;
