export default function () {
  return fetch('core/logo-database.json').then(response => response.json());
}
