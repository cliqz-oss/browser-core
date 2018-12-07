/* global document, location, Handlebars */
import moment from 'moment';
import plotBar from './charts';
import templates from '../templates';


/**
 * This module is used to generate the tracker stats page
 * that emulated whotracks.me
 */
function getDailyStats(privacy, today) {
  privacy.getDailySummary(7).then((dailyStats) => {
    let lastDay = {};

    if (dailyStats.length > 0) {
      const l = dailyStats.slice(-1)[0];
      lastDay.day = moment(l.day, 'YYYY-MM-DD').format('ll');
      lastDay.pagesVisited = l.pagesVisited;
      lastDay.cookiesBlocked = l.cookiesBlocked;
      lastDay.datapointsRemoved = l.datapointsRemoved;
      lastDay.trackersSum = l.trackersSum;
    } else {
      lastDay = {
        day: today,
        pagesVisited: '',
        cookiesBlocked: '',
        datapointsRemoved: '',
        trackersSum: ''
      };
    }

    document.getElementById('daily-stats').innerHTML = templates.daily_stats({ dailyStats, lastDay });

    // TODO: Make the following a bit more elegant
    plotBar('trackers-plot', dailyStats, 'trackersSum', 'Trackers Blocked');
    plotBar('cookies-plot', dailyStats, 'cookiesBlocked', 'Cookies Blocked');
    plotBar('pages-plot', dailyStats, 'datapointsRemoved', 'Private Datapoints');
    plotBar('pdata-plot', dailyStats, 'pagesVisited', 'Pages Visited');
  });
}

function getSiteStats(privacy, today) {
  privacy.getSiteSummaries(today).then((sites) => {
    document.getElementById('sites').innerHTML = templates.sites(sites);
  });
}

function getTrackerStats(privacy, today) {
  privacy.getTrackerSummaries(today).then((trackers) => {
    document.getElementById('trackers').innerHTML = templates.trackers(trackers);
  });
}

/**
 * It lists all trackers found to be present on a site the
 * user visited.
 */
function getTrackersOnSite(siteName, privacy) {
  Promise.all([
    privacy.getSite(siteName),
    privacy.getTrackersOnSite(siteName)
  ]).then(([site, trackers]) => {
    const siteSummary = site.reduce((acc, cur) => ({
      pagesVisited: acc.pagesVisited + cur.pagesVisited,
      trackersSum: acc.trackersSum + cur.trackersSum,
      datapointsRemoved: acc.datapointsRemoved + cur.datapointsRemoved,
      cookiesBlocked: acc.cookiesBlocked + cur.cookiesBlocked,
      requestsBlocked: acc.requestsBlocked + cur.requestsBlocked
    }));

    document.getElementById('trackers').innerHTML = templates.site_profile({
      site: siteSummary, trackers
    });
    // plotting after template has been populated
    plotBar('trackers-plot', site, 'trackersSum', 'Trackers Blocked');
  });
}

/**
 * It lists all sites a user has visited in which
 * a given tracker is present inuser visited.
 */
function getSitesWhereTracker(trackerName, privacy) {
  Promise.all([
    privacy.getTracker(trackerName),
    privacy.getSitesWhereTracker(trackerName)
  ]).then(([tracker, sites]) => {
    const trackerSummary = tracker.reduce((acc, cur) => ({
      pagesPresent: acc.pagesPresent + cur.pagesPresent,
      datapointsRemoved: acc.datapointsRemoved + cur.datapointsRemoved,
      cookiesBlocked: acc.cookiesBlocked + cur.cookiesBlocked,
      requestsBlocked: acc.requestsBlocked + cur.requestsBlocked
    }));

    document.getElementById('trackers').innerHTML = templates.tracker_profile({
      tracker: trackerSummary, sites
    });
    // plotting after template has been populated
    const ctx = document.getElementById('trackers-plot');
    plotBar(ctx, tracker, 'pagesPresent', 'Pages Present');
  });
}

function getAbout() {
  document.getElementById('about').innerHTML = templates.about();
}

/**
 * Builds the site.
 */
export default function main(privacy) {
  // original string looks "?<entityType>=<entityName>"
  const [entityType, entityName] = location.search.slice(1).split('=').map(
    x => decodeURIComponent(x)
  );
  const today = moment().format('YYYY-MM-DD');

  // Register and plug in the templates
  Handlebars.partials = templates;
  let path = '';
  if (entityType) {
    path = 'resource://cliqz/privacy/index.html';
  }
  document.getElementById('main').innerHTML = templates.main({ path });

  if (!entityType) {
    getDailyStats(privacy, today);
    getSiteStats(privacy, today);
    getAbout();
    getTrackerStats(privacy, today);
  } else if (entityType === 'site') {
    getTrackersOnSite(entityName, privacy);
  } else if (entityType === 'tracker') {
    getSitesWhereTracker(entityName, privacy);
  }
}
