import HistoryManager from '../../core/history-manager';

export default function () {
  return new Promise((resolve, reject) => {
    try {
      const result = [];
      HistoryManager.PlacesInterestsStorage._execute(
        'SELECT p.url, b.title, b.lastModified FROM moz_bookmarks b LEFT JOIN moz_places AS p ON b.fk = p.id WHERE p.url LIKE "http%";',
        ['url', 'title', 'lastModified'],
        row => result.push(row)
      ).then(() => resolve(result));
    } catch (e) {
      reject(e);
    }
  });
}
