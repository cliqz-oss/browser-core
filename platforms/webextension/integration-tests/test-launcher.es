import { chrome } from '../globals';

export default function (indexFilePath, { grep, autostart }) {
  return chrome.runtime.getURL(`/modules/${indexFilePath}?grep=${grep}&autostart=${autostart}`);
}
