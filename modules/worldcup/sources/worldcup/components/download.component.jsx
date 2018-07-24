import React from 'react';
import t from '../services/i18n';

function Download() {
  return (
    <div className="download">
      <p>{t.download}</p>
      <ul>
        <li><a href={t.ios}><img src="./images/apple-store-download.png" alt="" /></a></li>
        <li><a href={t.android}><img src="./images/play-store-download.png" alt="" /></a></li>
      </ul>
    </div>
  );
}

export default Download;

