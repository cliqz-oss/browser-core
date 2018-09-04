import { chrome } from '../globals';

export default function (indexFilePath, { grep }) {
  return chrome.runtime.getURL(`/modules/${indexFilePath}?grep=${grep}`);
}
