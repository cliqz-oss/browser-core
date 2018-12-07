export function checkInstalledPrivacyAddons() {
  return Promise.reject(new Error('not supported on this platform'));
}

export function auditInstalledAddons() {
  return Promise.reject(new Error('not supported on this platform'));
}
