export default function (indexFilePath, {
  grep,
  forceExtensionReload,
}) {
  return `chrome://cliqz/content/${indexFilePath}?forceExtensionReload=${forceExtensionReload}&grep=${grep}`;
}
