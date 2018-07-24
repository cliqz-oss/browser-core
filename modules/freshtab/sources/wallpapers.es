import prefs from '../core/prefs';
import { isCliqzBrowser, isCliqzAtLeastInVersion } from '../core/platform';

const DEVELOPER_FLAG_PREF = 'developer';

function isBlueBackgroundSupported() {
  let isSupported = true;
  if (isCliqzBrowser && !isCliqzAtLeastInVersion('1.16.0')) {
    isSupported = false;
  }
  return isSupported || prefs.get(DEVELOPER_FLAG_PREF, false);
}

export default function getWallpapers() {
  let BACKGROUNDS = [];

  if (isBlueBackgroundSupported()) {
    BACKGROUNDS.push(
      {
        name: 'bg-blue',
        alias: 'alps',
        isDefault: false,
      }
    );
  }

  BACKGROUNDS = BACKGROUNDS.concat([
    {
      name: 'bg-light',
      alias: 'light',
      isDefault: false,
    },
    {
      name: 'bg-dark',
      alias: 'dark',
      isDefault: false,
    },
    {
      name: 'bg-winter',
      alias: 'winter',
      isDefault: false,
    },
    {
      name: 'bg-matterhorn',
      alias: 'matterhorn',
      isDefault: true,
    },
    {
      name: 'bg-spring',
      alias: 'spring',
      isDefault: false,
    },
    {
      name: 'bg-worldcup',
      alias: 'worldcup',
      isDefault: false,
    },
    {
      name: 'bg-summer',
      alias: 'summer',
      isDefault: false,
    },
  ]);

  return BACKGROUNDS;
}

