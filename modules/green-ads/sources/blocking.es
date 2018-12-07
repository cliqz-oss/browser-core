
const CDN_PROVIDERS = new Set([
  'akamai.net',
  'akamaized.net',
  'akamaiedge.net',
  'akamaihd.net',
  'edgesuite.net',
  'edgekey.net',
  'srip.net',
  'akamaitechnologies.com',
  'akamaitechnologies.fr',
  'tl88.net',
  'llnwd.net',
  'edgecastcdn.net',
  'systemcdn.net',
  'transactcdn.net',
  'v1cdn.net',
  'v2cdn.net',
  'v3cdn.net',
  'v4cdn.net',
  'v5cdn.net',
  'hwcdn.net',
  'simplecdn.net',
  'instacontent.net',
  'footprint.net',
  'fpbns.net',
  'ay1.b.yahoo.com',
  'yimg.',
  'yahooapis.com',
  'google.',
  'googlesyndication.',
  'youtube.',
  'googleusercontent.com',
  'googlehosted.com',
  'gstatic.com',
  'doubleclick.net',
  'insnw.net',
  'inscname.net',
  'internapcdn.net',
  'cloudfront.net',
  'netdna-cdn.com',
  'netdna-ssl.com',
  'netdna.com',
  'kxcdn.com',
  'cotcdn.net',
  'cachefly.net',
  'bo.lt',
  'cloudflare.com',
  'afxcdn.net',
  'lxdns.com',
  'wscdns.com',
  'wscloudcdn.com',
  'ourwebpic.com',
  'att-dsa.net',
  'vo.msecnd.net',
  'azureedge.net',
  'voxcdn.net',
  'bluehatnetwork.com',
  'swiftcdn1.com',
  'cdngc.net',
  'gccdn.net',
  'panthercdn.com',
  'fastly.net',
  'fastlylb.net',
  'nocookie.net',
  'gslb.taobao.com',
  'gslb.tbcache.com',
  'mirror-image.net',
  'yottaa.net',
  'cubecdn.net',
  'cdn77.net',
  'cdn77.org',
  'incapdns.net',
  'bitgravity.com',
  'r.worldcdn.net',
  'r.worldssl.net',
  'tbcdn.cn',
  'taobaocdn.com',
  'ngenix.net',
  'pagerain.net',
  'ccgslb.com',
  'cdn.sfr.net',
  'azioncdn.net',
  'azioncdn.com',
  'azion.net',
  'cdncloud.net.au',
  'rncdn1.com',
  'cdnsun.net',
  'mncdn.com',
  'mncdn.net',
  'mncdn.org',
  'cdn.jsdelivr.net',
  'nyiftw.net',
  'nyiftw.com',
  'resrc.it',
  'zenedge.net',
  'lswcdn.net',
  'lswcdn.eu',
  'revcn.net',
  'revdn.net',
  'caspowa.com',
  'twimg.com',
  'facebook.com',
  'facebook.net',
  'fbcdn.net',
  'cdninstagram.com',
  'rlcdn.com',
  'wp.com',
  'aads1.net',
  'aads-cn.net',
  'aads-cng.net',
  'squixa.net',
  'bisongrid.net',
  'cdn.gocache.net',
  'hiberniacdn.com',
  'cdntel.net',
  'raxcdn.com',
  'unicorncdn.net',
  'optimalcdn.com',
  'kinxcdn.com',
  'kinxcdn.net',
  'stackpathdns.com',
  'hosting4cdn.com',
  'netlify.com',
  'b-cdn.net',
  'pix-cdn.org',
  'roast.io',

  // Found on chip.de
  'cdn.optimizely.com',
  'cdn.bestcheck.de',
  'cdn.conative.de',
  'cdn.contentspread.net',
]);


export function isCDN(host, hostGD) {
  return CDN_PROVIDERS.has(hostGD) || CDN_PROVIDERS.has(host);
}


const CHIP_DEPS = new Set([
  // Load the TFM object into the page.
  // Contains informations about ads to display on page.
  'bf-ad.net',
  'bf-tools.net',
  'google.com',
  'youtube.com',

  // Not strictly necessary, but not blocked by adblocker.
  // TODO - check if it works to blacklist advertisers instead of whitelisting.
  // 'adobedtm.com',
  // 'conative.de',
  // 'cxo.name',
  // 'fastly.net',
  // 'homad-global-configs-eu-fra.schneevonmorgen.com.s3.amazonaws.com',
  // 'ioam.de',
  // 'keen.io',
  // 'nuggad.net',
  // 'opinary.com',
  // 'pressekompass.net',
  // 'visualrevenue.com',
  // 'youtube.com',
  // 'yieldlab.net',
  // 'chip.de.intellitxt.com',
  // 'moatads.com',
  // 'adition.com',
  // 'adnxs.com',
  // '3lift.com',
  // 'criteo.com',
  // 'intellitxt.com',
  // 'flashtalking.com',
  // 'optimizely.com',
  // 'digidip.net',
]);


export function isChipAdDependency(host, hostGD) {
  dump(`check should cancel ${host} ${hostGD}\n`);
  return isCDN(host, hostGD) || CHIP_DEPS.has(host) || CHIP_DEPS.has(hostGD);
}


export function isException(url) {
  if (url.indexOf('omniture.chip.de/b') !== -1) {
    return {
      redirectUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    };
  }

  if (url.indexOf('amazon-adsystem.com/aax2/amzn_ads.js') !== -1) {
    // Unbreak video playing
    return {
      redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCkgewppZiAoIGFtem5hZHMgKSB7CnJldHVybjsKfQp2YXIgdyA9IHdpbmRvdzsKdmFyIG5vb3BmbiA9IGZ1bmN0aW9uKCkgewo7Cn0uYmluZCgpOwp2YXIgYW16bmFkcyA9IHsKYXBwZW5kU2NyaXB0VGFnOiBub29wZm4sCmFwcGVuZFRhcmdldGluZ1RvQWRTZXJ2ZXJVcmw6IG5vb3BmbiwKYXBwZW5kVGFyZ2V0aW5nVG9RdWVyeVN0cmluZzogbm9vcGZuLApjbGVhclRhcmdldGluZ0Zyb21HUFRBc3luYzogbm9vcGZuLApkb0FsbFRhc2tzOiBub29wZm4sCmRvR2V0QWRzQXN5bmM6IG5vb3BmbiwKZG9UYXNrOiBub29wZm4sCmRldGVjdElmcmFtZUFuZEdldFVSTDogbm9vcGZuLApnZXRBZHM6IG5vb3BmbiwKZ2V0QWRzQXN5bmM6IG5vb3BmbiwKZ2V0QWRGb3JTbG90OiBub29wZm4sCmdldEFkc0NhbGxiYWNrOiBub29wZm4sCmdldERpc3BsYXlBZHM6IG5vb3BmbiwKZ2V0RGlzcGxheUFkc0FzeW5jOiBub29wZm4sCmdldERpc3BsYXlBZHNDYWxsYmFjazogbm9vcGZuLApnZXRLZXlzOiBub29wZm4sCmdldFJlZmVycmVyVVJMOiBub29wZm4sCmdldFNjcmlwdFNvdXJjZTogbm9vcGZuLApnZXRUYXJnZXRpbmc6IG5vb3BmbiwKZ2V0VG9rZW5zOiBub29wZm4sCmdldFZhbGlkTWlsbGlzZWNvbmRzOiBub29wZm4sCmdldFZpZGVvQWRzOiBub29wZm4sCmdldFZpZGVvQWRzQXN5bmM6IG5vb3BmbiwKZ2V0VmlkZW9BZHNDYWxsYmFjazogbm9vcGZuLApoYW5kbGVDYWxsQmFjazogbm9vcGZuLApoYXNBZHM6IG5vb3BmbiwKcmVuZGVyQWQ6IG5vb3BmbiwKc2F2ZUFkczogbm9vcGZuLApzZXRUYXJnZXRpbmc6IG5vb3BmbiwKc2V0VGFyZ2V0aW5nRm9yR1BUQXN5bmM6IG5vb3BmbiwKc2V0VGFyZ2V0aW5nRm9yR1BUU3luYzogbm9vcGZuLAp0cnlHZXRBZHNBc3luYzogbm9vcGZuLAp1cGRhdGVBZHM6IG5vb3Bmbgp9Owp3LmFtem5hZHMgPSBhbXpuYWRzOwp3LmFtem5fYWRzID0gdy5hbXpuX2FkcyB8fCBub29wZm47CncuYWF4X3dyaXRlID0gdy5hYXhfd3JpdGUgfHwgbm9vcGZuOwp3LmFheF9yZW5kZXJfYWQgPSB3LmFheF9yZW5kZXJfYWQgfHwgbm9vcGZuOwp9KSgpOwo='
    };
  }

  if (url.indexOf('hd-main.js') !== -1) {
    // Unbreak video playing
    return {
      redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCl7CnZhciBsID0ge307CnZhciBub29wZm4gPSBmdW5jdGlvbigpIHsKOwp9Owp2YXIgcHJvcHMgPSBbCiIkaiIsIkFkIiwiQmQiLCJDZCIsIkRkIiwiRWQiLCJGZCIsIkdkIiwiSGQiLCJJZCIsIkpkIiwiTmoiLCJPYyIsIlBjIiwiUGUiLAoiUWMiLCJRZSIsIlJjIiwiUmUiLCJSaSIsIlNjIiwiVGMiLCJVYyIsIlZjIiwiV2MiLCJXZyIsIlhjIiwiWGciLCJZYyIsIllkIiwKImFkIiwiYWUiLCJiZCIsImJmIiwiY2QiLCJkZCIsImVkIiwiZWYiLCJlayIsImZkIiwiZmciLCJmaCIsImZrIiwiZ2QiLCJoZCIsCiJpZyIsImlqIiwiamQiLCJrZCIsImtlIiwibGQiLCJtZCIsIm1pIiwibmQiLCJvZCIsIm9oIiwicGQiLCJwZiIsInFkIiwicmQiLAoic2QiLCJ0ZCIsInVkIiwidmQiLCJ3ZCIsIndnIiwieGQiLCJ4aCIsInlkIiwiemQiLAoiJGQiLCIkZSIsIiRrIiwiQWUiLCJBZiIsIkFqIiwiQmUiLCJDZSIsIkRlIiwiRWUiLCJFayIsIkVvIiwiRXAiLCJGZSIsIkZvIiwKIkdlIiwiR2giLCJIayIsIkllIiwiSXAiLCJKZSIsIktlIiwiS2siLCJLcSIsIkxlIiwiTGgiLCJMayIsIk1lIiwiTW0iLCJOZSIsCiJPZSIsIlBlIiwiUWUiLCJSZSIsIlJwIiwiU2UiLCJUZSIsIlVlIiwiVmUiLCJWcCIsIldlIiwiWGQiLCJYZSIsIllkIiwiWWUiLAoiWmQiLCJaZSIsIlpmIiwiWmsiLCJhZSIsImFmIiwiYWwiLCJiZSIsImJmIiwiYmciLCJjZSIsImNwIiwiZGYiLCJkaSIsImVlIiwKImVmIiwiZmUiLCJmZiIsImdmIiwiZ20iLCJoZSIsImhmIiwiaWUiLCJqZSIsImpmIiwia2UiLCJrZiIsImtsIiwibGUiLCJsZiIsCiJsayIsIm1mIiwibWciLCJtbiIsIm5mIiwib2UiLCJvZiIsInBlIiwicGYiLCJwZyIsInFlIiwicWYiLCJyZSIsInJmIiwic2UiLAoic2YiLCJ0ZSIsInRmIiwidGkiLCJ1ZSIsInVmIiwidmUiLCJ2ZiIsIndlIiwid2YiLCJ3ZyIsIndpIiwieGUiLCJ5ZSIsInlmIiwKInlrIiwieWwiLCJ6ZSIsInpmIiwiemsiCl07CmZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsKbFtwcm9wc1tpXV0gPSBub29wZm47Cn0Kd2luZG93LkwgPSB3aW5kb3cuSiA9IGw7Cn0pKCk7Cg=='
    };
  }

  if (url.indexOf('1x1-transparent.gif') !== -1
      || url.indexOf('1x1_default.gif') !== -1
      || url.indexOf('1x1_Pixel.png') !== -1) {
    return {
      redirectUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
    };
  }

  if (url.indexOf('//www.kaltura.com') !== -1) {
    // Unbreak thumbnails
    return {};
  }

  return null;
}
