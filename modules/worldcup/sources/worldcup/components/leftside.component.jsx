import React from 'react';

function LeftSide() {
  return (
    <aside className="left">
      <ul>
        <li id="cliqz-home"><a href="resource://cliqz/freshtab/home.html"><i className="icon-home" /></a></li>
        <li id="cliqz-history"><a href="resource://cliqz/cliqz-history/index.html#/"><i className="icon-clock" /></a></li>
        <li id="cliqz-worldcup"><a href="https://sport.cliqz.com"><i className="icon-soccer" /></a></li>
      </ul>
    </aside>
  );
}

export default LeftSide;
