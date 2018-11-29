import config from '../../core/config';
import ResourceLoader from '../../core/resource-loader';

export default function getRemoteMessages() {
  const resourceLoader = new ResourceLoader(['freshtab', 'remoteMessages.json'], {
    remoteURL: `${config.settings.CDN_BASEURL}/notifications/messages.json`,
    cron: 1000 * 60 * 60 * 12, // update every 12 hours
    updateInterval: 1000 * 60 * 5, // check for updates 5 minutes after the browser starts
    remoteOnly: true
  });
  return resourceLoader.load();
}
