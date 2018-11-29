import { getCurrentWindow } from '../windows';

export default function getDocument() {
  return getCurrentWindow().document.implementation;
}
