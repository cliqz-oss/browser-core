export default function (indexFilePath, {
  grep,
  forceExtensionReload,
  autostart,
}) {
  return `chrome://cliqz/content/${indexFilePath}?forceExtensionReload=${forceExtensionReload}&grep=${grep}&autostart=${autostart}`;
}
