import prefs from '../core/prefs';
import { platformName } from '../core/platform';

// Preferences
export const ADB_DISK_CACHE = 'cliqz-adb-disk-cache';
export const ADB_PREF = 'cliqz-adb';
export const ADB_PREF_OPTIMIZED = 'cliqz-adb-optimized';
export const ADB_ABTEST_PREF = 'cliqz-adb-abtest';
export const ADB_PREF_VALUES = {
  Enabled: 1,
  Disabled: 0,
};
export const ADB_DEFAULT_VALUE = ADB_PREF_VALUES.Disabled;
export const ADB_USER_LANG = 'cliqz-adb-lang';

export function adbABTestEnabled() {
  return prefs.get(ADB_ABTEST_PREF, ADB_PREF_VALUES.Enabled);
}

export const DEFAULT_OPTIONS = {
  onDiskCache: true,
  useCountryList: true,
  loadNetworkFilters: true,

  // We don't support cosmetics filters on mobile, so no need
  // to parse them, store them, etc.
  // This will reduce both: loading time, memory footprint, and size of
  // the serialized index on disk.
  loadCosmeticFilters: platformName !== 'mobile',
};
