

const DOUBLECLICK_DOMAINS = new Set([
  'doubleclick.net',
  'googletagservices.com',
  'googleadservices.com',
  'googleapis.com',
  'imasdk.googleapis.com',
  'googlesyndication.com',
  'tcp.googlesyndication.com',

  // Necessary? TODO
  '2mdn.net',
  // 'google.com',
  // 'gstatic.com',
  'ad-srv.net',

  'ad.zanox.com',
  'zanox.com',
  'adcell.de',
  'ssl.upcdn.com',
  'upcdn.com',
  'hse24.de',
  // 'youtube.com',
]);


export function isDoubleclick(hostGD) {
  dump(`greenads check is doubleclick ${hostGD}\n`);
  return DOUBLECLICK_DOMAINS.has(hostGD);
}


const OUTBRAIN_DOMAINS = new Set([
  'outbrain.com',
  'widgets.outbrain.com',
]);


export function isOutbrain(hostGD) {
  return OUTBRAIN_DOMAINS.has(hostGD);
}


export function amazonAds(/* hostGD */) {
  return false;
}
