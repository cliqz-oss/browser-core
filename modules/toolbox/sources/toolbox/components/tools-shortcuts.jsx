import React from 'react';
import { getResourceUrl } from '../../../core/platform';

function ToolsShortcuts() {
  return (
    <a
      href={getResourceUrl('search/mixer.html')}
      rel="noopener noreferrer"
      tabIndex="-1"
      target="_blank"
    >
      OPEN MIXER TOOL
    </a>
  );
}

export default ToolsShortcuts;
