import { setTimeout } from '../timers';

export default function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}
