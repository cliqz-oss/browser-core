import React from 'react';
import { getResourceUrl } from '../../../core/platform';

function ToolsShortcuts() {
  return (
    <div>
      <a
        href={getResourceUrl('search/mixer.html')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN MIXER TOOL
      </a>
      <br />
      <a
        href={getResourceUrl('search/mixer.html?onlyhistory=true')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN HISTORY TOOL
      </a>
      <br />
      <a
        href={getResourceUrl('anolysis-cc/index.html')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN ANOLYSIS TOOL
      </a>
      <br />
      <a
        href={getResourceUrl('adblocker/index.html')}
        rel="noopener noreferrer"
        tabIndex="-1"
        target="_blank"
      >
        OPEN ADBLOCKER TOOL
      </a>
    </div>
  );
}

export default ToolsShortcuts;
