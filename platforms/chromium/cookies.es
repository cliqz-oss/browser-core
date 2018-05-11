import { chrome } from './globals';

export default {
  get: chrome.cookies.get,
  getAll: chrome.cookies.getAll,
  set: chrome.cookies.set,
  remove: chrome.cookies.remove,
  getAllCookieStores: chrome.cookies.getAllCookieStores,
};
