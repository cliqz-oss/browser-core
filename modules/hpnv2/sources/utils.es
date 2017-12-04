export function formatDate(hours) {
  return (new Date(hours * 3600 * 1000))
    .toISOString()
    .replace(/[^0-9]/g, '');
}

export function formatError(e, original = true) {
  const name = e && e.constructor && e.constructor.name;
  const msg = e && e.message;
  const stack = e && e.stack;
  const originalError = original ?
    (e && e.originalError && formatError(e.originalError, false)) : undefined;
  return { name, msg, stack, originalError };
}
