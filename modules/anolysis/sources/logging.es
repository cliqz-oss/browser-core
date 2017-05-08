
import prefs from 'core/prefs';


export default function log(msg) {
  if (prefs.get('developer')) {
    dump(`ANOLYSIS ${msg}\n`);
  }
}
