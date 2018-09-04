import React from 'react';

export default () => (
  <div
    className="searchbox-results-empty"
  >
    <p>
      Für diese Suchanfrage haben wir leider keine passenden Ergebnisse gefunden.
    </p>

    <ul
      className="searchbox-results-empty-list"
    >
      <li>
        Achte darauf, dass alle Wörter richtig geschrieben sind
      </li>
      <li>
        Probiere es mit anderen Suchbegriffen
      </li>
    </ul>
  </div>
);
