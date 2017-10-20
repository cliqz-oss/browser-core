import { forEachWindow } from '../browser';
import { queryActiveTabs } from '../../core/tabs';

export function getAllOpenPages() {
  const promise = new Promise((resolve, reject) => {
    const urls = [];
    try {
      forEachWindow((win) => {
        const openTabs = queryActiveTabs(win);
        openTabs.forEach((data) => {
          const url = data.url;
          if (url && urls.indexOf(url) === -1 && url.startsWith('about:') === false) {
            urls.push(decodeURIComponent(url));
          }
        });
      });
    } catch (ee) {
      reject(ee);
    }
    resolve(urls);
  });
  return promise;
}

export default getAllOpenPages;
