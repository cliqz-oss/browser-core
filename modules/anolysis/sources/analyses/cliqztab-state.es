import prefs from '../../core/prefs';

export default function () {
  return [{
    is_cliqztab_on: prefs.get('freshtab.state', false),
  }];
}
