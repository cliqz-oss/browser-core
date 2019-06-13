import inject from '../core/kord/inject';


const CORRECT_VERSION_PART = /^\d+$/;
const CORRECT_OPTIONAL_PART = /^\w+$/;

/*
 * Parse version in format A.B.C.1bN.
 */
export default function getCoreVersion() {
  let version = inject.app.version;

  // Caused by a bug in versions, at some point
  if (version === '3.9.0-beta.3') {
    version = '3.9.0';
  }

  const parts = version.split('.');

  while (parts.length < 3) {
    parts.push('0');
  }

  let correctFormat = true;
  for (let i = 0; i < 3; i += 1) {
    if (!CORRECT_VERSION_PART.test(parts[i])) {
      correctFormat = false;
    }
  }

  // Check optional part x.y.z.optional
  if (parts.length > 3) {
    if (parts.length > 4) {
      correctFormat = false;
    } else if (!CORRECT_OPTIONAL_PART.test(parts[3])) {
      correctFormat = false;
    }
  }

  if (correctFormat) {
    return parts.join('.');
  }

  return null;
}
