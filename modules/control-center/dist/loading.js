/**
 * Fix - Browseraction goes blank.
 * We need to initiate a repaint to show HTML in browserAction popup
 * So we load this script to trigger repaint.
 */
const loaderDiv = document.getElementById('loader');
loaderDiv.appendChild(document.createElement('div'));
