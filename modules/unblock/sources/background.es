import CliqzUnblock from 'unblock/main';
import YoutubeUnblocker from 'unblock/youtube';

export default {

  init(settings) {
    this.loadPlugins();
    CliqzUnblock.init(settings.unblockUI);
    this.onPrefChange = this.onPrefChange.bind(this);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  },

  unload() {
    CliqzEvents.un_sub("prefchange:"+ CliqzUnblock.PREF_MODE, this.onPrefChange);
    CliqzUnblock.unload();
  },

  loadPlugins() {
    if (CliqzUtils.getPref('unblock.plugin.youtube', true)) {
      CliqzUnblock.unblockers.push(new YoutubeUnblocker());
    }
  },

  onPrefChange(pref) {
    if(pref == CliqzUnblock.PREF_MODE) {
      CliqzUnblock.onModeChanged();
    }
  }
};
